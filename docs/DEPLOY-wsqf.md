# wsQf 배포 (Netlify)

기존 사이트들과 동일하게 **Netlify Drop**(폴더 드래그)입니다. 각 폴더에 `netlify.toml`(캐시·보안헤더)이 들어 있습니다.

## 배포할 폴더 → 도메인

| 폴더 | 도메인 | 내용 |
|------|--------|------|
| **루트**(`index.html` 등) | **ws-qf.com** (메인) | wsQf-PDF 도구 **+ 지원금·물가 허브 밴드 융합** |
| `jiwon/` | jiwon.ws-qf.com | 정부지원금 진단 |
| `mulga/` | mulga.ws-qf.com | 생필품 가격 비교 |

> 메인 ws-qf.com은 기존 PDF 도구 페이지 그대로 두되, 헤더 아래에 지원금·물가 진입 카드(허브 밴드)와 "다른 앱" 스위처를 얹어 한 페이지로 융합했습니다. 별도 hub 폴더/서브도메인은 없습니다.

## 올리는 법 (폴더마다 반복)

1. https://app.netlify.com/drop 접속
2. 폴더를 각각 드래그 → 즉시 배포
   - 메인은 **Mini Site 폴더 전체**(루트)를 드래그
   - `jiwon`, `mulga`는 해당 폴더만 드래그
3. Site settings → Domain management 에서 도메인 연결
4. ws-qf.com DNS에 서브도메인 CNAME 추가:
   ```
   jiwon  CNAME  <netlify가 안내하는 값>
   mulga  CNAME  <netlify가 안내하는 값>
   ```

## 배포 직후 확인
- 메인: PDF 도구 + 상단 지원금·물가 카드 + "다른 앱" 스위처 정상
- `/`, `/robots.txt`, `/sitemap.xml` 열리는지
- 상단 지원금·물가 카드 + 사이드바 탭으로 두 기능 열리는지
- "다른 앱" 스위처로 대얌이·비밀창문·서트레스 이동되는지
- 다크모드 토글, 지원금/물가 목록 렌더링 정상인지

## 백엔드(지원금·물가 데이터)
`backend/README.md` 참고 — 공공데이터 인증키 1개만 넣고 Edge Function 호출하면 실데이터가 채워집니다. 그 전에도 목업으로 정상 동작합니다.
