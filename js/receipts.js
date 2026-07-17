/* ==========================================================
   receipts.js — 영수증 정리
   영수증 사진 업로드 → 금액·메모 입력 → A4 캔버스에 자동 정렬
   → 합계 계산 → 미리보기 / PDF 다운로드
   한글 텍스트는 캔버스로 그려 이미지로 넣으므로 폰트 깨짐 없음
   ========================================================== */
(function () {
  'use strict';

  // ---------- DOM ----------
  const dropzone = document.getElementById('receipt-dropzone');
  const input = document.getElementById('receipt-input');
  const titleInput = document.getElementById('receipt-title');
  const perPageSelect = document.getElementById('receipt-per-page');
  const listEl = document.getElementById('receipt-list');
  const emptyEl = document.getElementById('receipt-empty');
  const totalBar = document.getElementById('receipt-total-bar');
  const totalEl = document.getElementById('receipt-total');
  const countLabel = document.getElementById('receipt-count-label');
  const pdfBtn = document.getElementById('receipt-pdf');
  const previewBtn = document.getElementById('receipt-preview-btn');
  const statusEl = document.getElementById('receipt-status');
  const sheetsEl = document.getElementById('receipt-sheets');

  // A4 시트 렌더 크기 (150dpi 상당 — 인쇄 품질과 용량의 균형)
  const SHEET_W = 1240;
  const SHEET_H = 1754;
  const FONT = "'Inter', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

  let items = [];   // { id, img(Image), name, amount(number|null), memo }
  let nextId = 1;

  // 이탈 경고(app.js)에서 작업 여부 확인용
  window.ReceiptStore = { count: () => items.length };

  // ---------- 업로드 ----------
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => { addImages(Array.from(input.files)); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('is-dragover'); })
  );
  dropzone.addEventListener('drop', (e) => addImages(Array.from(e.dataTransfer.files)));

  function addImages(files) {
    for (const file of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        App.toast(`"${file.name}" — 지원하지 않는 형식입니다. JPG, PNG 또는 WEBP 사진을 올려 주세요.`, 'error');
        continue;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        items.push({ id: nextId++, img, name: file.name, amount: null, memo: '' });
        render();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        App.toast(`"${file.name}" — 이미지를 열 수 없습니다.`, 'error');
      };
      img.src = url; // object URL은 항목 삭제 시 해제
    }
  }

  // ---------- 목록 · 합계 ----------
  function parseAmount(str) {
    const digits = String(str).replace(/[^\d]/g, '');
    return digits ? Number(digits) : null;
  }
  function fmt(n) { return n.toLocaleString('ko-KR'); }

  function updateTotal() {
    const amounts = items.map(i => i.amount).filter(a => a !== null);
    const sum = amounts.reduce((a, b) => a + b, 0);
    totalBar.hidden = items.length === 0;
    totalEl.textContent = fmt(sum) + '원';
    countLabel.textContent = `(영수증 ${items.length}건 중 ${amounts.length}건 금액 입력)`;
  }

  function render() {
    emptyEl.hidden = items.length > 0;
    listEl.innerHTML = '';
    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'receipt-card';

      const order = document.createElement('span');
      order.className = 'receipt-card__order';
      order.textContent = `${idx + 1}번 · ${item.name}`;

      const img = document.createElement('img');
      img.className = 'receipt-card__img';
      img.src = item.img.src;
      img.alt = `${idx + 1}번 영수증 사진`;

      const amountRow = document.createElement('div');
      amountRow.className = 'receipt-card__row';
      const amountLabel = document.createElement('label');
      amountLabel.className = 'form-label';
      amountLabel.textContent = '금액';
      amountLabel.htmlFor = `receipt-amount-${item.id}`;
      const amountInput = document.createElement('input');
      amountInput.className = 'input';
      amountInput.id = `receipt-amount-${item.id}`;
      amountInput.inputMode = 'numeric';
      amountInput.placeholder = '예: 12,000';
      amountInput.value = item.amount !== null ? fmt(item.amount) : '';
      amountInput.addEventListener('input', () => {
        item.amount = parseAmount(amountInput.value);
        updateTotal();
      });
      amountInput.addEventListener('blur', () => {
        if (item.amount !== null) amountInput.value = fmt(item.amount);
      });
      amountRow.append(amountLabel, amountInput);

      const memoRow = document.createElement('div');
      memoRow.className = 'receipt-card__row';
      const memoLabel = document.createElement('label');
      memoLabel.className = 'form-label';
      memoLabel.textContent = '메모';
      memoLabel.htmlFor = `receipt-memo-${item.id}`;
      const memoInput = document.createElement('input');
      memoInput.className = 'input';
      memoInput.id = `receipt-memo-${item.id}`;
      memoInput.placeholder = '예: 7/10 점심 회식';
      memoInput.value = item.memo;
      memoInput.addEventListener('input', () => { item.memo = memoInput.value; });
      memoRow.append(memoLabel, memoInput);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn--secondary btn--sm';
      delBtn.type = 'button';
      delBtn.textContent = '삭제';
      delBtn.addEventListener('click', () => {
        URL.revokeObjectURL(item.img.src);
        items = items.filter(x => x.id !== item.id);
        render();
      });

      li.append(order, img, amountRow, memoRow, delBtn);
      listEl.appendChild(li);
    });
    updateTotal();
  }

  // ---------- A4 시트 그리기 ----------
  /** 영수증들을 A4 캔버스 여러 장으로 그려 canvas 배열 반환 */
  function drawSheets() {
    const perPage = Number(perPageSelect.value);   // 2 | 4 | 6
    const cols = perPage === 2 ? 1 : 2;
    const rows = perPage / cols;
    const title = titleInput.value.trim() || '영수증 정리';
    const today = new Date().toISOString().slice(0, 10);
    const totalPages = Math.ceil(items.length / perPage);
    const amounts = items.map(i => i.amount).filter(a => a !== null);
    const sum = amounts.reduce((a, b) => a + b, 0);

    const M = 70;            // 바깥 여백
    const HEADER_H = 110;
    const FOOTER_H = 90;
    const CAPTION_H = 56;    // 각 영수증 아래 설명 줄

    const sheets = [];
    for (let p = 0; p < totalPages; p++) {
      const canvas = document.createElement('canvas');
      canvas.width = SHEET_W;
      canvas.height = SHEET_H;
      const ctx = canvas.getContext('2d');

      // 배경 · 헤더
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SHEET_W, SHEET_H);
      ctx.fillStyle = '#1F2937';
      ctx.font = `700 40px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.fillText(title, M, M - 20);
      ctx.font = `400 24px ${FONT}`;
      ctx.fillStyle = '#6B7280';
      const dateText = `작성일 ${today}`;
      ctx.fillText(dateText, SHEET_W - M - ctx.measureText(dateText).width, M - 8);
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(M, M + 50);
      ctx.lineTo(SHEET_W - M, M + 50);
      ctx.stroke();

      // 그리드 셀
      const gridTop = M + HEADER_H - 30;
      const gridH = SHEET_H - gridTop - FOOTER_H - M / 2;
      const cellW = (SHEET_W - M * 2 - (cols - 1) * 24) / cols;
      const cellH = (gridH - (rows - 1) * 24) / rows;

      const pageItems = items.slice(p * perPage, (p + 1) * perPage);
      pageItems.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = M + col * (cellW + 24);
        const cy = gridTop + row * (cellH + 24);
        const imgAreaH = cellH - CAPTION_H;

        // 셀 테두리
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW, cellH);

        // 이미지 contain-fit (비율 유지, 잘림 없음)
        const pad = 14;
        const s = Math.min((cellW - pad * 2) / item.img.width, (imgAreaH - pad * 2) / item.img.height);
        const dw = item.img.width * s;
        const dh = item.img.height * s;
        ctx.drawImage(item.img, cx + (cellW - dw) / 2, cy + pad + (imgAreaH - pad * 2 - dh) / 2, dw, dh);

        // 설명 줄: 번호 · 금액 · 메모
        const globalIdx = p * perPage + i + 1;
        ctx.fillStyle = '#F9FAFB';
        ctx.fillRect(cx + 1, cy + imgAreaH, cellW - 2, CAPTION_H - 1);
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(cx, cy + imgAreaH);
        ctx.lineTo(cx + cellW, cy + imgAreaH);
        ctx.stroke();

        ctx.fillStyle = '#1F2937';
        ctx.font = `700 24px ${FONT}`;
        const numText = `${globalIdx}.`;
        ctx.fillText(numText, cx + 16, cy + imgAreaH + 15);
        const amountText = item.amount !== null ? fmt(item.amount) + '원' : '금액 미입력';
        ctx.font = `700 24px ${FONT}`;
        ctx.fillStyle = item.amount !== null ? '#1F2937' : '#6B7280';
        ctx.fillText(amountText, cx + 16 + ctx.measureText(numText).width + 14, cy + imgAreaH + 15);
        if (item.memo) {
          ctx.font = `400 22px ${FONT}`;
          ctx.fillStyle = '#6B7280';
          let memo = item.memo;
          // 셀 폭을 넘으면 말줄임
          const maxW = cellW - 32 - ctx.measureText(amountText + numText).width - 40;
          while (ctx.measureText(memo).width > maxW && memo.length > 1) memo = memo.slice(0, -1);
          if (memo !== item.memo) memo += '…';
          ctx.fillText(memo, cx + cellW - 16 - ctx.measureText(memo).width, cy + imgAreaH + 17);
        }
      });

      // 푸터: 페이지 번호 + (마지막 장) 합계
      ctx.fillStyle = '#6B7280';
      ctx.font = `400 22px ${FONT}`;
      const pageText = `${p + 1} / ${totalPages}`;
      ctx.fillText(pageText, (SHEET_W - ctx.measureText(pageText).width) / 2, SHEET_H - M + 10);

      if (p === totalPages - 1) {
        const label = `합계 ${fmt(sum)}원 (${items.length}건)`;
        ctx.font = `700 30px ${FONT}`;
        const w = ctx.measureText(label).width;
        const bx = SHEET_W - M - w - 48;
        const by = SHEET_H - M - 34;
        ctx.fillStyle = '#F9FAFB';
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 2.5;
        ctx.fillRect(bx, by, w + 48, 58);
        ctx.strokeRect(bx, by, w + 48, 58);
        ctx.fillStyle = '#1F2937';
        ctx.fillText(label, bx + 24, by + 15);
      }

      sheets.push(canvas);
    }
    return sheets;
  }

  // ---------- 미리보기 ----------
  previewBtn.addEventListener('click', () => {
    if (!ensureItems()) return;
    setStatus('미리보기 생성 중...');
    const sheets = drawSheets();
    sheetsEl.innerHTML = '';
    sheets.forEach((c, i) => {
      const img = document.createElement('img');
      img.src = c.toDataURL('image/jpeg', 0.8);
      img.alt = `A4 미리보기 ${i + 1}쪽`;
      sheetsEl.appendChild(img);
      c.width = 0; c.height = 0;
    });
    setStatus(`${sheets.length}쪽 미리보기를 만들었습니다.`);
  });

  // ---------- PDF 다운로드 ----------
  pdfBtn.addEventListener('click', async () => {
    if (!ensureItems()) return;
    pdfBtn.disabled = true;
    setStatus('PDF 생성 중...');
    try {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.create();
      const A4 = [595.28, 841.89];
      const sheets = drawSheets();
      for (const c of sheets) {
        const jpg = await doc.embedJpg(c.toDataURL('image/jpeg', 0.88));
        const page = doc.addPage(A4);
        page.drawImage(jpg, { x: 0, y: 0, width: A4[0], height: A4[1] });
        c.width = 0; c.height = 0;
      }
      const bytes = await doc.save();
      const today = new Date().toISOString().slice(0, 10);
      PdfUtils.downloadPdf(bytes, `${titleInput.value.trim() || '영수증정리'}_${today}`);
      setStatus(`완료 — ${sheets.length}쪽 PDF를 만들었습니다.`);
      App.toast('영수증 PDF가 완성되었습니다.');
    } catch (err) {
      console.error(err);
      setStatus('PDF 생성에 실패했습니다. 사진 수를 줄여서 다시 시도해 보세요.', true);
    } finally {
      pdfBtn.disabled = false;
    }
  });

  function ensureItems() {
    if (items.length === 0) {
      setStatus('먼저 영수증 사진을 올려 주세요.', true);
      return false;
    }
    return true;
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('status--error', !!isError);
  }
})();
