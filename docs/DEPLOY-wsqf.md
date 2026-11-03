# ws-qf.com 배포 (Cloudflare Pages)

2026-11 Netlify 팀 크레딧 소진으로 사이트가 내려가면서 Cloudflare Pages 로 이전했다.
DNS 도 Cloudflare 라 호스팅·DNS 가 한 곳에 있다.

## 배포 방식

`main` 브랜치에 푸시하면 Pages 가 자동 배포한다. 빌드 과정은 없다(정적 파일 그대로).

| 설정 | 값 |
|------|-----|
| Framework preset | None |
| Build command | (비움) |
| Build output directory | `/` |
| Functions | `functions/` 자동 인식 |

## 리포 안의 Pages 설정 파일

- `_headers` — 보안 헤더, 자산 캐시. HTML·CSS·JS 는 Pages 기본값(`max-age=0, must-revalidate`)
- `_redirects` — 비공개한 `/jiwon`·`/mulga` 옛 주소를 홈으로 301
- `404.html` — 없으면 Pages 가 모든 주소에 홈을 200 으로 내주는 SPA 모드가 되어 soft-404 가 쌓인다
- `functions/api/pulse-tracks.js` — PULSE ORIGIN 롱폼 목록 (`GET /api/pulse-tracks`), Cache API 30분

## 커스텀 도메인

Pages 프로젝트 → Custom domains 에 `ws-qf.com`, `www.ws-qf.com` 을 등록한다.
Netlify 를 가리키던 옛 레코드(`@` A 레코드 2개, `www` CNAME → `ws-qf.netlify.app`)가
남아 있으면 충돌하니 먼저 지운다.

## 배포 확인

```bash
curl -sI https://ws-qf.com/ | grep -iE 'server|cf-ray'   # server: cloudflare
curl -s https://ws-qf.com/ads.txt                         # 애드센스 퍼블리셔 ID
curl -s -o /dev/null -w '%{http_code}\n' https://ws-qf.com/jiwon/   # 301
```
