/* ==========================================================
   rename.js — 파일명 변경
   보관함 파일 이름을 수정하고, 바뀐 이름으로 다운로드
   ========================================================== */
(function () {
  'use strict';

  const listEl = document.getElementById('rename-list');
  const emptyEl = document.getElementById('rename-empty');

  FileStore.onChange(render);

  function render() {
    const files = FileStore.files;
    emptyEl.hidden = files.length > 0;
    listEl.innerHTML = '';

    files.forEach(f => {
      const li = document.createElement('li');
      li.className = 'pick-item';

      const input = document.createElement('input');
      input.className = 'input';
      input.type = 'text';
      input.value = f.name.replace(/\.pdf$/i, '');
      input.setAttribute('aria-label', `${f.name}의 새 이름`);

      const meta = document.createElement('span');
      meta.className = 'pick-item__meta';
      meta.textContent = '.pdf';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn--secondary btn--sm';
      saveBtn.type = 'button';
      saveBtn.textContent = '이름 저장';
      saveBtn.addEventListener('click', () => {
        const newName = PdfUtils.sanitizeFileName(input.value) + '.pdf';
        if (newName === '.pdf') {
          App.toast('파일 이름을 입력해 주세요.', 'error');
          return;
        }
        f.name = newName;
        FileStore.emit(); // 다른 도구 목록에도 반영
        App.toast(`이름을 "${newName}"(으)로 바꿨습니다.`);
      });

      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn btn--sm';
      dlBtn.type = 'button';
      dlBtn.textContent = '다운로드';
      dlBtn.addEventListener('click', () => {
        const name = PdfUtils.sanitizeFileName(input.value) || f.name;
        PdfUtils.downloadPdf(new Uint8Array(f.buffer), name);
      });

      li.append(input, meta, saveBtn, dlBtn);
      listEl.appendChild(li);
    });
  }

  render();
})();
