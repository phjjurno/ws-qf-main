# 재심사 기간 비활성화 기능

애드센스 "정책 미준수" 반려 대응으로 다음을 라이브에서 내렸습니다.
코드는 git 히스토리에 그대로 있으니 아래 명령으로 복구합니다.

## 1) 지원금·물가 (jiwon / mulga)

**내린 이유:** data.go.kr 공공데이터 인증키가 해당 API에 연결되지 않아
실데이터가 없는 상태였고, 그 사이 목업(하드코딩) 수치가
"보조금24 공공데이터 기반"이라는 문구와 함께 노출되고 있었음.
오인 유발 소지가 커서 실데이터 연결 전까지 비공개.

**복구 전 필수 조건:** data.go.kr 마이페이지 → 개발계정에
"대한민국 공공서비스 정보"가 **오픈API**로 승인되어 있을 것.
확인: https://www.data.go.kr/data/15113968/openapi.do

```bash
# 서브사이트 폴더 복구
git checkout 51958fe -- jiwon mulga
# 메인 페이지 내 지원금·물가 탭/패널 복구는 아래 커밋 diff 참고
git show 677d8a1 -- index.html
```

동기화 함수(`backend/functions/sync-jiwon`, `sync-mulga`)와
`js/services.js`는 리포에 그대로 남아 있습니다.

## 2) 플레이리스트

**내린 이유:** 제3자 유튜브 음원 임베드는 광고 수익화 페이지에서
저작권 정책 회색지대. 승인 후 복구 권장.

```bash
git show 677d8a1 -- index.html   # pl-section 마크업 확인
```

`js/playlist.js`, `css/style.css`의 `.pl-*`,
`netlify/functions/pulse-tracks.js`, `data/pulse-tracks.json` 모두 보존됨.
