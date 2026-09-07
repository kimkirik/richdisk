# 아산집 알리미 — 소스 백업

공식 사용 주소: https://asan-rental-push.kimkirik.chatgpt.site/

이 저장소는 보조 보관·백업용입니다. GitHub Pages, raw GitHub 파일, GitHub 예약 실행을 운영에 사용하지 않습니다. 저장소 공개 여부를 바꿔도 앱의 공고 수집과 알림 서버는 영향을 받지 않습니다.

- `push-service/`: Sites에서 직접 제공하는 전체 앱 화면과 같은 주소의 API. `frontend/`가 최신 화면 소스입니다. `INDEPENDENT_API_URL`로 별도 서버에 연결합니다.
- `independent-server/`: 사용자 소유 Cloudflare Workers/Durable Objects 서버. 약 30분 간격으로 LH청약플러스·마이홈·아산시청·충남개발공사·주택관리공단을 직접 확인합니다. 새 공고·중요 변경·접수 시작·마감 3일 전/1일 전/당일 알림, 약 10분 간격 재시도, 공고 보관과 기기 표시 확인을 처리합니다.
- 기존 `source/`, `scripts/`와 루트 정적 파일은 이전 구현의 보관본입니다. 현재 운영은 위 두 프로젝트를 기준으로 합니다.

## 휴대폰 알림 연결

Android Chrome에서 공식 사용 주소를 열고 홈 화면에 앱 설치 → 알림 켜기 → 이 기기에서 알림 연결을 선택합니다. 시험 알림이 휴대폰 알림창에 표시되는지 확인합니다. 이전 GitHub 주소에서 등록한 권한은 새 주소로 자동 이전되지 않습니다.

iPhone/iPad는 iOS/iPadOS 16.4 이상에서 Safari → 공유 → 홈 화면에 추가 후 설치된 앱에서 알림을 허용해야 합니다. 지원 조건: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

ChatGPT/Codex의 알림은 사용하지 않습니다. 공고 감시와 푸시 발송은 ChatGPT 유료 구독과 별도의 Cloudflare 서버에서 실행합니다. 공식 사용 주소인 Sites 화면의 이용 조건은 Sites 정책을 따릅니다.

## 데이터와 장애 처리

공식 출처 한 곳의 지연이 다른 곳에서 확인한 공고와 알림 반영을 막지 않습니다. 확인 실패 시 기존 공고를 보존하고 상태를 표시합니다. 마감 공고는 보관함에 남깁니다. 동일 공고의 중복 발송을 방지하고 전송 실패를 재시도합니다.

서버/공식 사이트/기기 인터넷·알림 권한·배터리 제한으로 지연이 생길 수 있어 실시간 또는 무누락을 보장하지 않습니다. 같은 첨부파일 ID의 내용만 바뀌거나 공급지역이 첨부파일에만 있으면 감지에 한계가 있습니다. 신청 전 공식 원문을 확인하세요.

## 검증과 복구

Node.js 22.13 이상을 사용합니다. `push-service`에서 `npm ci`, `npm test`, `npm run typecheck`, `npm run build`를 실행합니다. 화면 수정 후에는 `frontend`에서 의존성을 설치하고 프로젝트 루트의 `node scripts/build-frontend.mjs`로 정적 화면을 다시 만듭니다. Sites 프로젝트 ID와 공개 주소를 유지하여 배포합니다.

`independent-server`에서 `npm ci`, `npm test`, `npm run typecheck`, `npm run build`로 검사합니다. 이 서버의 `build`는 배포 사전 검증이며 `npm run deploy`가 실제 배포입니다. Worker 비밀 변수 `VAPID_PRIVATE_KEY`는 저장소에 넣지 않습니다. 기기 구독과 발송 기록도 소스 백업에 포함하지 않습니다.

테스트는 실제 Worker 실행 환경의 SQLite, 예약 실행, 출처 장애 중 공고 보존, 기기 인증, Web Push 암호화·복호화, 중복 방지·재시도, 표시 확인, 동일 주소 API 전달을 검증합니다. 실제 휴대폰 수신은 해당 기기의 시험 알림으로 확인해야 합니다.
