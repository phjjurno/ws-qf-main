/* ============================================================
   데이터 계층 — 지원금
   USE_SUPABASE=false 면 목업으로 즉시 동작(키 없이 데모 가능).
   실서비스 전환: 아래 SUPABASE_URL/ANON_KEY 채우고 USE_SUPABASE=true.
   Supabase 는 anon 키를 노출해도 됨 (RLS 로 읽기만 허용됨).
   ============================================================ */
const USE_SUPABASE = true; // 테이블이 비었거나 오류면 자동으로 목업 폴백
const SUPABASE_URL = "https://eumocvkejlbfsemmkmwr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zgdBuyXoImCALVMlFw4LJg_XT9fcNvY";

/* 목업: 실제 보조금24 필드 구조와 동일하게 맞춤 */
const MOCK_PROGRAMS = [
  { service_id:"m1", name:"청년월세 특별지원", summary:"무주택 청년에게 월 최대 20만원 임대료 지원", ministry:"국토교통부",
    region_code:"00", region_name:"전국", category:"주거", age_min:19, age_max:34, benefit_type:"현금",
    amount_text:"월 20만원 · 최대 12개월", apply_method:"복지로 온라인 신청", apply_url:"https://www.bokjiro.go.kr",
    deadline_text:"상시", target_summary:"만 19~34세 무주택 청년" },
  { service_id:"m2", name:"첫만남이용권", summary:"출생아 1인당 200만원 바우처 지급", ministry:"보건복지부",
    region_code:"00", region_name:"전국", category:"출산", age_min:null, age_max:null, benefit_type:"현물",
    amount_text:"200만원 (둘째 이상 300만원)", apply_method:"주민센터·복지로", apply_url:"https://www.bokjiro.go.kr",
    deadline_text:"출생 후 1년 이내", target_summary:"2022년 이후 출생아 보호자" },
  { service_id:"m3", name:"국민취업지원제도", summary:"구직자에게 최대 300만원 구직촉진수당", ministry:"고용노동부",
    region_code:"00", region_name:"전국", category:"취업", age_min:15, age_max:69, benefit_type:"현금",
    amount_text:"월 50만원 × 6개월", apply_method:"고용24 온라인 신청", apply_url:"https://www.work24.go.kr",
    deadline_text:"상시", target_summary:"15~69세 미취업자" },
  { service_id:"m4", name:"청년창업사관학교", summary:"예비창업자 사업화 자금 최대 1억원", ministry:"중소벤처기업부",
    region_code:"00", region_name:"전국", category:"창업", age_min:20, age_max:39, benefit_type:"현금",
    amount_text:"최대 1억원 사업화 자금", apply_method:"창업진흥원 공고", apply_url:"https://www.k-startup.go.kr",
    deadline_text:"연 1회 모집", target_summary:"만 39세 이하 예비창업자" },
  { service_id:"m5", name:"서울 청년수당", summary:"미취업 청년에게 월 50만원 활동지원금", ministry:"서울특별시",
    region_code:"11", region_name:"서울", category:"취업", age_min:19, age_max:34, benefit_type:"현금",
    amount_text:"월 50만원 × 6개월", apply_method:"청년몽땅정보통", apply_url:"https://youth.seoul.go.kr",
    deadline_text:"연 상반기 모집", target_summary:"서울 거주 만 19~34세 미취업 청년" },
  { service_id:"m6", name:"부산 청년 기쁨두배통장", summary:"저축액 2배 매칭 지원", ministry:"부산광역시",
    region_code:"26", region_name:"부산", category:"주거", age_min:18, age_max:34, benefit_type:"현금",
    amount_text:"월 저축 10~15만원 2배 매칭", apply_method:"부산복지넷", apply_url:"https://www.busan.go.kr",
    deadline_text:"연 1회 모집", target_summary:"부산 거주 근로 청년" },
  { service_id:"m7", name:"출산가구 전기요금 감면", summary:"영아 양육가구 전기요금 30% 감면", ministry:"한국전력",
    region_code:"00", region_name:"전국", category:"출산", age_min:null, age_max:null, benefit_type:"감면",
    amount_text:"월 최대 1.6만원 감면", apply_method:"한전 고객센터·온라인", apply_url:"https://cyber.kepco.co.kr",
    deadline_text:"영아 3세 미만", target_summary:"36개월 미만 영아 양육가구" },
  { service_id:"m8", name:"노인 기초연금", summary:"만 65세 이상 소득하위 70% 매월 지급", ministry:"보건복지부",
    region_code:"00", region_name:"전국", category:"노후", age_min:65, age_max:null, benefit_type:"현금",
    amount_text:"월 최대 34만원", apply_method:"주민센터·복지로", apply_url:"https://www.bokjiro.go.kr",
    deadline_text:"상시", target_summary:"만 65세 이상 소득하위 70%" }
];

let _sb = null;
function sb() {
  if (!_sb && USE_SUPABASE) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

/* 진단 필터: {region, ageBand, category, query} → 지원금 배열 */
async function fetchPrograms({ region, ageBand, category, query } = {}) {
  const age = ageBandToNumber(ageBand);

  if (USE_SUPABASE) {
    // Supabase 실쿼리 (RLS 읽기전용) — 오류·빈 테이블이면 목업으로 폴백
    try {
      let q = sb().from("jiwon_programs").select("*").limit(60);
      if (region && region !== "00") q = q.in("region_code", [region, "00"]);
      if (category) q = q.eq("category", category);
      if (query) q = q.ilike("keywords", `%${query}%`);
      const { data, error } = await q;
      if (!error && data && data.length) {
        return data.filter((p) => {
          if (age == null) return true;
          if (p.age_min != null && age < p.age_min) return false;
          if (p.age_max != null && age > p.age_max) return false;
          return true;
        });
      }
      if (error) console.warn("supabase fallback:", error.message);
    } catch (e) { console.warn("supabase fallback:", e); }
  }

  {
    return MOCK_PROGRAMS.filter((p) => {
      if (region && region !== "00" && p.region_code !== region && p.region_code !== "00") return false;
      if (category && p.category !== category) return false;
      if (age != null) {
        if (p.age_min != null && age < p.age_min) return false;
        if (p.age_max != null && age > p.age_max) return false;
      }
      if (query) {
        const hay = (p.name + p.summary + p.category + p.region_name);
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }
}

function ageBandToNumber(band) {
  return { "10대":15, "20대":25, "30대":35, "40대":45, "50대":55, "60대+":65 }[band] ?? null;
}

window.JiwonData = { fetchPrograms };
