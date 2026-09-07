export function pushPlatform(userAgent = '', maxTouchPoints = 0, standalone = false) {
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  return {
    isIOS,
    needsHomeScreen: isIOS && !standalone,
    permissionHelp: isIOS
      ? 'iPhone 설정 → 알림 → 아산집 알리미에서 알림을 허용하고, 집중 모드와 알림 요약도 확인해 주세요.'
      : '안드로이드 설정 → 앱 → Chrome 또는 아산집 알리미 → 알림을 허용해 주세요.',
    installHelp: isIOS
      ? 'iOS 16.4 이상에서 Safari 공유(□↑) → 홈 화면에 추가 → 홈 화면의 아산집 알리미 아이콘을 열어 주세요.'
      : '안드로이드 Chrome 메뉴(⋮) → 앱 설치 또는 홈 화면에 추가를 선택하세요.',
  };
}
