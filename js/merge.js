/* ==========================================================
   merge.js — PDF 합치기
   보관함 파일 중 선택 + 순서 지정 → 하나의 PDF로 병합
   ========================================================== */
(function () {
  'use strict';

  const listEl = document.getElementById('merge-list');
  const emptyEl = document.getElementById('merge-empty');
  const nameInput = document.getElementById('merge-name');
  const runBtn = document.getElementById('merge-run');
  const statusEl = document.getElementById('merge-status');

  let order = [];              // 파일 id 순서 (사용자가 ↑↓로 조정)
  const selected = new Set();  // 체크된 파일 id

  /** 보관함 변경 시 순서 목록 동기화 (새 파일은 끝에, 삭제된 파일은 제거) */
  FileStore.onChange(files => {
    const ids = files.map(f => f.id);
    order = order.filter(id => ids.includes(id));
    ids.forEach(id => { if (!order.includes(id)) order.push(id); });
    [...selected].forEach(id => { if (!ids.includes(id)) selected.delete(id); });
    render();
  });

  function render() {
    const files = FileStore.files;
    emptyEl.hidden = files.length > 0;
    listEl.innerHTML = '';

    order.forEach((id, idx) => {
      const f = FileStore.get(id);
      if (!f) return;
      const li = document.createElement('li');
      li.className = 'pick-item';
      li.innerHTML = `
        <input class="pick-item__check" type="checkbox" id="merge-check-${id}"
               ${selected.has(id) ? 'checked' : ''} aria-label="${esc(f.name)} 합치기에 포함" />
        <label class="pick-item__name" for="merge-check-${id}" title="${esc(f.name)}">${esc(f.name)}</label>
        <span class="pick-item__meta">${f.pageCount}p</span>
        <button class="icon-btn" data-move="-1" data-id="${id}" aria-label="${esc(f.name)} 위로 이동" ${idx === 0 ? 'disabled' : ''}>
          <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="icon-btn" data-move="1" data-id="${id}" aria-label="${esc(f.name)} 아래로 이동" ${idx === order.length - 1 ? 'disabled' : ''}>
          <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>`;
      li.querySelector('input').addEventListener('change', (e) => {
        e.target.checked ? selected.add(id) : selected.delete(id);
      });
      listEl.appendChild(li);
    });
  }

  // ↑↓ 이동 (이벤트 위임)
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-move]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const dir = Number(btn.dataset.move);
    const idx = order.indexOf(id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= order.length) return;
    [order[idx], order[to]] = [order[to], order[idx]];
    render();
  });

  // 병합 실행
  runBtn.addEventListener('click', async () => {
    const ids = order.filter(id => selected.has(id));
    if (ids.length < 2) {
      setStatus('합칠 파일을 2개 이상 선택해 주세요.', true);
      return;
    }
    runBtn.disabled = true;
    setStatus('합치는 중...');
    try {
      const { PDFDocument } = PDFLib;
      const out = await PDFDocument.create();
      for (const id of ids) {
        const f = FileStore.get(id);
        const src = await PDFDocument.load(f.buffer);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(p => out.addPage(p));
      }
      const bytes = await out.save();
      PdfUtils.downloadPdf(bytes, nameInput.value || '합친문서');
      setStatus(`완료 — ${ids.length}개 파일, ${out.getPageCount()}페이지`);
      App.toast('PDF 합치기가 완료되었습니다.');
    } catch (err) {
      console.error(err);
      setStatus('합치기에 실패했습니다. 파일이 암호화되어 있지 않은지 확인해 주세요.', true);
    } finally {
      runBtn.disabled = false;
    }
  });

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('status--error', !!isError);
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
})();
