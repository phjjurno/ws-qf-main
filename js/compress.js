/* ==========================================================
   compress.js — PDF 압축
   각 페이지를 pdf.js로 렌더링 → JPEG로 변환 → 새 PDF로 재조립.
   스캔·사진 위주 PDF에 효과가 크다. (텍스트는 이미지가 됨)
   ========================================================== */
(function () {
  'use strict';

  const fileSelect = document.getElementById('compress-file');
  const runBtn = document.getElementById('compress-run');
  const statusEl = document.getElementById('compress-status');
  const progressEl = document.getElementById('compress-progress');
  const barEl = document.getElementById('compress-bar');

  // 압축 강도별 렌더 배율·JPEG 품질
  const PRESETS = {
    high: { scale: 2.0, quality: 0.85 },  // 약하게 (화질 우선)
    mid:  { scale: 1.5, quality: 0.7 },   // 보통
    low:  { scale: 1.1, quality: 0.5 },   // 강하게 (용량 우선)
  };

  FileStore.onChange(() => window.fillFileSelect && fillFileSelect(fileSelect));

  runBtn.addEventListener('click', async () => {
    const f = FileStore.get(Number(fileSelect.value));
    if (!f) {
      setStatus('먼저 파일 보관함에 PDF를 업로드하세요.', true);
      return;
    }
    const preset = PRESETS[document.querySelector('input[name="compress-q"]:checked').value];

    runBtn.disabled = true;
    progressEl.hidden = false;
    barEl.style.width = '0%';
    setStatus('압축 준비 중...');

    let srcDoc = null;
    try {
      srcDoc = await pdfjsLib.getDocument({ data: f.buffer.slice(0) }).promise;
      const { PDFDocument } = PDFLib;
      const out = await PDFDocument.create();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      for (let i = 1; i <= srcDoc.numPages; i++) {
        const page = await srcDoc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: preset.scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // intent:'print' — 백그라운드 탭에서도 렌더링 완료 보장
        await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', preset.quality);
        const jpg = await out.embedJpg(dataUrl);
        // 원본 페이지 크기(pt) 유지 — 배율은 화질에만 영향
        const p = out.addPage([base.width, base.height]);
        p.drawImage(jpg, { x: 0, y: 0, width: base.width, height: base.height });

        barEl.style.width = Math.round((i / srcDoc.numPages) * 100) + '%';
        setStatus(`압축 중... ${i} / ${srcDoc.numPages} 페이지`);
        // UI가 멈춘 것처럼 보이지 않도록 이벤트 루프에 양보
        await new Promise(r => setTimeout(r, 0));
      }

      const bytes = await out.save();
      canvas.width = 0; canvas.height = 0;

      const before = f.size;
      const after = bytes.length;
      if (after >= before) {
        setStatus(`압축 결과(${PdfUtils.formatSize(after)})가 원본(${PdfUtils.formatSize(before)})보다 크거나 같아 다운로드하지 않았습니다. 이 파일은 이미 충분히 작습니다.`, true);
        return;
      }
      PdfUtils.downloadPdf(bytes, f.name.replace(/\.pdf$/i, '') + '_압축');
      const saved = Math.round((1 - after / before) * 100);
      setStatus(`완료 — ${PdfUtils.formatSize(before)} → ${PdfUtils.formatSize(after)} (${saved}% 감소)`);
      App.toast('PDF 압축이 완료되었습니다.');
    } catch (err) {
      console.error(err);
      setStatus('압축에 실패했습니다. 파일이 손상되었거나 메모리가 부족할 수 있습니다.', true);
    } finally {
      if (srcDoc) srcDoc.destroy();
      runBtn.disabled = false;
      progressEl.hidden = true;
    }
  });

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('status--error', !!isError);
  }

  fillFileSelect(fileSelect);
})();
