# 아산집 알리미 독립 알림 서버

공식 사용 주소는 https://asan-rental-push.kimkirik.chatgpt.site/ 입니다. 이 주소의 화면과 API 경로를 유지하고, 공고 수집·저장·예약 실행·Web Push 발송은 사용자 소유 Cloudflare Workers와 Durable Objects에서 실행합니다. GitHub는 코드 백업용입니다. Sites 화면 주소의 이용 조건과 별도 서버의 운영 조건은 별개입니다.

- Durable Object SQLite: 공고·보관함·기기 구독·발송/표시 확인 기록
- Durable Object Alarm: 약 10분 간격 재시도, 약 30분 간격 공식 출처 5곳 직접 확인
- 출처별 확인이 끝나는 즉시 공고와 알림을 반영합니다. 한 출처 장애가 다른 출처의 새 공고 발송을 막지 않습니다.
- 출처 실패 시 기존 공고를 보존하고 점검 상태를 표시합니다. 스케줄러·푸시 서비스·휴대폰 설정에 따른 지연 가능성이 있어 무누락을 보장하지 않습니다.
- iOS 16.4 이상은 홈 화면에 설치한 웹 앱에서 알림을 허용해야 합니다. Android Chrome을 기본으로 안내합니다.

`npm ci`, `npm test`, `npm run typecheck`, `npm run build`로 확인합니다. `npm run deploy`는 사용자 소유 계정에 로그인한 상태에서만 실행합니다. `VAPID_PRIVATE_KEY`는 Worker 비밀 변수이며 소스에 저장하지 않습니다. 마이그레이션용 비밀 변수는 일회성 이전 후 삭제했습니다.

`static/`은 Sites 프로젝트의 `frontend/`에서 빌드한 앱의 복구용 사본입니다. 화면의 사용 주소는 변경하지 않습니다. 공용 Worker 경로는 Sites의 `INDEPENDENT_API_URL` 설정에서만 참조합니다.
