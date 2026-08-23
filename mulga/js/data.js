/* ============================================================
   데이터 계층 — 물가 (참가격)
   Supabase mulga_latest 뷰에서 읽고, 비어있거나 오류면 목업 폴백.
   ============================================================ */
const USE_SUPABASE = true;
const SUPABASE_URL = "https://eumocvkejlbfsemmkmwr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zgdBuyXoImCALVMlFw4LJg_XT9fcNvY";

/* 목업: mulga_latest 뷰와 동일 구조 */
const MOCK_PRICES = [
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

let _sb = null;
function sb() {
  if (!_sb && USE_SUPABASE) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

/* {category, store, query} → 상품 요약 배열 */
async function fetchPrices({ category, store, query } = {}) {
  if (USE_SUPABASE) {
    try {
      let q;
      if (store) {
        // 판매처 필터는 원본 테이블에서 (뷰는 채널 구분이 없음)
        q = sb().from("mulga_prices")
          .select("good_id, good_name, category, unit, price, entp_type, inspect_day")
          .eq("entp_type", store)
          .order("inspect_day", { ascending: false })
          .limit(200);
      } else {
        q = sb().from("mulga_latest").select("*").limit(120);
      }
      if (category) q = q.eq("category", category);
      if (query) q = q.ilike("good_name", `%${query}%`);
      const { data, error } = await q;
      if (!error && data && data.length) {
        if (!store) return data;
        // 판매처 필터: 같은 상품 여러 행 → 상품별 요약으로 접기
        const byGood = new Map();
        for (const r of data) {
          const g = byGood.get(r.good_id) ?? { ...r, prices: [] };
          g.prices.push(r.price);
          byGood.set(r.good_id, g);
        }
        return [...byGood.values()].map((g) => ({
          good_id: g.good_id, good_name: g.good_name, category: g.category, unit: g.unit,
          avg_price: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length),
          min_price: Math.min(...g.prices), max_price: Math.max(...g.prices),
          store_count: g.prices.length, inspect_day: g.inspect_day,
        }));
      }
      if (error) console.warn("supabase fallback:", error.message);
    } catch (e) { console.warn("supabase fallback:", e); }
  }

  return MOCK_PRICES.filter((p) => {
    if (category && p.category !== category) return false;
    if (query && !p.good_name.includes(query)) return false;
    return true;
  });
}

window.MulgaData = { fetchPrices };
