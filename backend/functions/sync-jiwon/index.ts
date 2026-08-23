// ============================================================
// sync-jiwon — 보조금24(대한민국 공공서비스 정보) → jiwon_programs 동기화
//
// API: https://api.odcloud.kr/api/gov24/v3
//   - /serviceList        서비스 목록 (한글 키 JSON)
//   - /supportConditions  지원조건 (JA 코드: JA0110=연령시작, JA0111=연령종료)
//
// 필요한 시크릿 (supabase secrets set):
//   DATA_GO_KR_KEY  공공데이터포털 일반 인증키(Decoding)
//
// 호출:
//   POST /functions/v1/sync-jiwon            → 전체 동기화
//   GET  /functions/v1/sync-jiwon?probe=1    → 원본 응답 1페이지 그대로 반환(필드 매핑 검증용)
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const GOV24_BASE = "https://api.odcloud.kr/api/gov24/v3";
const PER_PAGE = 500;
const MAX_PAGES = 30; // 안전장치 (500 × 30 = 최대 15,000건)

// 여러 후보 키 중 첫 번째로 값이 있는 것을 선택 (버전에 따라 키 이름이 다를 수 있음)
function pick(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

// 시·도명 → 지역코드 (프론트 칩과 동일 체계: 행정표준코드 앞 2자리)
const REGION_MAP: [string, string, string][] = [
  ["서울", "11", "서울"], ["부산", "26", "부산"], ["대구", "27", "대구"],
  ["인천", "28", "인천"], ["광주", "29", "광주"], ["대전", "30", "대전"],
  ["울산", "31", "울산"], ["세종", "36", "세종"], ["경기", "41", "경기"],
  ["강원", "42", "강원"], ["충청북", "43", "충북"], ["충북", "43", "충북"],
  ["충청남", "44", "충남"], ["충남", "44", "충남"], ["전라북", "45", "전북"],
  ["전북", "45", "전북"], ["전라남", "46", "전남"], ["전남", "46", "전남"],
  ["경상북", "47", "경북"], ["경북", "47", "경북"], ["경상남", "48", "경남"],
  ["경남", "48", "경남"], ["제주", "50", "제주"],
];

// 서비스분야 → 프론트 5개 카테고리
function toCategory(field: string | null, name: string, target: string): string {
  const hay = `${field ?? ""} ${name} ${target}`;
  if (/주거|임대|월세|전세|부동산/.test(hay)) return "주거";
  if (/고용|취업|일자리|구직|실업/.test(hay)) return "취업";
  if (/임신|출산|보육|육아|아동|영유아/.test(hay)) return "출산";
  if (/창업|벤처|소상공인|기업/.test(hay)) return "창업";
  if (/노인|어르신|노후|연금|장년/.test(hay)) return "노후";
  return "기타";
}

function toRegion(ministry: string | null, orgType: string | null): { code: string; name: string } {
  // 지자체 소관이면 기관명에서 시·도 추출, 아니면 전국
  if (orgType && /지자체|지방/.test(orgType) && ministry) {
    for (const [prefix, code, name] of REGION_MAP) {
      if (ministry.startsWith(prefix)) return { code, name };
    }
  }
  return { code: "00", name: "전국" };
}

function truncate(s: string | null, n: number): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

// ★ 핵심 매핑: 보조금24 원본 row → jiwon_programs 컬럼
//   probe=1 로 실제 응답 키를 확인한 뒤 후보 키를 추가/조정하면 됨
function mapRow(row: Record<string, unknown>, cond?: Record<string, unknown>) {
  const serviceId = pick(row, "서비스ID", "svcId", "serviceId");
  const name = pick(row, "서비스명", "servNm", "serviceName");
  if (!serviceId || !name) return null;

  const ministry = pick(row, "소관기관명", "소관부처명", "jurMnofNm");
  const orgType = pick(row, "소관기관유형", "srvPvsnNm");
  const target = pick(row, "지원대상", "sprtTrgtCn") ?? "";
  const field = pick(row, "서비스분야", "intrsThemaArray");
  const { code: region_code, name: region_name } = toRegion(ministry, orgType);

  const ageMin = cond ? Number(pick(cond, "JA0110", "age_min")) : NaN;
  const ageMax = cond ? Number(pick(cond, "JA0111", "age_max")) : NaN;

  const summary = pick(row, "서비스목적요약", "서비스목적", "svcPurpsSumry");
  const category = toCategory(field, name, target);

  return {
    service_id: serviceId,
    name,
    summary: truncate(summary, 140),
    ministry,
    region_code,
    region_name,
    category,
    age_min: Number.isFinite(ageMin) && ageMin > 0 ? ageMin : null,
    age_max: Number.isFinite(ageMax) && ageMax > 0 && ageMax < 200 ? ageMax : null,
    benefit_type: truncate(pick(row, "지원유형", "sprtWlfareTypeNm"), 20),
    amount_text: truncate(pick(row, "지원내용", "alwServCn"), 120),
    apply_method: truncate(pick(row, "신청방법", "aplyMtdNm"), 80),
    apply_url:
      pick(row, "온라인신청사이트URL", "onlineAplyUrl") ??
      pick(row, "상세조회URL", "servDtlLink") ??
      "https://www.gov.kr/portal/rcvfvrSvc/main",
    deadline_text: truncate(pick(row, "신청기한", "aplyPrdCn"), 60) ?? "상시",
    target_summary: truncate(target, 80),
    keywords: [name, summary, category, region_name, ministry, target]
      .filter(Boolean).join(" ").slice(0, 500),
    raw: row,
  };
}

async function fetchPage(path: string, key: string, page: number) {
  const url = `${GOV24_BASE}/${path}?page=${page}&perPage=${PER_PAGE}&serviceKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} p${page} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

Deno.serve(async (req: Request) => {
  try {
    const key = Deno.env.get("DATA_GO_KR_KEY");
    if (!key) {
      return Response.json(
        { error: "DATA_GO_KR_KEY 시크릿이 없습니다. `supabase secrets set DATA_GO_KR_KEY=...` 후 다시 호출하세요." },
        { status: 500 },
      );
    }

    const probe = new URL(req.url).searchParams.get("probe");
    if (probe) {
      // 실제 응답 원본을 그대로 반환 → mapRow 후보 키 검증용
      const [list, conds] = await Promise.all([
        fetchPage("serviceList", key, 1),
        fetchPage("supportConditions", key, 1).catch((e) => ({ error: String(e) })),
      ]);
      return Response.json({ serviceList_page1: list, supportConditions_page1: conds });
    }

    // 1) 지원조건 전체 → 서비스ID 맵 (연령)
    const condMap = new Map<string, Record<string, unknown>>();
    try {
      for (let p = 1; p <= MAX_PAGES; p++) {
        const j = await fetchPage("supportConditions", key, p);
        const rows: Record<string, unknown>[] = j.data ?? [];
        for (const r of rows) {
          const id = pick(r, "서비스ID", "svcId");
          if (id) condMap.set(id, r);
        }
        if (rows.length < PER_PAGE) break;
      }
    } catch (_e) { /* 지원조건 실패해도 목록 동기화는 진행 */ }

    // 2) 서비스 목록 → 매핑 → upsert
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let total = 0, upserted = 0;
    for (let p = 1; p <= MAX_PAGES; p++) {
      const j = await fetchPage("serviceList", key, p);
      const rows: Record<string, unknown>[] = j.data ?? [];
      total += rows.length;

      const mapped = rows
        .map((r) => mapRow(r, condMap.get(pick(r, "서비스ID", "svcId") ?? "")))
        .filter(Boolean);

      if (mapped.length) {
        const { error, count } = await supabase
          .from("jiwon_programs")
          .upsert(mapped as object[], { onConflict: "service_id", count: "exact" });
        if (error) throw new Error(`upsert p${p}: ${error.message}`);
        upserted += count ?? mapped.length;
      }
      if (rows.length < PER_PAGE) break;
    }

    return Response.json({ ok: true, fetched: total, upserted, conditions: condMap.size });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
