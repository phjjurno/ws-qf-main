/* ==========================================================
   page-numbers.js — 페이지 번호 삽입
   위치(6곳)·형식·시작 번호를 골라 모든 페이지에 번호를 찍음
   (번호는 숫자·기호만 사용하므로 표준 폰트로 충분)
   ========================================================== */
(function () {
  'use strict';

  const fileSelect = document.getElementById('numbers-file');
  const posSelect = document.getElementById('numbers-pos');
  const formatSelect = document.getElementById('numbers-format');
  const startInput = document.getElementById('numbers-start');
  const runBtn = document.getElementById('numbers-run');
  const statusEl = document.getElementById('numbers-status');

  const MARGIN = 28;      // 페이지 가장자리에서 번호까지 여백(pt)
  const FONT_SIZE = 11;

  // 보관함 변경 시 파일 드롭다운 갱신
  FileStore.onChange(() => fillFileSelect(fileSelect));

  /** 파일 선택 드롭다운 채우기 — 다른 도구도 재사용 */
  function fillFileSelect(select) {
    const prev = select.value;
    select.innerHTML = '';
    if (FileStore.files.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '보관함에 파일이 없습니다';
      select.appendChild(opt);
      return;
    }
    FileStore.files.forEach(f => {
      const opt = document.createElement('option');
      opt.value = String(f.id);
      opt.textContent = `${f.name} (${f.pageCount}p)`;
      select.appendChild(opt);
    });
    if ([...select.options].some(o => o.value === prev)) select.value = prev;
  }
  window.fillFileSelect = fillFileSelect;

  runBtn.addEventListener('click', async () => {
    const f = FileStore.get(Number(fileSelect.value));
    if (!f) {
      setStatus('먼저 파일 보관함에 PDF를 업로드하세요.', true);
      return;
    }
    runBtn.disabled = true;
    setStatus('번호를 넣는 중...');
    try {
      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      const doc = await PDFDocument.load(f.buffer);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const start = Math.max(1, Number(startInput.value) || 1);
      const total = doc.getPageCount();
      const pos = posSelect.value;      // tl tc tr bl bc br
      const fmt = formatSelect.value;

      doc.getPages().forEach((page, i) => {
        const n = start + i;
        let label;
        if (fmt === 'n-of-total') label = `${n} / ${start + total - 1}`;
        else if (fmt === 'dash') label = `- ${n} -`;
        else label = String(n);

        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(label, FONT_SIZE);
        let x;
        if (pos.endsWith('l')) x = MARGIN;
        else if (pos.endsWith('r')) x = width - MARGIN - textWidth;
        else x = (width - textWidth) / 2;
        const y = pos.startsWith('t') ? height - MARGIN : MARGIN - FONT_SIZE / 2 + 6;

        page.drawText(label, { x, y, size: FONT_SIZE, font, color: rgb(0.2, 0.2, 0.2) });
      });

      const bytes = await doc.save();
      PdfUtils.downloadPdf(bytes, f.name.replace(/\.pdf$/i, '') + '_번호');
      setStatus(`완료 — ${total}페이지에 번호를 넣었습니다.`);
      App.toast('페이지 번호 삽입이 완료되었습니다.');
    } catch (err) {
      console.error(err);
      setStatus('번호 삽입에 실패했습니다. 파일이 암호화되어 있지 않은지 확인해 주세요.', true);
    } finally {
      runBtn.disabled = false;
    }
  });

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('status--error', !!isError);
  }

  fillFileSelect(fileSelect);
})();
