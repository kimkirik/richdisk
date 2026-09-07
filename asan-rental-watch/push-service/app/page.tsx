export default function Home() {
  return <main style={{ maxWidth: 640, margin: '12vh auto', padding: 24, lineHeight: 1.8 }}>
    <p>아산집 알리미</p><h1 style={{ fontSize: 32, fontWeight: 700 }}>신청 기회를 놓치지 않도록</h1>
    <p>안드로이드 앱의 공고 알림을 전달하는 서비스입니다. 앱에서 알림을 허용하고 시험 알림을 확인해 주세요.</p>
    <a style={{ display: 'inline-block', background: '#125c48', color: 'white', padding: '12px 24px', borderRadius: 12, marginTop: 24 }} href="https://kimkirik.github.io/richdisk/asan-rental-watch/">아산집 알리미 열기 →</a>
    <p style={{ marginTop: 48, fontSize: 14, color: '#647067' }}>신규 공고 · 중요 변경 · 신청 시작 · 마감 3일 전, 1일 전, 당일</p>
    <p style={{ fontSize: 13, color: '#647067' }}>알림을 켜면 기기의 푸시 구독 정보와 발송·수신 확인 기록을 저장합니다. 앱의 ‘이 기기 알림 끄기’에서 구독 정보를 삭제할 수 있습니다.</p>
  </main>;
}
