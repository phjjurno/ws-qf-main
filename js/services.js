/* ============================================================
   services.js — 메인 페이지에 통합된 지원금·물가 기능
   PDF 도구와 같은 페이지에서 동작하도록 ID를 jiwon-/mulga- 로 스코프.
   Supabase 테이블이 비었거나 오류면 목업으로 폴백.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = "https://eumocvkejlbfsemmkmwr.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_zgdBuyXoImCALVMlFw4LJg_XT9fcNvY";

  var _sb = null;
  function sb() {
    if (!_sb && window.supabase) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _sb;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }

  /* ---------------- 지원금 데이터 ---------------- */
  var MOCK_PROGRAMS = [
    { service_id:"m1", name:"청년월세 특별지원", summary:"무주택 청년에게 월 최대 20만원 임대료 지원", ministry:"국토교통부", region_code:"00", region_name:"전국", category:"주거", age_min:19, age_max:34, benefit_type:"현금", amount_text:"월 20만원 · 최대 12개월", apply_url:"https://www.bokjiro.go.kr", deadline_text:"상시", target_summary:"만 19~34세 무주택 청년" },
    { service_id:"m2", name:"첫만남이용권", summary:"출생아 1인당 200만원 바우처 지급", ministry:"보건복지부", region_code:"00", region_name:"전국", category:"출산", age_min:null, age_max:null, benefit_type:"현물", amount_text:"200만원 (둘째 이상 300만원)", apply_url:"https://www.bokjiro.go.kr", deadline_text:"출생 후 1년 이내", target_summary:"2022년 이후 출생아 보호자" },
    { service_id:"m3", name:"국민취업지원제도", summary:"구직자에게 최대 300만원 구직촉진수당", ministry:"고용노동부", region_code:"00", region_name:"전국", category:"취업", age_min:15, age_max:69, benefit_type:"현금", amount_text:"월 50만원 × 6개월", apply_url:"https://www.work24.go.kr", deadline_text:"상시", target_summary:"15~69세 미취업자" },
    { service_id:"m4", name:"청년창업사관학교", summary:"예비창업자 사업화 자금 최대 1억원", ministry:"중소벤처기업부", region_code:"00", region_name:"전국", category:"창업", age_min:20, age_max:39, benefit_type:"현금", amount_text:"최대 1억원 사업화 자금", apply_url:"https://www.k-startup.go.kr", deadline_text:"연 1회 모집", target_summary:"만 39세 이하 예비창업자" },
    { service_id:"m5", name:"서울 청년수당", summary:"미취업 청년에게 월 50만원 활동지원금", ministry:"서울특별시", region_code:"11", region_name:"서울", category:"취업", age_min:19, age_max:34, benefit_type:"현금", amount_text:"월 50만원 × 6개월", apply_url:"https://youth.seoul.go.kr", deadline_text:"연 상반기 모집", target_summary:"서울 거주 만 19~34세 미취업 청년" },
    { service_id:"m6", name:"부산 청년 기쁨두배통장", summary:"저축액 2배 매칭 지원", ministry:"부산광역시", region_code:"26", region_name:"부산", category:"주거", age_min:18, age_max:34, benefit_type:"현금", amount_text:"월 저축 10~15만원 2배 매칭", apply_url:"https://www.busan.go.kr", deadline_text:"연 1회 모집", target_summary:"부산 거주 근로 청년" },
    { service_id:"m7", name:"출산가구 전기요금 감면", summary:"영아 양육가구 전기요금 30% 감면", ministry:"한국전력", region_code:"00", region_name:"전국", category:"출산", age_min:null, age_max:null, benefit_type:"감면", amount_text:"월 최대 1.6만원 감면", apply_url:"https://cyber.kepco.co.kr", deadline_text:"영아 3세 미만", target_summary:"36개월 미만 영아 양육가구" },
    { service_id:"m8", name:"노인 기초연금", summary:"만 65세 이상 소득하위 70% 매월 지급", ministry:"보건복지부", region_code:"00", region_name:"전국", category:"노후", age_min:65, age_max:null, benefit_type:"현금", amount_text:"월 최대 34만원", apply_url:"https://www.bokjiro.go.kr", deadline_text:"상시", target_summary:"만 65세 이상 소득하위 70%" }
  ];
  function ageBandToNumber(band) {
    return { "10대":15, "20대":25, "30대":35, "40대":45, "50대":55, "60대+":65 }[band] || null;
  }
  async function fetchPrograms(state) {
    state = state || {};
    var age = ageBandToNumber(state.ageBand);
    if (sb()) {
      try {
        var q = sb().from("jiwon_programs").select("*").limit(60);
        if (state.region && state.region !== "00") q = q.in("region_code", [state.region, "00"]);
        if (state.category) q = q.eq("category", state.category);
        if (state.query) q = q.ilike("keywords", "%" + state.query + "%");
        var r = await q;
        if (!r.error && r.data && r.data.length) {
          return r.data.filter(function (p) {
            if (age == null) return true;
            if (p.age_min != null && age < p.age_min) return false;
            if (p.age_max != null && age > p.age_max) return false;
            return true;
          });
        }
      } catch (e) { /* 폴백 */ }
    }
    return MOCK_PROGRAMS.filter(function (p) {
      if (state.region && state.region !== "00" && p.region_code !== state.region && p.region_code !== "00") return false;
      if (state.category && p.category !== state.category) return false;
      if (age != null) {
        if (p.age_min != null && age < p.age_min) return false;
        if (p.age_max != null && age > p.age_max) return false;
      }
      if (state.query && (p.name + p.summary + p.category + p.region_name).indexOf(state.query) === -1) return false;
      return true;
    });
  }

  /* ---------------- 물가 데이터 ---------------- */
  var MOCK_PRICES = [
    { good_id:"p1", good_name:"삼겹살 (국내산)", category:"축산물", unit:"500g", avg_price:14890, min_price:12900, max_price:16900, store_count:24, inspect_day:"2026-07-10" },
    { good_id:"p2", good_name:"계란 (특란 30구)", category:"축산물", unit:"30개", avg_price:7480, min_price:6480, max_price:8900, store_count:31, inspect_day:"2026-07-10" },
    { good_id:"p3", good_name:"신라면 (멀티팩)", category:"가공식품", unit:"5개입", avg_price:4350, min_price:3780, max_price:5200, store_count:40, inspect_day:"2026-07-10" },
    { good_id:"p4", good_name:"서울우유 1L", category:"가공식품", unit:"1L", avg_price:3120, min_price:2850, max_price:3500, store_count:38, inspect_day:"2026-07-10" },
    { good_id:"p5", good_name:"쌀 (20kg)", category:"농산물", unit:"20kg", avg_price:58900, min_price:52000, max_price:64900, store_count:18, inspect_day:"2026-07-10" },
    { good_id:"p6", good_name:"고등어 (생물)", category:"수산물", unit:"1마리", avg_price:4890, min_price:3900, max_price:5900, store_count:15, inspect_day:"2026-07-10" },
    { good_id:"p7", good_name:"양파 (1.5kg)", category:"농산물", unit:"1.5kg", avg_price:3480, min_price:2900, max_price:4200, store_count:22, inspect_day:"2026-07-10" },
    { good_id:"p8", good_name:"화장지 (30롤)", category:"생활용품", unit:"30롤", avg_price:16900, min_price:13900, max_price:19800, store_count:27, inspect_day:"2026-07-10" },
    { good_id:"p9", good_name:"참치캔 (150g)", category:"가공식품", unit:"150g", avg_price:2680, min_price:2280, max_price:3100, store_count:35, inspect_day:"2026-07-10" },
    { good_id:"p10", good_name:"세탁세제 (2.7L)", category:"생활용품", unit:"2.7L", avg_price:12400, min_price:9900, max_price:14900, store_count:20, inspect_day:"2026-07-10" }
  ];
  async function fetchPrices(state) {
    state = state || {};
    if (sb()) {
      try {
        var q;
        if (state.store) {
          q = sb().from("mulga_prices").select("good_id, good_name, category, unit, price, entp_type, inspect_day")
            .eq("entp_type", state.store).order("inspect_day", { ascending: false }).limit(200);
        } else {
          q = sb().from("mulga_latest").select("*").limit(120);
        }
        if (state.category) q = q.eq("category", state.category);
        if (state.query) q = q.ilike("good_name", "%" + state.query + "%");
        var r = await q;
        if (!r.error && r.data && r.data.length) {
          if (!state.store) return r.data;
          var byGood = {};
          r.data.forEach(function (row) {
            var g = byGood[row.good_id] || { good_id: row.good_id, good_name: row.good_name, category: row.category, unit: row.unit, inspect_day: row.inspect_day, prices: [] };
            g.prices.push(row.price); byGood[row.good_id] = g;
          });
          return Object.keys(byGood).map(function (k) {
            var g = byGood[k];
            return { good_id:g.good_id, good_name:g.good_name, category:g.category, unit:g.unit,
              avg_price: Math.round(g.prices.reduce(function(a,b){return a+b;},0)/g.prices.length),
              min_price: Math.min.apply(null, g.prices), max_price: Math.max.apply(null, g.prices),
              store_count: g.prices.length, inspect_day: g.inspect_day };
          });
        }
      } catch (e) { /* 폴백 */ }
    }
    return MOCK_PRICES.filter(function (p) {
      if (state.category && p.category !== state.category) return false;
      if (state.query && p.good_name.indexOf(state.query) === -1) return false;
      return true;
    });
  }

  /* ---------------- 공용 칩 바인딩 ---------------- */
  function bindChips(groupEl, state, key, defaultVal, opts, onChange) {
    opts.forEach(function (opt, i) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = opt.label;
      b.setAttribute("aria-pressed", state[key] === opt.value ? "true" : "false");
      b.addEventListener("click", function () {
        state[key] = state[key] === opt.value ? defaultVal : opt.value;
        Array.prototype.forEach.call(groupEl.children, function (c, j) {
          c.setAttribute("aria-pressed", state[key] === opts[j].value ? "true" : "false");
        });
        onChange();
      });
      groupEl.appendChild(b);
    });
  }
  function debounce(fn) { var t; return function () { clearTimeout(t); t = setTimeout(fn, 180); }; }
  function won(n) { return n == null ? "-" : Number(n).toLocaleString("ko-KR") + "원"; }

  /* ---------------- 지원금 UI ---------------- */
  function initJiwon() {
    if (!document.getElementById("jiwon-chips-region")) return;
    var state = { region: "00", ageBand: null, category: null, query: "" };
    bindChips(document.getElementById("jiwon-chips-region"), state, "region", "00", [
      { label:"전국", value:"00" }, { label:"서울", value:"11" }, { label:"부산", value:"26" },
      { label:"인천", value:"28" }, { label:"대구", value:"27" }, { label:"경기", value:"41" }
    ], render);
    bindChips(document.getElementById("jiwon-chips-age"), state, "ageBand", null, [
      { label:"10대", value:"10대" }, { label:"20대", value:"20대" }, { label:"30대", value:"30대" },
      { label:"40대", value:"40대" }, { label:"50대", value:"50대" }, { label:"60대+", value:"60대+" }
    ], render);
    bindChips(document.getElementById("jiwon-chips-cat"), state, "category", null, [
      { label:"주거", value:"주거" }, { label:"취업", value:"취업" }, { label:"출산", value:"출산" },
      { label:"창업", value:"창업" }, { label:"노후", value:"노후" }
    ], render);

    var input = document.getElementById("jiwon-search");
    input.addEventListener("input", debounce(function () { state.query = input.value.trim(); render(); }));

    var cardsEl = document.getElementById("jiwon-cards");
    var countEl = document.getElementById("jiwon-count");
    var emptyEl = document.getElementById("jiwon-empty");

    async function render() {
      var list = await fetchPrograms(state);
      countEl.textContent = list.length;
      if (!list.length) { cardsEl.innerHTML = ""; emptyEl.hidden = false; return; }
      emptyEl.hidden = true;
      cardsEl.innerHTML = list.map(function (p) {
        return '<article class="svc-card">' +
          '<div class="svc-card__top"><span class="tag">' + esc(p.category || "기타") + '</span>' +
          '<span class="tag tag--muted">' + esc(p.region_name) + '</span>' +
          (p.benefit_type ? '<span class="tag tag--muted">' + esc(p.benefit_type) + '</span>' : '') + '</div>' +
          '<h3>' + esc(p.name) + '</h3><p>' + esc(p.summary) + '</p>' +
          '<div class="svc-card__meta">' +
          '<span>지원금액 <b>' + esc(p.amount_text) + '</b></span>' +
          '<span>대상 <b>' + esc(p.target_summary) + '</b></span>' +
          '<span>신청 <b>' + esc(p.deadline_text) + '</b></span></div>' +
          '<a class="svc-btn" href="' + esc(p.apply_url) + '" target="_blank" rel="noopener nofollow">신청·자세히 보기 →</a>' +
          '</article>';
      }).join("");
    }
    render();
  }

  /* ---------------- 물가 UI ---------------- */
  function initMulga() {
    if (!document.getElementById("mulga-chips-cat")) return;
    var state = { category: null, store: null, query: "" };
    bindChips(document.getElementById("mulga-chips-cat"), state, "category", null, [
      { label:"축산물", value:"축산물" }, { label:"수산물", value:"수산물" }, { label:"농산물", value:"농산물" },
      { label:"가공식품", value:"가공식품" }, { label:"생활용품", value:"생활용품" }
    ], render);
    bindChips(document.getElementById("mulga-chips-store"), state, "store", null, [
      { label:"대형마트", value:"대형마트" }, { label:"백화점", value:"백화점" }, { label:"SSM", value:"SSM" },
      { label:"전통시장", value:"전통시장" }, { label:"편의점", value:"편의점" }
    ], render);

    var input = document.getElementById("mulga-search");
    input.addEventListener("input", debounce(function () { state.query = input.value.trim(); render(); }));

    var cardsEl = document.getElementById("mulga-cards");
    var countEl = document.getElementById("mulga-count");
    var emptyEl = document.getElementById("mulga-empty");
    var dayEl = document.getElementById("mulga-day");

    async function render() {
      var list = await fetchPrices(state);
      countEl.textContent = list.length;
      dayEl.textContent = (list[0] && list[0].inspect_day) ? "조사일 " + list[0].inspect_day : "";
      if (!list.length) { cardsEl.innerHTML = ""; emptyEl.hidden = false; return; }
      emptyEl.hidden = true;
      cardsEl.innerHTML = list.map(function (p) {
        return '<article class="svc-card">' +
          '<div class="svc-card__top"><span class="tag">' + esc(p.category || "기타") + '</span>' +
          (p.unit ? '<span class="tag tag--muted">' + esc(p.unit) + '</span>' : '') + '</div>' +
          '<h3>' + esc(p.good_name) + '</h3>' +
          '<p class="svc-price"><span class="svc-price__avg">' + won(p.avg_price) + '</span>' +
          '<span class="svc-price__range">최저 ' + won(p.min_price) + ' · 최고 ' + won(p.max_price) + '</span></p>' +
          '<div class="svc-card__meta"><span>조사 판매점 <b>' + esc(p.store_count || "-") + '곳</b></span>' +
          '<span>조사일 <b>' + esc(p.inspect_day || "-") + '</b></span></div>' +
          '</article>';
      }).join("");
    }
    render();
  }

  /* ---------------- 허브 밴드 카드 → 탭 전환 ---------------- */
  function wireHubBand() {
    document.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var name = el.getAttribute("data-goto");
        if (window.App && App.selectTab) App.selectTab(name);
        var panel = document.getElementById("panel-" + name);
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function start() { initJiwon(); initMulga(); wireHubBand(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
