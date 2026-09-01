# 끼리끼리 해루질 길잡이

GitHub Pages에 배포하는 정적 프런트엔드입니다.

- 공개 주소: <https://kimkirik.github.io/richdisk/kkirikiri-haerugil/>
- 배포 기준 경로: `/richdisk/kkirikiri-haerugil/`
- 실시간 물때·날씨 API: `https://haerugil-guide.kimkirik.chatgpt.site/api/conditions`
- API 키와 서버 비밀값은 이 공개 저장소에 포함하지 않습니다.

GitHub Pages는 서버 코드를 실행하지 않으므로, 화면은 위의 공개 API에서 최신 공공데이터를 읽습니다. 화면 코드는 GitHub Pages에서 서버 런타임 없이 동작하도록 Vite 기반 정적 파일로 빌드했으며, `assets/`에는 브라우저용 JavaScript와 CSS만 들어 있습니다.
