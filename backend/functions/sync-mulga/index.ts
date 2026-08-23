// ============================================================
// sync-mulga — 참가격(한국소비자원 생필품 가격 정보) → mulga_prices 동기화
//
// API: http://openapi.price.go.kr/openApiImpl/ProductPriceInfoService (XML)
//   - getProductPriceInfoSvc.do  상품 판매가격 조회 (goodInspectDay 기준)
//   - getProductInfoSvc.do       상품 기본정보 조회
//   ※ 오퍼레이션 경로가 다르면 MULGA_ENDPOINT 시크릿으로 덮어쓸 수 있음
//
// 필요한 시크릿:
//   DATA_GO_KR_KEY   공공데이터포털 일반 인증키(Decoding)
//   MULGA_ENDPOINT   (선택) 전체 엔드포인트 URL 덮어쓰기
//
// 호출:
//   POST /functions/v1/sync-mulga             → 최근 조사일 데이터 동기화
//   GET  /functions/v1/sync-mulga?probe=1     → 원본 XML 응답 그대로 반환(필드 매핑 검증용)
//   POST /functions/v1/sync-mulga?day=20260710 → 특정 조사일 지정
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_ENDPOINT =
  "http://openapi.price.go.kr/openApiImpl/ProductPriceInfoService/getProductPriceInfoSvc.do";

// 참가격 조사(주 1회, 금요일) — 최근 금요일 YYYYMMDD
function latestFriday(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 5 = Friday
  const diff = (day - 5 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

// XML <item>…</item> 블록을 객체 배열로 (외부 파서 없이 방어적으로)
function parseItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of blocks) {
    const obj: Record<string, string> = {};
    const tags = block.matchAll(/<([A-Za-z_][\w]*)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g);
    for (const [, tag, val] of tags) obj[tag] = val.trim();
    items.push(obj);
  }
  return items;
}

function pick(row: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return null;
}

const ENTP_TYPE: Record<string, string> = {
  "1": "대형마트", "2": "백화점", "3": "SSM", "4": "전통시장", "5": "편의점",
  MT: "대형마트", DP: "백화점", SM: "SSM", TM: "전통시장", CS: "편의점",
};

// ★ 핵심 매핑: 참가격 원본 item → mulga_prices 컬럼
//   probe=1 로 실제 XML 태그명을 확인한 뒤 후보 키를 추가/조정하면 됨
function mapPrice(row: Record<string, string>) {
  const goodId = pick(row, "goodId", "good_id", "goodsId");
  const goodName = pick(row, "goodName", "good_name", "goodsName");
  const priceRaw = pick(row, "goodPrice", "price", "goodSalePrice", "salePrice");
  if (!goodId || !goodName || !priceRaw) return null;

  const price = parseInt(priceRaw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(price) || price <= 0) return null;

  const dayRaw = pick(row, "goodInspectDay", "inspectDay", "researchDate"); // YYYYMMDD
  const inspect_day = dayRaw && /^\d{8}$/.test(dayRaw)
    ? `${dayRaw.slice(0, 4)}-${dayRaw.slice(4, 6)}-${dayRaw.slice(6, 8)}`
    : null;

  const typeRaw = pick(row, "entpTypeCode", "entpTypeName", "entp_type") ?? "";
  const totalCnt = pick(row, "goodTotalCnt", "goodBaseCnt");
  const totalDiv = pick(row, "goodTotalDivCode", "goodUnitDivCode");

  return {
    good_id: goodId,
    good_name: goodName,
    category: pick(row, "goodSmlclsName", "goodLclsName", "clsName"),
    unit: totalCnt ? `${totalCnt}${totalDiv ?? ""}` : pick(row, "goodUnitAmtName", "unit"),
    price,
    entp_name: pick(row, "entpName", "entpNm", "entp_name") ?? "미상",
    entp_type: ENTP_TYPE[typeRaw] ?? (typeRaw || null),
    region: pick(row, "entpAreaName", "areaName", "region"),
    inspect_day,
    raw: row,
  };
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

    const url = new URL(req.url);
    const day = url.searchParams.get("day") ?? latestFriday();
    const endpoint = Deno.env.get("MULGA_ENDPOINT") ?? DEFAULT_ENDPOINT;
    const apiUrl = `${endpoint}?serviceKey=${encodeURIComponent(key)}&goodInspectDay=${day}`;

    const res = await fetch(apiUrl);
    const xml = await res.text();

    if (url.searchParams.get("probe")) {
      // 원본 응답 그대로 반환 → mapPrice 후보 키 검증용
      return new Response(xml.slice(0, 20000), {
        status: res.ok ? 200 : 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (!res.ok) {
      return Response.json(
        { error: `참가격 API HTTP ${res.status}`, hint: "MULGA_ENDPOINT 시크릿으로 엔드포인트를 조정하거나 ?probe=1 로 응답을 확인하세요.", body: xml.slice(0, 500) },
        { status: 502 },
      );
    }

    const items = parseItems(xml);
    const mapped = items.map(mapPrice).filter(Boolean) as object[];

    if (!mapped.length) {
      return Response.json(
        { ok: false, fetched: items.length, upserted: 0, hint: "매핑된 행이 0건입니다. ?probe=1 로 실제 태그명을 확인해 mapPrice 후보 키를 조정하세요.", sampleRaw: items[0] ?? null },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let upserted = 0;
    for (let i = 0; i < mapped.length; i += 500) {
      const chunk = mapped.slice(i, i + 500);
      const { error, count } = await supabase
        .from("mulga_prices")
        .upsert(chunk, { onConflict: "good_id,entp_name,inspect_day", count: "exact" });
      if (error) throw new Error(`upsert: ${error.message}`);
      upserted += count ?? chunk.length;
    }

    return Response.json({ ok: true, day, fetched: items.length, upserted, sample: mapped[0] });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
