/* ==========================================================
   app.js — 전역 UI (탭 전환, 토스트 알림)
   ========================================================== */
(function () {
  'use strict';

  // ---------- 탭 전환 ----------
  const tabs = Array.from(document.querySelectorAll('.tab[data-tab]'));
  const panels = {};
  tabs.forEach(tab => {
    panels[tab.dataset.tab] = document.getElementById('panel-' + tab.dataset.tab);
  });

  function selectTab(name) {
    tabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active));
      panels[tab.dataset.tab].hidden = !active;
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  });

  // 키보드 좌우 화살표로 탭 이동 (접근성)
  document.querySelector('.sidebar').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
    const next = tabs[(idx + dir + tabs.length) % tabs.length];
    next.focus();
    selectTab(next.dataset.tab);
  });

  // ---------- 작업 중 이탈 경고 ----------
  // 파일이나 영수증이 남아 있으면 새로고침·탭 닫기 전에 확인창 표시
  window.addEventListener('beforeunload', (e) => {
    const hasFiles = window.FileStore && FileStore.files.length > 0;
    const hasReceipts = window.ReceiptStore && ReceiptStore.count() > 0;
    if (hasFiles || hasReceipts) {
      e.preventDefault();
      e.returnValue = ''; // 브라우저 기본 확인창 트리거
    }
  });

  // ---------- 다크 모드 전환 ----------
  const themeToggle = document.getElementById('theme-toggle');
  const THEME_KEY = 'wsqf-theme';

  function currentTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  themeToggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });

  // ---------- 토스트 알림 ----------
  const toastWrap = document.getElementById('toast-wrap');

  /** 화면 하단 토스트 표시. type: 'info' | 'error' */
  function toast(message, type) {
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    el.textContent = message;
    toastWrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  window.App = { toast, selectTab };
})();
