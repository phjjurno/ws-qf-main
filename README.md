# wsQf-PDF

브라우저에서 끝내는 무료 PDF 정리 도구.
PDF 합치기 · 압축 · 파일명 변경 · 페이지 번호 · 도장/서명 · 영수증 A4 정리(합계 계산).

모든 처리는 브라우저 안에서만 이루어지며 파일은 서버로 전송되지 않습니다.

## 실행

빌드 과정이 없습니다. 아래 중 하나로 실행하세요.

```bash
# 방법 1: 로컬 서버 (권장)
python3 -m http.server 8931
# → http://127.0.0.1:8931 접속

# 방법 2: index.html을 브라우저로 직접 열기
```

## 구조

```
index.html        # 단일 페이지 앱 + SEO 콘텐츠 + 구조화 데이터
css/tokens.css    # 디자인 토큰 (라이트/다크 색상 변수)
css/style.css     # 레이아웃·컴포넌트 스타일
js/app.js         # 탭 전환, 다크 모드, 이탈 경고, 토스트
js/pdf-utils.js   # PDF 공통 유틸 (로드·썸네일·다운로드)
js/file-manager.js# 파일 보관함 (업로드·검증·검색·정렬)
js/merge.js       # PDF 합치기
js/compress.js    # PDF 압축 (페이지 재렌더링 방식)
js/rename.js      # 파일명 변경
js/page-numbers.js# 페이지 번호 삽입
js/stamp.js       # 도장·서명 (업로드/직접 그리기 + 클릭 배치)
js/receipts.js    # 영수증 A4 정렬 + 합계 계산
vendor/           # pdf-lib 1.17.1, pdf.js 3.11.174 (로컬 포함)
assets/           # 로고(logo.svg), 파비콘(favicon.svg)
robots.txt        # 크롤러 안내
sitemap.xml       # 사이트맵
```

## 배포

정적 호스팅(Netlify Drop, GitHub Pages, Vercel 등)에 폴더 전체를 올리면 됩니다.

### 배포 후 반드시 교체할 것

`https://wsqf-pdf.example.com` 플레이스홀더를 실제 도메인으로 바꾸세요.

- `index.html` — canonical, og:url, og:image, JSON-LD의 url
- `sitemap.xml` — `<loc>`
- `robots.txt` — Sitemap 줄

### 구글 애드센스 적용 시

1. 애드센스 승인 후 발급받은 코드를 `index.html`의 `.ad-placeholder` 3곳에 삽입
2. 루트에 `ads.txt` 생성 (애드센스가 안내하는 내용 그대로)
3. `#privacy` 섹션의 쿠키 관련 문구를 실제 사용 광고 사업자에 맞게 갱신
4. 서치콘솔에 사이트맵(`/sitemap.xml`) 제출

## 제한사항

- 암호화된 PDF는 열 수 없음 (안내 메시지 표시)
- 압축은 페이지를 이미지로 변환하므로 압축 후 텍스트 선택·검색 불가
- HEIC 이미지 미지원 (JPG·PNG·WEBP 지원)
- 영수증 금액은 직접 입력 (OCR 없음)
