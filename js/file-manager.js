/* ==========================================================
   file-manager.js — 파일 보관함
   - PDF 업로드(클릭·드래그앤드롭), 검증, 목록 표시
   - 검색(이름 필터)·정렬, 삭제, 전체 비우기
   - 업로드된 파일은 모든 도구(합치기·압축 등)가 공유
   ========================================================== */
(function () {
  'use strict';

  const MAX_FILE_MB = 50;

  /** 보관함 상태 — 다른 모듈은 window.FileStore로 접근 */
  const store = {
    files: [],            // { id, name, size, pageCount, buffer, thumbUrl, addedAt }
    nextId: 1,
    listeners: [],
    onChange(fn) { this.listeners.push(fn); },
    emit() { this.listeners.forEach(fn => fn(this.files)); },
    get(id) { return this.files.find(f => f.id === id); },
  };
  window.FileStore = store;

  // ---------- DOM ----------
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const listEl = document.getElementById('file-list');
  const countEl = document.getElementById('file-count');
  const emptyEl = document.getElementById('empty-hint');
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('search-input');
  const clearAllBtn = document.getElementById('clear-all');

  // ---------- 업로드 ----------
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = ''; // 같은 파일 재선택 허용
  });

  ['dragenter', 'dragover'].forEach(ev =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    addFiles(Array.from(e.dataTransfer.files));
  });

  /** 파일 추가: 형식·용량·손상 검증 후 보관함에 등록 */
  async function addFiles(rawFiles) {
    for (const file of rawFiles) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        App.toast(`"${file.name}" — PDF 파일만 업로드할 수 있습니다.`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        App.toast(`"${file.name}" — 파일이 너무 큽니다. ${MAX_FILE_MB}MB 이하만 지원합니다.`, 'error');
        continue;
      }
      if (store.files.some(f => f.name === file.name && f.size === file.size)) {
        App.toast(`"${file.name}" — 이미 추가된 파일입니다.`, 'error');
        continue;
      }

      const buffer = await PdfUtils.readFileBuffer(file);
      const info = await PdfUtils.getPdfInfo(buffer);
      if (!info) {
        App.toast(`"${file.name}" — 파일이 손상되었거나 열 수 없는 PDF입니다.`, 'error');
        continue;
      }

      const item = {
        id: store.nextId++,
        name: file.name,
        size: file.size,
        pageCount: info.pageCount,
        buffer,
        thumbUrl: null,
        addedAt: Date.now(),
      };
      store.files.push(item);
      store.emit();

      // 썸네일은 비동기로 생성 (목록 표시를 막지 않음)
      PdfUtils.makeThumbnail(buffer).then(url => {
        item.thumbUrl = url;
        store.emit();
      });
    }
  }

  // ---------- 목록 렌더링 ----------
  function currentView() {
    const q = searchInput.value.trim().toLowerCase();
    let view = store.files.filter(f => !q || f.name.toLowerCase().includes(q));
    switch (sortSelect.value) {
      case 'name':       view = view.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko')); break;
      case 'size-desc':  view = view.slice().sort((a, b) => b.size - a.size); break;
      case 'size-asc':   view = view.slice().sort((a, b) => a.size - b.size); break;
      case 'pages-desc': view = view.slice().sort((a, b) => b.pageCount - a.pageCount); break;
      default:           view = view.slice().sort((a, b) => a.addedAt - b.addedAt);
    }
    return view;
  }

  function render() {
    const view = currentView();
    countEl.innerHTML = `파일 <strong>${store.files.length}</strong>개` +
      (view.length !== store.files.length ? ` · 검색 결과 ${view.length}개` : '');
    emptyEl.hidden = store.files.length > 0;
    emptyEl.textContent = store.files.length === 0
      ? '아직 업로드한 파일이 없습니다.'
      : '';
    if (store.files.length > 0 && view.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = '검색 결과가 없습니다.';
    }

    listEl.innerHTML = '';
    for (const f of view) {
      const li = document.createElement('li');
      li.className = 'file-card';

      const thumb = f.thumbUrl
        ? `<img class="file-card__thumb" src="${f.thumbUrl}" alt="${escapeHtml(f.name)} 1페이지 미리보기" />`
        : `<div class="file-card__thumb" aria-hidden="true">
             <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
           </div>`;

      li.innerHTML = `
        ${thumb}
        <div class="file-card__info">
          <p class="file-card__name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</p>
          <p class="file-card__meta">${f.pageCount}페이지 · ${PdfUtils.formatSize(f.size)}</p>
        </div>
        <div class="file-card__actions">
          <button class="icon-btn" data-action="download" data-id="${f.id}" aria-label="${escapeHtml(f.name)} 다운로드" title="다운로드">
            <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="icon-btn icon-btn--danger" data-action="remove" data-id="${f.id}" aria-label="${escapeHtml(f.name)} 삭제" title="삭제">
            <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>`;
      listEl.appendChild(li);
    }
  }

  // 액션 버튼 (이벤트 위임)
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const f = store.get(id);
    if (!f) return;

    if (btn.dataset.action === 'remove') {
      store.files = store.files.filter(x => x.id !== id);
      store.emit();
      App.toast(`"${f.name}" 파일을 삭제했습니다.`);
    } else if (btn.dataset.action === 'download') {
      PdfUtils.downloadPdf(new Uint8Array(f.buffer), f.name);
    }
  });

  clearAllBtn.addEventListener('click', () => {
    if (store.files.length === 0) return;
    if (!confirm('업로드한 파일을 모두 삭제할까요?')) return;
    store.files = [];
    store.emit();
    App.toast('모든 파일을 삭제했습니다.');
  });

  sortSelect.addEventListener('change', render);
  searchInput.addEventListener('input', render);
  store.onChange(render);

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  render();
})();
