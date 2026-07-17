/* ==========================================================
   stamp.js — 도장 · 서명
   1) 도장 이미지 업로드 또는 서명 직접 그리기
   2) 페이지 미리보기 클릭으로 위치 지정 (드래그로 이동 가능)
   3) pdf-lib으로 실제 PDF에 합성해 다운로드
   위치는 페이지 크기 대비 비율로 저장해 어떤 페이지 크기에도 정확히 적용
   ========================================================== */
(function () {
  'use strict';

  // ---------- DOM ----------
  const fileSelect = document.getElementById('stamp-file');
  const uploadBtn = document.getElementById('stamp-upload-btn');
  const imageInput = document.getElementById('stamp-image-input');
  const drawBtn = document.getElementById('stamp-draw-btn');
  const sigWrap = document.getElementById('sig-pad-wrap');
  const sigPad = document.getElementById('sig-pad');
  const sigClear = document.getElementById('sig-clear');
  const sigUse = document.getElementById('sig-use');
  const currentWrap = document.getElementById('stamp-current');
  const currentImg = document.getElementById('stamp-current-img');
  const sizeSlider = document.getElementById('stamp-size');
  const pageNav = document.getElementById('stamp-page-nav');
  const prevBtn = document.getElementById('stamp-prev');
  const nextBtn = document.getElementById('stamp-next');
  const pageLabel = document.getElementById('stamp-page-label');
  const previewWrap = document.getElementById('stamp-preview-wrap');
  const previewCanvas = document.getElementById('stamp-preview');
  const overlaysEl = document.getElementById('stamp-overlays');
  const actionsEl = document.getElementById('stamp-actions');
  const downloadBtn = document.getElementById('stamp-download');
  const clearAllBtn = document.getElementById('stamp-clear-all');
  const statusEl = document.getElementById('stamp-status');

  // ---------- 상태 ----------
  let fileId = null;          // 선택된 보관함 파일 id
  let pdfDoc = null;          // pdf.js 문서 (미리보기용)
  let pageNum = 1;            // 현재 페이지 (1부터)
  let stamp = null;           // { dataUrl, w, h } — 준비된 도장 PNG
  let placements = [];        // { id, pageIndex, xr, yr, wr } 비율 좌표(중심점)
  let nextPlacementId = 1;
  let rendering = false;

  const PREVIEW_WIDTH = 620;  // 미리보기 렌더 너비(px)

  // ---------- 파일 선택 ----------
  FileStore.onChange(() => {
    fillFileSelect(fileSelect);
    // 선택했던 파일이 삭제된 경우 초기화
    if (fileId !== null && !FileStore.get(fileId)) resetAll();
    // 아직 아무 파일도 안 골랐으면 첫 파일 자동 선택
    if (fileId === null && FileStore.files.length > 0) loadFile(FileStore.files[0].id);
  });

  fileSelect.addEventListener('change', () => loadFile(Number(fileSelect.value)));

  async function loadFile(id) {
    const f = FileStore.get(id);
    if (!f) return;
    if (placements.length > 0) App.toast('파일을 바꿔서 찍어둔 도장 위치를 초기화했습니다.');
    fileId = id;
    placements = [];
    pageNum = 1;
    if (pdfDoc) { pdfDoc.destroy(); pdfDoc = null; }
    pdfDoc = await pdfjsLib.getDocument({ data: f.buffer.slice(0) }).promise;
    pageNav.hidden = false;
    previewWrap.hidden = false;
    actionsEl.hidden = false;
    await renderPage();
  }

  function resetAll() {
    fileId = null;
    placements = [];
    if (pdfDoc) { pdfDoc.destroy(); pdfDoc = null; }
    pageNav.hidden = true;
    previewWrap.hidden = true;
    actionsEl.hidden = true;
  }

  // ---------- 미리보기 렌더링 ----------
  async function renderPage() {
    if (!pdfDoc || rendering) return;
    rendering = true;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const scale = PREVIEW_WIDTH / base.width;
      const viewport = page.getViewport({ scale });
      previewCanvas.width = Math.ceil(viewport.width);
      previewCanvas.height = Math.ceil(viewport.height);
      const ctx = previewCanvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
      pageLabel.textContent = `${pageNum} / ${pdfDoc.numPages}`;
      prevBtn.disabled = pageNum <= 1;
      nextBtn.disabled = pageNum >= pdfDoc.numPages;
      renderOverlays();
    } finally {
      rendering = false;
    }
  }

  prevBtn.addEventListener('click', () => { if (pageNum > 1) { pageNum--; renderPage(); } });
  nextBtn.addEventListener('click', () => { if (pdfDoc && pageNum < pdfDoc.numPages) { pageNum++; renderPage(); } });

  // ---------- 도장 준비: 이미지 업로드 ----------
  uploadBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    imageInput.value = '';
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // 어떤 형식이든 PNG로 통일 (투명 배경 유지, pdf-lib 호환)
      const c = document.createElement('canvas');
      const maxSide = 800; // 도장 원본은 800px면 충분
      const s = Math.min(1, maxSide / Math.max(img.width, img.height));
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      setStamp(c.toDataURL('image/png'), c.width, c.height);
      URL.revokeObjectURL(url);
      c.width = 0; c.height = 0;
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      App.toast('이미지를 열 수 없습니다. PNG, JPG 또는 WEBP 파일을 선택해 주세요.', 'error');
    };
    img.src = url;
  });

  // ---------- 도장 준비: 서명 그리기 ----------
  const sigCtx = sigPad.getContext('2d');
  let drawing = false;
  let sigDirty = false;

  drawBtn.addEventListener('click', () => {
    sigWrap.hidden = !sigWrap.hidden;
  });

  function sigPos(e) {
    const r = sigPad.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (sigPad.width / r.width),
      y: (e.clientY - r.top) * (sigPad.height / r.height),
    };
  }
  sigPad.addEventListener('pointerdown', (e) => {
    drawing = true;
    sigDirty = true;
    sigPad.setPointerCapture(e.pointerId);
    const p = sigPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(p.x, p.y);
  });
  sigPad.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = sigPos(e);
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#1F2937';
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
  });
  ['pointerup', 'pointercancel'].forEach(ev =>
    sigPad.addEventListener(ev, () => { drawing = false; })
  );

  sigClear.addEventListener('click', () => {
    sigCtx.clearRect(0, 0, sigPad.width, sigPad.height);
    sigDirty = false;
  });
  sigUse.addEventListener('click', () => {
    if (!sigDirty) {
      App.toast('먼저 서명을 그려 주세요.', 'error');
      return;
    }
    setStamp(sigPad.toDataURL('image/png'), sigPad.width, sigPad.height);
    sigWrap.hidden = true;
  });

  function setStamp(dataUrl, w, h) {
    stamp = { dataUrl, w, h };
    currentImg.src = dataUrl;
    currentWrap.hidden = false;
    App.toast('도장이 준비되었습니다. 미리보기 페이지를 클릭해 찍으세요.');
  }

  // ---------- 도장 찍기 (미리보기 클릭) ----------
  previewCanvas.addEventListener('click', (e) => {
    if (!stamp) {
      App.toast('먼저 도장 이미지를 올리거나 서명을 그려 주세요.', 'error');
      return;
    }
    const r = previewCanvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return; // 레이아웃 전 클릭 방어
    placements.push({
      id: nextPlacementId++,
      pageIndex: pageNum - 1,
      xr: (e.clientX - r.left) / r.width,
      yr: (e.clientY - r.top) / r.height,
      wr: Number(sizeSlider.value) / r.width,
      dataUrl: stamp.dataUrl,
      ratio: stamp.h / stamp.w,
    });
    renderOverlays();
  });

  /** 현재 페이지의 도장들을 미리보기 위에 표시 (드래그 이동, 삭제) */
  function renderOverlays() {
    overlaysEl.innerHTML = '';
    const r = previewCanvas.getBoundingClientRect();
    placements.filter(p => p.pageIndex === pageNum - 1).forEach(p => {
      const w = p.wr * r.width;
      const h = w * p.ratio;
      const div = document.createElement('div');
      div.className = 'stamp-overlay';
      div.style.cssText = `left:${p.xr * r.width - w / 2}px; top:${p.yr * r.height - h / 2}px; width:${w}px; height:${h}px;`;
      div.innerHTML = `<img src="${p.dataUrl}" alt="찍힌 도장" draggable="false" />
        <button class="stamp-overlay__del" aria-label="이 도장 삭제" title="삭제">×</button>`;

      // 삭제
      div.querySelector('.stamp-overlay__del').addEventListener('click', (e) => {
        e.stopPropagation();
        placements = placements.filter(x => x.id !== p.id);
        renderOverlays();
      });

      // 드래그 이동
      div.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.stamp-overlay__del')) return;
        e.preventDefault();
        div.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const rect = previewCanvas.getBoundingClientRect();
          p.xr = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
          p.yr = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
          const ww = p.wr * rect.width;
          div.style.left = (p.xr * rect.width - ww / 2) + 'px';
          div.style.top = (p.yr * rect.height - ww * p.ratio / 2) + 'px';
        };
        const up = () => {
          div.removeEventListener('pointermove', move);
          div.removeEventListener('pointerup', up);
        };
        div.addEventListener('pointermove', move);
        div.addEventListener('pointerup', up);
      });

      overlaysEl.appendChild(div);
    });
  }

  // 창 크기가 바뀌면 오버레이 위치를 새 캔버스 크기에 맞춰 다시 계산
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pdfDoc && !previewWrap.hidden) renderOverlays();
    }, 150);
  });

  clearAllBtn.addEventListener('click', () => {
    placements = [];
    renderOverlays();
    App.toast('찍은 도장을 모두 지웠습니다.');
  });

  // ---------- 적용 · 다운로드 ----------
  downloadBtn.addEventListener('click', async () => {
    const f = FileStore.get(fileId);
    if (!f) {
      setStatus('대상 파일을 선택해 주세요.', true);
      return;
    }
    if (placements.length === 0) {
      setStatus('찍은 도장이 없습니다. 미리보기를 클릭해 도장을 찍어 주세요.', true);
      return;
    }
    downloadBtn.disabled = true;
    setStatus('도장을 적용하는 중...');
    try {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(f.buffer);
      // 같은 도장 이미지는 한 번만 임베드
      const embedded = new Map();
      for (const p of placements) {
        if (!embedded.has(p.dataUrl)) {
          embedded.set(p.dataUrl, await doc.embedPng(p.dataUrl));
        }
        const img = embedded.get(p.dataUrl);
        const page = doc.getPage(p.pageIndex);
        const { width: pw, height: ph } = page.getSize();
        const w = p.wr * pw;
        const h = w * p.ratio;
        page.drawImage(img, {
          x: p.xr * pw - w / 2,
          y: ph - p.yr * ph - h / 2,   // PDF 좌표계는 아래에서 위로
          width: w,
          height: h,
        });
      }
      const bytes = await doc.save();
      PdfUtils.downloadPdf(bytes, f.name.replace(/\.pdf$/i, '') + '_도장');
      setStatus(`완료 — 도장 ${placements.length}개를 적용했습니다.`);
      App.toast('도장 적용이 완료되었습니다.');
    } catch (err) {
      console.error(err);
      setStatus('도장 적용에 실패했습니다. 파일이 암호화되어 있지 않은지 확인해 주세요.', true);
    } finally {
      downloadBtn.disabled = false;
    }
  });

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('status--error', !!isError);
  }

  fillFileSelect(fileSelect);
  // 파일이 이미 있으면 첫 파일 자동 로드
  if (FileStore.files.length > 0) loadFile(FileStore.files[0].id);
})();
