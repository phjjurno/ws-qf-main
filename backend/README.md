# wsQf backend — 지원금(jiwon) · 물가(mulga)

Supabase 프로젝트 `eumocvkejlbfsemmkmwr` (shutress와 공용) 기준.

## 구성

```
schema.sql                  # jiwon_programs, mulga_prices, mulga_latest 뷰 + RLS
functions/sync-jiwon/       # 보조금24 → jiwon_programs 동기화 Edge Function
functions/sync-mulga/       # 참가격 → mulga_prices 동기화 Edge Function
```

## 남은 설정 (딱 1가지)

Edge Function이 공공데이터포털 API를 호출하려면 인증키가 필요합니다.

1. [공공데이터포털](https://www.data.go.kr) 로그인 → 아래 두 API "활용신청" (즉시 승인)
   - [행정안전부_대한민국 공공서비스(혜택) 정보](https://www.data.go.kr/data/15113968/openapi.do) — 보조금24
   - [한국소비자원_생필품 가격 정보](https://www.data.go.kr/data/3043385/openapi.do) — 참가격
2. 마이페이지에서 **일반 인증키(Decoding)** 복사
3. 시크릿 등록:
   ```bash
   supabase secrets set DATA_GO_KR_KEY="발급받은키" --project-ref eumocvkejlbfsemmkmwr
   ```

## 동기화 실행

```bash
ANON="sb_publishable_zgdBuyXoImCALVMlFw4LJg_XT9fcNvY"
BASE="https://eumocvkejlbfsemmkmwr.supabase.co/functions/v1"

# 1) 실제 응답 원본 확인 (필드 매핑 검증)
curl "$BASE/sync-jiwon?probe=1" -H "Authorization: Bearer $ANON"
curl "$BASE/sync-mulga?probe=1" -H "Authorization: Bearer $ANON"

# 2) 전체 동기화
curl -X POST "$BASE/sync-jiwon" -H "Authorization: Bearer $ANON"
curl -X POST "$BASE/sync-mulga" -H "Authorization: Bearer $ANON"
```

- `probe=1` 응답에서 실제 필드명이 매핑과 다르면 `index.ts`의 `mapRow` / `mapPrice`
  후보 키 배열에 실제 키를 추가하면 됩니다 (여러 후보 중 첫 번째 값을 사용하는 구조).
- 참가격 API는 엔드포인트가 다를 경우 `MULGA_ENDPOINT` 시크릿으로 전체 URL을 덮어쓸 수 있습니다.

## 자동 갱신 (선택)

Supabase Dashboard → Integrations → Cron 에서:
- `sync-jiwon`: 매일 06:00 KST
- `sync-mulga`: 매주 토요일 09:00 KST (참가격은 금요일 주 1회 조사)

## 프론트 연동

- `jiwon/js/data.js`, `mulga/js/data.js` 에 프로젝트 URL과 publishable key가 이미 들어 있습니다.
- 테이블이 비어 있거나 오류가 나면 자동으로 목업 데이터로 폴백하므로, 동기화 전에도 사이트는 동작합니다.
