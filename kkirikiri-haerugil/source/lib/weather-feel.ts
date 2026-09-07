export type WeatherFeel = {
  label: string;
  detail: string;
  level: "calm" | "notice" | "caution" | "danger" | "unknown";
};

export function explainWave(height: number | null, kind: "forecast" | "observation" = "forecast"): WeatherFeel {
  if (height === null) return kind === "observation"
    ? { label: "과거 파고 자료 미제공", detail: "이 과거 날짜는 공식 파고 관측값이 연결되지 않아 당시 물결 상태를 확인할 수 없어요.", level: "unknown" }
    : { label: "파고 예보 미제공", detail: "출발 전 최신 해상예보와 실제 해안의 물결을 다시 확인해야 해요.", level: "unknown" };
  if (height < .2) return { label: "거의 잔잔", detail: "수면에 작은 파문만 보여 바닥이 흔들려 보이는 영향은 적은 편이에요.", level: "calm" };
  if (height < .5) return { label: "잔물결", detail: "해변으로 작은 물결이 규칙적으로 들어오고 수면 반사가 조금씩 흔들려요.", level: "notice" };
  if (height < .8) return { label: "물결이 제법 있어요", detail: "해변에서는 작은 파도가 잇따라 부서질 수 있고 얕은 곳에서도 발밑과 바닥 시야가 흔들릴 수 있어요.", level: "caution" };
  if (height < 1) return { label: "물결이 많아요", detail: "파도 소리가 뚜렷하고 노출된 갯벌·갯바위에서는 균형 잡기가 어려울 수 있어요.", level: "caution" };
  if (height < 1.5) return { label: "약간 높은 물결", detail: "파도가 몸의 균형과 시야를 계속 방해할 수 있어 노출 해안 진입은 권하지 않아요.", level: "danger" };
  if (height < 2) return { label: "거친 물결", detail: "파도가 반복해 세게 깨질 수 있어 해루질을 피하는 편이 안전해요.", level: "danger" };
  if (height < 3) return { label: "높은 물결", detail: "해안 가장자리 접근을 피하고 출조를 미루세요.", level: "danger" };
  return { label: "매우 높은 물결", detail: "풍랑특보와 현장 통제를 먼저 확인하고 출조하지 마세요.", level: "danger" };
}

export function explainRain(amount: number, kind: "forecast" | "observation" = "forecast", probability = 0): WeatherFeel {
  if (kind === "observation") {
    if (amount <= 0) return { label: "하루 동안 비 없음", detail: "관측된 하루 누적 강수는 0mm예요.", level: "calm" };
    if (amount < 1) return { label: "하루 누적 매우 적음", detail: "잠깐 약한 비가 왔거나 흔적만 남을 정도예요. 하루 합계라 순간 빗줄기 세기는 알 수 없어요.", level: "notice" };
    if (amount < 5) return { label: "하루 누적 적은 비", detail: "하루 중 비가 내린 시간이 있었어요. 바위와 갯벌이 미끄러웠을 수 있어요.", level: "notice" };
    if (amount < 20) return { label: "하루 동안 비가 내림", detail: "빗물 유입과 젖은 발판이 시야·안전에 영향을 줬을 가능성이 있어요.", level: "caution" };
    if (amount < 50) return { label: "하루 누적 많은 비", detail: "하천과 갯골로 흙탕물이 들어와 물이 흐렸을 가능성이 커요.", level: "danger" };
    return { label: "하루 누적 매우 많은 비", detail: "강한 유입수와 탁도 영향이 컸을 수 있어요. 당시 특보와 통제 기록도 함께 확인하세요.", level: "danger" };
  }

  const chance = probability > 0 ? ` 강수확률은 ${probability}%예요.` : "";
  if (amount <= 0) return probability >= 60
    ? { label: "비 가능성은 있어요", detail: `발표 강수량은 0mm지만 비가 올 가능성은 높은 편이에요.${chance}`, level: "notice" }
    : { label: "비 없음", detail: `출조시간대 발표 강수량은 0mm예요.${chance}`, level: "calm" };
  if (amount < .1) return { label: "빗방울 수준", detail: `비가 느껴질 수 있지만 양으로 잡히기 어려운 정도예요.${chance}`, level: "notice" };
  if (amount < 1) return { label: "체감상 보슬비", detail: `잠깐은 약하게 느껴져도 오래 있으면 옷과 장비가 축축해져요.${chance}`, level: "notice" };
  if (amount < 3) return { label: "약한 비", detail: `우비가 필요하고 갯벌·바위가 미끄러워지기 시작해요.${chance}`, level: "caution" };
  if (amount < 7) return { label: "보통 비", detail: `빗소리가 분명하고 발판과 물속 시야가 나빠질 수 있어요.${chance}`, level: "caution" };
  if (amount < 15) return { label: "제법 강한 비", detail: `짧게 있어도 옷과 신발이 젖고 갯골 유입수가 늘 수 있어요.${chance}`, level: "danger" };
  if (amount < 30) return { label: "강한 비", detail: `시야와 발판이 크게 나빠질 수 있어 해루질은 피하세요.${chance}`, level: "danger" };
  return { label: "매우 강한 비", detail: `침수와 급격한 유입수 위험이 있어 출조하지 마세요.${chance}`, level: "danger" };
}

export function explainWind(speed: number): WeatherFeel {
  if (speed < 1.6) return { label: "거의 고요", detail: "바람 영향이 작아 수면이 비교적 잔잔하게 느껴져요.", level: "calm" };
  if (speed < 3.4) return { label: "약한 바람", detail: "얼굴에 바람이 살짝 느껴지고 수면에 작은 파문이 생겨요.", level: "calm" };
  if (speed < 5.5) return { label: "산들바람", detail: "옷자락이 계속 흔들리고 수면에 잔물결이 뚜렷해져요.", level: "notice" };
  if (speed < 8) return { label: "바람이 뚜렷해요", detail: "모자와 가벼운 장비가 날릴 수 있고 물결·부유물이 늘어요.", level: "caution" };
  if (speed < 10.8) return { label: "강한 바람", detail: "걷거나 균형 잡기가 불편하고 수면 시야가 크게 흔들릴 수 있어요.", level: "danger" };
  return { label: "매우 강한 바람", detail: "해안 활동을 중단하고 바람을 피할 수 있는 곳으로 이동하세요.", level: "danger" };
}
