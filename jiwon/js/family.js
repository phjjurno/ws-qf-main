/* ============================================================
   wsQf 패밀리 스위처 — 모든 사이트 공용
   헤더에 <div id="wsqf-family" data-current="jiwon"></div> 를 두면
   자동으로 "다른 앱으로 바로가기" 드롭다운을 렌더링합니다.
   현재 사이트는 표시에서 제외됩니다.
   ============================================================ */
(function () {
  var SITES = [
    { key: "home",     name: "wsQf",     emoji: "🏠", desc: "PDF 정리 · 지원금 · 물가 한 곳에", url: "https://ws-qf.com" },
    { key: "yamy",     name: "대얌이",   emoji: "🍜", desc: "뭐 먹을지 골라드려요", url: "https://yamy.ws-qf.com" },
    { key: "mist",     name: "비밀창문", emoji: "🌧️", desc: "빗방울 창문에 편지·그림", url: "https://mist.ws-qf.com" },
    { key: "shutress", name: "서트레스", emoji: "🥊", desc: "스트레스 시원하게 해소", url: "https://shutress.ws-qf.com" }
  ];

  function init() {
    var mount = document.getElementById("wsqf-family");
    if (!mount) return;
    var current = mount.getAttribute("data-current") || "";
    var list = SITES.filter(function (s) { return s.key !== current; });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wsqf-family__btn";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-haspopup", "true");
    btn.innerHTML = '<span class="wsqf-family__grid" aria-hidden="true">' +
      '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
      '<span class="wsqf-family__label">다른 앱</span>';

    var panel = document.createElement("div");
    panel.className = "wsqf-family__panel";
    panel.setAttribute("role", "menu");
    panel.hidden = true;
    panel.innerHTML = list.map(function (s) {
      return '<a class="wsqf-family__item" role="menuitem" href="' + s.url + '" rel="noopener">' +
        '<span class="wsqf-family__emoji" aria-hidden="true">' + s.emoji + '</span>' +
        '<span class="wsqf-family__text"><b>' + s.name + '</b><small>' + s.desc + '</small></span>' +
        '</a>';
    }).join("");

    function close() { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function toggle(e) {
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", toggle);
    document.addEventListener("click", function (e) { if (!mount.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    mount.classList.add("wsqf-family");
    mount.appendChild(btn);
    mount.appendChild(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
