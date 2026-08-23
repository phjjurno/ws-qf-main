/* 생필품 가격 즉시조회 — UI 로직 */
(function () {
  // 다크모드
  const root = document.documentElement;
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const cur = root.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("wsqf-theme", next);
  });

  const state = { category: null, store: null, query: "" };

  function bindChips(groupEl, key, opts) {
    opts.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = opt.label;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        state[key] = state[key] === opt.value ? null : opt.value;
        [...groupEl.children].forEach((c, i) =>
          c.setAttribute("aria-pressed", state[key] === opts[i].value ? "true" : "false"));
        render();
      });
      groupEl.appendChild(b);
    });
  }

  bindChips(document.getElementById("chips-cat"), "category", [
    { label: "축산물", value: "축산물" }, { label: "수산물", value: "수산물" },
    { label: "농산물", value: "농산물" }, { label: "가공식품", value: "가공식품" },
    { label: "생활용품", value: "생활용품" },
  ]);
  bindChips(document.getElementById("chips-store"), "store", [
    { label: "대형마트", value: "대형마트" }, { label: "백화점", value: "백화점" },
    { label: "SSM", value: "SSM" }, { label: "전통시장", value: "전통시장" },
    { label: "편의점", value: "편의점" },
  ]);

  const searchInput = document.getElementById("search-input");
  let t; searchInput.addEventListener("input", () => {
    clearTimeout(t); t = setTimeout(() => { state.query = searchInput.value.trim(); render(); }, 180);
  });

  const cardsEl = document.getElementById("cards");
  const countEl = document.getElementById("count");
  const emptyEl = document.getElementById("empty");
  const dayEl = document.getElementById("inspect-day");

  function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[m])); }
  function won(n) { return n == null ? "-" : Number(n).toLocaleString("ko-KR") + "원"; }

  async function render() {
    const list = await window.MulgaData.fetchPrices(state);
    countEl.textContent = list.length;
    dayEl.textContent = list[0]?.inspect_day ? `조사일 ${list[0].inspect_day}` : "";
    if (!list.length) { cardsEl.innerHTML = ""; emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    cardsEl.innerHTML = list.map((p) => `
      <article class="card">
        <div class="card__top">
          <span class="tag">${esc(p.category || "기타")}</span>
          ${p.unit ? `<span class="tag tag--region">${esc(p.unit)}</span>` : ""}
        </div>
        <h3>${esc(p.good_name)}</h3>
        <p class="price-line">
          <span class="price-avg">${won(p.avg_price)}</span>
          <span class="price-range">최저 ${won(p.min_price)} · 최고 ${won(p.max_price)}</span>
        </p>
        <div class="card__meta">
          <span>조사 판매점 <b>${esc(p.store_count ?? "-")}곳</b></span>
          <span>조사일 <b>${esc(p.inspect_day ?? "-")}</b></span>
        </div>
      </article>`).join("");
  }

  render();
})();
