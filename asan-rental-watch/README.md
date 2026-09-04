# 아산집 알리미

아산시 소재 임대주택의 공식 모집공고를 모아 보여주는 공개 PWA입니다.

- 확인 출처: LH청약플러스, 마이홈포털, 아산시청, 충남개발공사, 주택관리공단
- GitHub Actions가 4시간마다 진행 공고를 갱신합니다.
- 사라지거나 마감된 공고는 `data/notices.json`의 보관함에 최대 200건까지 유지합니다.
- 공고 ID와 주요 일정의 변경값을 함께 비교해 신규·중요 변경 알림을 중복 없이 처리합니다.
- 브라우저 알림은 사용자가 직접 허용해야 하며, 백그라운드 확인 주기는 기기 정책의 영향을 받습니다.

## 로컬 실행

```bash
npm ci
npm run update:notices
npm run dev
```

## 빌드

```bash
npm run typecheck
npm run build
```
