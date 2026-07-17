/* ==========================================================
   pdf-utils.js — PDF 공통 유틸
   - pdf.js 초기화 (썸네일 렌더링용)
   - PDF 로드/페이지 수 확인/썸네일 생성/다운로드
   ========================================================== */
(function () {
  'use strict';

  // pdf.js 워커 경로 (로컬 vendor)
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  }

  /** File → ArrayBuffer */
  async function readFileBuffer(file) {
    return await file.arrayBuffer();
  }

  /**
   * PDF가 유효한지 확인하고 페이지 수를 반환.
   * 손상된 파일이면 null 반환.
   */
  async function getPdfInfo(buffer) {
    try {
      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      const pageCount = doc.numPages;
      await doc.destroy();
      return { pageCount };
    } catch (e) {
      return null;
    }
  }

  /**
   * PDF 1페이지를 캔버스에 렌더링해 썸네일 dataURL 생성.
   * 실패 시 null (썸네일 없이도 목록은 동작해야 함).
   */
  async function makeThumbnail(buffer, maxWidth) {
    try {
      const doc = await window.pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const scale = (maxWidth || 112) / viewport.width;
      const scaled = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(scaled.width);
      canvas.height = Math.ceil(scaled.height);
      const ctx = canvas.getContext('2d');
      // 투명 배경이 JPEG 변환 시 검정이 되지 않도록 흰색으로 채움
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // intent:'print' — 백그라운드 탭에서 requestAnimationFrame이 멈춰도
      // 렌더링이 완료되도록 함 (display intent는 rAF에 의존)
      await page.render({ canvasContext: ctx, viewport: scaled, intent: 'print' }).promise;

      const url = canvas.toDataURL('image/jpeg', 0.8);
      await doc.destroy();
      // 캔버스 메모리 해제
      canvas.width = 0; canvas.height = 0;
      return url;
    } catch (e) {
      return null;
    }
  }

  /** 바이트 → 사람이 읽는 용량 문자열 */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** 파일명에 쓸 수 없는 문자 제거 */
  function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'document';
  }

  /** Uint8Array를 PDF 파일로 다운로드 */
  function downloadPdf(bytes, fileName) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFileName(fileName).replace(/\.pdf$/i, '') + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // object URL 해제 (메모리 누수 방지)
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.PdfUtils = { readFileBuffer, getPdfInfo, makeThumbnail, formatSize, sanitizeFileName, downloadPdf };
})();
