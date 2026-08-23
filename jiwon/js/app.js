/* 지원금 3초 진단기 — UI 로직 */
(function () {
  // 다크모드
  const root = document.documentElement;
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const cur = root.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("wsqf-theme", next);
  });

  const state = { region: "00", ageBand: null, category: null, query: "" };

  // 칩 그룹 바인딩
  function bindChips(groupEl, key, opts) {
    opts.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = opt.label;
      b.setAttribute("aria-pressed", state[key] === opt.value ? "true" : "false");
      b.addEventListener("click", () => {
        // 토글 (지역은 항상 하나 선택 유지, 나머지는 해제 가능)
        state[key] = state[key] === opt.value ? (key === "region" ? "00" : null) : opt.value;
        [...groupEl.children].forEach((c, i) =>
          c.setAttribute("aria-pressed", state[key] === opts[i].value ? "true" : "false"));
        render();
      });
      groupEl.appendChild(b);
    });
  }

  bindChips(document.getElementById("chips-region"), "region", [
    { label: "전국", value: "00" }, { label: "서울", value: "11" }, { label: "부산", value: "26" },
    { label: "인천", value: "28" }, { label: "대구", value: "27" }, { label: "경기", value: "41" },
  ]);
  bindChips(document.getElementById("chips-age"), "ageBand", [
    { label: "10대", value: "10대" }, { label: "20대", value: "20대" }, { label: "30대", value: "30대" },
    { label: "40대", value: "40대" }, { label: "50대", value: "50대" }, { label: "60대+", value: "60대+" },
  ]);
  bindChips(document.getElementById("chips-cat"), "category", [
    { label: "주거", value: "주거" }, { label: "취업", value: "취업" }, { label: "출산", value: "출산" },
    { label: "창업", value: "창업" }, { label: "노후", value: "노후" },
  ]);

  const searchInput = document.getElementById("search-input");
  let t; searchInput.addEventListener("input", () => {
    clearTimeout(t); t = setTimeout(() => { state.query = searchInput.value.trim(); render(); }, 180);
  });

  const cardsEl = document.getElementById("cards");
  const countEl = document.getElementById("count");
  const emptyEl = document.getElementById("empty");

  function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[m])); }

  async function render() {
    const list = await window.JiwonData.fetchPrograms(state);
    countEl.textContent = list.length;
    if (!list.length) { cardsEl.innerHTML = ""; emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    cardsEl.innerHTML = list.map((p) => `
      <article class="card">
        <div class="card__top">
          <span class="tag">${esc(p.category || "기타")}</span>
          <span class="tag tag--region">${esc(p.region_name)}</span>
          <span class="tag tag--region">${esc(p.benefit_type || "")}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.summary)}</p>
        <div class="card__meta">
          <span>지원금액 <b>${esc(p.amount_text)}</b></span>
          <span>대상 <b>${esc(p.target_summary)}</b></span>
          <span>신청 <b>${esc(p.deadline_text)}</b></span>
        </div>
        <a class="btn" href="${esc(p.apply_url)}" target="_blank" rel="noopener nofollow sponsored">
          신청·자세히 보기 →
        </a>
      </article>`).join("");
  }

  render();
})();
