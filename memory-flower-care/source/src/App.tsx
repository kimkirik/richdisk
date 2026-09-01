"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PICTURE_CONCEPTS,
  PICTURE_WORD_COUNT,
  type PictureCategory,
  type PictureConcept,
  type PictureWord,
} from "./picture-word-data";

type GameKey = "picture" | "orientation" | "memory" | "match" | "math" | "words";
type Screen = "home" | GameKey;

const games: { key: GameKey; icon: string; title: string; desc: string; color: string; time: string }[] = [
  { key: "picture", icon: "🖼️", title: "그림 단어 찾기", desc: "유형을 고르고 글자에 맞는 그림을 찾아요", color: "mint", time: "5분" },
  { key: "orientation", icon: "📅", title: "오늘은 언제?", desc: "날짜와 계절을 천천히 떠올려요", color: "sky", time: "2분" },
  { key: "memory", icon: "🔢", title: "숫자 기억", desc: "20단계까지 숫자를 순서대로 눌러요", color: "purple", time: "7분" },
  { key: "match", icon: "🃏", title: "그림 짝 찾기", desc: "같은 그림 두 장을 찾아봐요", color: "coral", time: "3분" },
  { key: "math", icon: "🧮", title: "생활 속 계산", desc: "더하기·빼기·곱셈을 단계별로 풀어요", color: "yellow", time: "3분" },
  { key: "words", icon: "🌿", title: "낱말 친구", desc: "같은 종류의 낱말을 찾아요", color: "green", time: "2분" },
];

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [completed, setCompleted] = useState<GameKey[]>([]);
  const [textLevel, setTextLevel] = useState(3);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const today = new Date().toDateString();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("memoryFlower") || "null"); } catch { localStorage.removeItem("memoryFlower"); }
    // Browser storage is intentionally restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved?.date === today) setCompleted(saved.completed || []);
    setStreak(Number(localStorage.getItem("memoryFlowerStreak") || "1"));
    const savedTextLevel = Number(localStorage.getItem("memoryFlowerTextLevel") || "3");
    setTextLevel(Math.min(5, Math.max(1, savedTextLevel)));
  }, []);

  const finish = (key: GameKey) => {
    const next = completed.includes(key) ? completed : [...completed, key];
    setCompleted(next);
    localStorage.setItem("memoryFlower", JSON.stringify({ date: new Date().toDateString(), completed: next }));
    setScreen("home");
  };

  const date = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());
  const Game = screen === "home" ? null : { picture: PictureWordGame, orientation: Orientation, memory: NumberMemory, match: CardMatch, math: MathGame, words: WordGame }[screen];
  const changeTextLevel = (next: number) => {
    const level = Math.min(5, Math.max(1, next));
    setTextLevel(level);
    localStorage.setItem("memoryFlowerTextLevel", String(level));
  };

  if (Game) return <main className={`app text-level-${textLevel}`}><Game onBack={() => setScreen("home")} onFinish={() => finish(screen as GameKey)} /></main>;

  return (
    <main className={`app text-level-${textLevel}`}>
      <div className="shell">
        <header className="topbar">
          <div className="brand"><span>🌼</span><div><b>기억꽃</b><small>매일 피어나는 두뇌 건강</small></div></div>
          <div className="text-controls" aria-label="글자 크기 조절">
            <span>글자 {textLevel}/5</span>
            <button onClick={() => changeTextLevel(textLevel - 1)} disabled={textLevel === 1} aria-label="글자 작게">−</button>
            <button onClick={() => changeTextLevel(textLevel + 1)} disabled={textLevel === 5} aria-label="글자 크게">＋</button>
          </div>
        </header>

        <section className="welcome">
          <div>
            <p className="date">{date}</p>
            <h1>오늘도 반가워요! <span>👋</span></h1>
            <p>하루 10분, 즐겁게 기억꽃을 피워볼까요?</p>
          </div>
          <div className="flower" aria-hidden="true"><span>🌼</span><i>오늘도<br/>활짝!</i></div>
        </section>

        <section className="progress-card">
          <div className="progress-head"><div><span className="fire">🔥</span><b>{streak}일째 함께하고 있어요</b></div><strong>{completed.length} / {games.length} 완료</strong></div>
          <div className="bar"><i style={{ width: `${completed.length / games.length * 100}%` }} /></div>
          <p>{completed.length === 0 ? "첫 운동을 시작하면 꽃잎이 피어나요." : completed.length === games.length ? "오늘 운동을 모두 마쳤어요. 정말 멋져요!" : "좋아요! 내 속도대로 천천히 이어가요."}</p>
        </section>

        <section className="games-section">
          <div className="section-title"><div><span>오늘의 두뇌 운동</span><h2>어떤 운동부터 해볼까요?</h2></div><p>순서는 상관없어요</p></div>
          <div className="game-grid">
            {games.map((g) => <button key={g.key} className={`game-card ${g.color}`} onClick={() => setScreen(g.key)}>
              <div className="game-icon">{g.icon}</div>
              <div className="game-copy"><h3>{g.title}</h3><p>{g.desc}</p><small>⏱ 약 {g.time}</small></div>
              <span className="arrow">›</span>
            </button>)}
          </div>
        </section>

        <aside className="care-note"><span>💛</span><p><b>틀려도 괜찮아요.</b><br/>점수보다 매일 즐겁게 해보는 것이 더 중요해요.</p></aside>
        <footer>기억꽃은 의료 진단 도구가 아닌 일상 두뇌 활동 서비스입니다.</footer>
      </div>
    </main>
  );
}

function GameFrame({ title, icon, step, total, onBack, children }: { title: string; icon: string; step: number; total: number; onBack: () => void; children: React.ReactNode }) {
  return <div className="game-shell"><header className="game-header"><button onClick={onBack}>‹ <span>홈으로</span></button><h1>{icon} {title}</h1><div /></header><div className="step"><div><i style={{ width: `${step / total * 100}%` }} /></div><span>{step} / {total}</span></div>{children}</div>;
}

function Choice({ children, onClick, state = "" }: { children: React.ReactNode; onClick: () => void; state?: string }) { return <button className={`choice ${state}`} onClick={onClick}>{children}</button>; }
function Result({ score, total, onFinish }: { score: number; total: number; onFinish: () => void }) { return <div className="result"><span>🌷</span><h2>오늘 운동 완료!</h2><p>{total}문제 중 <b>{score}문제</b>를 맞혔어요.</p><em>{score === total ? "정말 훌륭해요!" : "천천히 생각한 것만으로도 충분히 잘했어요."}</em><button className="primary" onClick={onFinish}>오늘 운동 마치기</button></div>; }

const PICTURE_ROUNDS = 20;
type PictureSessionCategory = PictureCategory | "골고루";

const PICTURE_CATEGORY_OPTIONS: { key: PictureSessionCategory; icon: string; label: string }[] = [
  { key: "골고루", icon: "🌈", label: "골고루" },
  { key: "가전제품", icon: "📺", label: "가전제품" },
  { key: "주방용품", icon: "🍽️", label: "주방용품" },
  { key: "생활용품", icon: "🧼", label: "생활용품" },
  { key: "먹을거리", icon: "🍎", label: "먹을거리" },
  { key: "동물", icon: "🐶", label: "동물" },
  { key: "옷차림", icon: "👕", label: "옷차림" },
  { key: "학교·놀이", icon: "✏️", label: "학교·놀이" },
  { key: "탈것", icon: "🚗", label: "탈것" },
  { key: "자연", icon: "🌳", label: "자연" },
];

const toPictureWord = (concept: PictureConcept): PictureWord => ({
  ...concept,
  cardId: concept.id,
  spokenWord: concept.word,
});

const pickPictureWords = (category: PictureConcept["category"] | "나머지", count: number) => {
  const household = new Set(["가전제품", "주방용품", "생활용품"]);
  const concepts = PICTURE_CONCEPTS.filter((concept) =>
    category === "나머지" ? !household.has(concept.category) : concept.category === category,
  );

  return shuffle(concepts).slice(0, count).map(toPictureWord);
};

const makePictureSession = (category: PictureSessionCategory) => {
  if (category !== "골고루") {
    return shuffle(PICTURE_CONCEPTS.filter((concept) => concept.category === category))
      .slice(0, PICTURE_ROUNDS)
      .map(toPictureWord);
  }
  return shuffle([
    ...pickPictureWords("가전제품", 5),
    ...pickPictureWords("주방용품", 5),
    ...pickPictureWords("생활용품", 5),
    ...pickPictureWords("나머지", 5),
  ]);
};

const makePictureChoices = (target: PictureWord): PictureConcept[] => {
  const sameCategory = PICTURE_CONCEPTS.filter((candidate) =>
    candidate.id !== target.id
    && candidate.category === target.category
    && (!target.family || candidate.family !== target.family),
  );
  const fallback = PICTURE_CONCEPTS.filter((candidate) =>
    candidate.id !== target.id
    && (!target.family || candidate.family !== target.family)
    && !sameCategory.some((same) => same.id === candidate.id),
  );
  const distractors = shuffle(sameCategory).slice(0, 3);
  if (distractors.length < 3) distractors.push(...shuffle(fallback).slice(0, 3 - distractors.length));
  return shuffle([target, ...distractors]);
};

const withObjectParticle = (word: string) => {
  const last = word.trim().charCodeAt(word.trim().length - 1);
  const hangulIndex = last - 0xac00;
  const hasBatchim = hangulIndex >= 0 && hangulIndex <= 11171 && hangulIndex % 28 !== 0;
  return `${word}${hasBatchim ? "을" : "를"}`;
};

const speakKorean = (text: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const koreanVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko"));
  if (koreanVoice) utterance.voice = koreanVoice;
  utterance.lang = "ko-KR";
  utterance.rate = 0.78;
  utterance.pitch = 1.03;
  window.speechSynthesis.speak(utterance);
};

const playFartSound = () => {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const duration = 0.52;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const time = i / context.sampleRate;
    const envelope = Math.pow(1 - time / duration, 2.4);
    data[i] = (Math.random() * 2 - 1) * envelope * (0.65 + Math.sin(time * 56) * 0.2);
  }

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const rumble = context.createOscillator();
  const rumbleGain = context.createGain();
  noise.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(420, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(115, context.currentTime + duration);
  gain.gain.setValueAtTime(0.24, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  rumble.type = "sawtooth";
  rumble.frequency.setValueAtTime(88, context.currentTime);
  rumble.frequency.exponentialRampToValueAtTime(42, context.currentTime + duration);
  rumbleGain.gain.setValueAtTime(0.055, context.currentTime);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

  noise.connect(filter).connect(gain).connect(context.destination);
  rumble.connect(rumbleGain).connect(filter);
  noise.start();
  rumble.start();
  noise.stop(context.currentTime + duration);
  rumble.stop(context.currentTime + duration);
  window.setTimeout(() => void context.close(), 750);
};

function PictureVisual({ concept }: { concept: PictureConcept }) {
  if (concept.picture.kind === "asset") {
    // Four small local WebP choices are intentionally eager and avoid a runtime image loader.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={concept.picture.value} alt="" draggable={false} />;
  }
  return <span className="picture-emoji" role="img" aria-hidden="true">{concept.picture.value}</span>;
}

function PictureWordGame({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<PictureSessionCategory | null>(null);
  const [session, setSession] = useState<PictureWord[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongId, setWrongId] = useState("");
  const [missed, setMissed] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const question = session[index];
  const choices = useMemo(() => question ? makePictureChoices(question) : [], [question]);

  useEffect(() => () => {
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    window.speechSynthesis?.cancel();
  }, []);

  const startCategory = (category: PictureSessionCategory) => {
    window.speechSynthesis?.cancel();
    setSession(makePictureSession(category));
    setSelectedCategory(category);
    setIndex(0);
    setScore(0);
    setSolved(false);
    setWrongId("");
    setMissed(false);
  };

  if (!selectedCategory) {
    return <GameFrame title="그림 단어 찾기" icon="🖼️" step={0} total={PICTURE_ROUNDS} onBack={onBack}>
      <div className="picture-category-select">
        <span className="category-kicker">낱말 유형</span>
        <h2>어떤 종류를 찾아볼까요?</h2>
        <p>고른 종류의 쉬운 낱말만 그림 문제로 나와요.</p>
        <div className="picture-category-grid">
          {PICTURE_CATEGORY_OPTIONS.map((option) => {
            const count = option.key === "골고루"
              ? PICTURE_WORD_COUNT
              : PICTURE_CONCEPTS.filter((concept) => concept.category === option.key).length;
            return <button key={option.key} onClick={() => startCategory(option.key)}>
              <span>{option.icon}</span>
              <b>{option.label}</b>
              <small>{option.key === "골고루" ? "모든 유형" : `${count}개 낱말`}</small>
            </button>;
          })}
        </div>
        <p className="category-note">한 번에 최대 20문제가 나와요.</p>
      </div>
    </GameFrame>;
  }

  if (index === session.length) {
    return <GameFrame title="그림 단어 찾기" icon="🖼️" step={session.length} total={session.length} onBack={onBack}><Result score={score} total={session.length} onFinish={onFinish} /></GameFrame>;
  }

  const choose = (concept: PictureConcept) => {
    if (solved || wrongId) return;
    if (concept.id === question.id) {
      setSolved(true);
      if (!missed) setScore((value) => value + 1);
      speakKorean(question.spokenWord);
      return;
    }
    setMissed(true);
    setWrongId(concept.id);
    playFartSound();
    wrongTimer.current = window.setTimeout(() => setWrongId(""), 620);
  };

  const next = () => {
    window.speechSynthesis?.cancel();
    setIndex((value) => value + 1);
    setSolved(false);
    setWrongId("");
    setMissed(false);
  };

  return <GameFrame title="그림 단어 찾기" icon="🖼️" step={index + 1} total={session.length} onBack={onBack}>
    <div className="picture-quiz">
      <div className="picture-bank-note"><span>{question.category}</span><b>쉬운 낱말 {index + 1} / {session.length}</b></div>
      <h2>{withObjectParticle(question.spokenWord)} 찾아보세요</h2>
      <div className="picture-choices">
        {choices.map((concept, optionIndex) => {
          const isCorrect = solved && concept.id === question.id;
          const isWrong = wrongId === concept.id;
          return <button
            key={concept.id}
            className={`${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
            onClick={() => choose(concept)}
            aria-label={`그림 선택지 ${optionIndex + 1}`}
            disabled={solved}
          >
            <PictureVisual concept={concept} />
            {isCorrect && <strong>{question.spokenWord}</strong>}
          </button>;
        })}
      </div>
      {solved && <div className="picture-success" role="status" aria-live="polite">
        <div><span>참 잘했어요!</span><b>{question.spokenWord}</b></div>
        <button className="primary" onClick={next}>{index === session.length - 1 ? "결과 보기" : "다음 문제"}</button>
      </div>}
      {!solved && <p className="picture-help">틀리면 방귀 소리가 나요. 다시 골라도 괜찮아요!</p>}
    </div>
  </GameFrame>;
}

function Orientation({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const now = new Date(); const month = now.getMonth() + 1; const season = month < 3 || month === 12 ? "겨울" : month < 6 ? "봄" : month < 9 ? "여름" : "가을";
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const [qs] = useState(() => [
    { q: "올해는 몇 년도일까요?", icon: "🗓️", a: `${now.getFullYear()}년`, opts: shuffle([`${now.getFullYear()}년`, `${now.getFullYear()-1}년`, `${now.getFullYear()+1}년`]) },
    { q: "지금은 몇 월일까요?", icon: "📆", a: `${month}월`, opts: shuffle([`${month}월`, `${month === 1 ? 12 : month-1}월`, `${month === 12 ? 1 : month+1}월`]) },
    { q: "오늘은 무슨 요일일까요?", icon: "☀️", a: days[now.getDay()], opts: shuffle([days[now.getDay()], days[(now.getDay()+1)%7], days[(now.getDay()+6)%7]]) },
    { q: "지금은 어떤 계절일까요?", icon: "🌸", a: season, opts: shuffle(["봄", "여름", "가을", "겨울"]) },
    { q: "오늘은 며칠일까요?", icon: "📌", a: `${now.getDate()}일`, opts: shuffle([`${now.getDate()}일`, `${Math.max(1, now.getDate()-1)}일`, `${Math.min(31, now.getDate()+1)}일`]) },
    { q: "지금은 낮일까요, 밤일까요?", icon: "🕰️", a: now.getHours() >= 6 && now.getHours() < 18 ? "낮" : "밤", opts: ["낮", "밤"] },
  ]);
  const [i,setI]=useState(0), [score,setScore]=useState(0), [picked,setPicked]=useState(""); const q=qs[i];
  if(i===qs.length) return <GameFrame title="오늘은 언제?" icon="📅" step={qs.length} total={qs.length} onBack={onBack}><Result score={score} total={qs.length} onFinish={onFinish}/></GameFrame>;
  return <GameFrame title="오늘은 언제?" icon="📅" step={i+1} total={qs.length} onBack={onBack}><div className="quiz"><span className="quiz-icon">{q.icon}</span><h2>{q.q}</h2><p>정답이라고 생각하는 것을 눌러주세요.</p><div className="choices">{q.opts.map(o=><Choice key={o} onClick={()=>{if(!picked){setPicked(o); if(o===q.a)setScore(score+1)}}} state={picked ? o===q.a?"correct":o===picked?"wrong":"muted":""}>{o}</Choice>)}</div>{picked&&<div className="feedback"><b>{picked===q.a?"참 잘했어요! 👏":`괜찮아요. 정답은 ${q.a}예요.`}</b><button className="primary" onClick={()=>{setI(i+1);setPicked("")}}>{i===qs.length-1?"결과 보기":"다음 문제"}</button></div>}</div></GameFrame>;
}

function NumberMemory({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const [round,setRound]=useState(1), [nums,setNums]=useState<number[]>([]), [input,setInput]=useState<number[]>([]), [show,setShow]=useState(true), [score,setScore]=useState(0), [done,setDone]=useState(false), [checking,setChecking]=useState(false), [correct,setCorrect]=useState<boolean|null>(null);
  useEffect(()=>{const digitCount=3+Math.floor((round-1)/2);const n=Array.from({length:digitCount},()=>Math.floor(Math.random()*10));
    // A new round deliberately resets the short-lived game board.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNums(n);setInput([]);setShow(true);setChecking(false);setCorrect(null);const t=setTimeout(()=>setShow(false),2400+digitCount*220);return()=>clearTimeout(t)},[round]);
  const tap=(n:number)=>{if(!checking&&input.length<nums.length)setInput([...input,n])};
  const check=()=>{if(checking||input.length!==nums.length)return;const ok=input.every((v,i)=>v===nums[i]);setChecking(true);setCorrect(ok);if(ok)setScore(s=>s+1)};
  const next=()=>round===20?setDone(true):setRound(r=>r+1);
  return <GameFrame title="숫자 기억" icon="🔢" step={round} total={20} onBack={onBack}>{done?<Result score={score} total={20} onFinish={onFinish}/>:<div className="quiz"><span className="quiz-icon">🧠</span><h2>{show?`${round}단계 · 숫자를 기억해요`:`${round}단계 · 순서대로 눌러주세요`}</h2><p>{show?`${nums.length}개의 숫자가 잠시 뒤 사라져요.`:"잘못 눌렀다면 지우기 버튼을 눌러요."}</p>{show?<div className="number-row">{nums.map((n,i)=><b key={i}>{n}</b>)}</div>:<><div className="answer-slots" aria-label="입력한 숫자">{nums.map((_,i)=><i key={i}>{input[i]??""}</i>)}</div><div className="keypad">{[1,2,3,4,5,6,7,8,9,0].map(n=><button key={n} disabled={checking||input.length>=nums.length} onClick={()=>tap(n)}>{n}</button>)}</div><div className="number-actions"><button className="delete-number" disabled={checking||!input.length} onClick={()=>setInput(input.slice(0,-1))}>⌫ 한 칸 지우기</button><button className="primary" disabled={checking||input.length!==nums.length} onClick={check}>입력 확인</button></div>{checking&&<div className="feedback memory-feedback" role="status"><b>{correct?"정확히 기억했어요! 👏":<>괜찮아요. 정답은 <span>{nums.join("")}</span>예요.</>}</b><button className="primary" onClick={next}>{round===20?"결과 보기":"다음 단계"}</button></div>}</>}</div>}</GameFrame>;
}

function CardMatch({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const icons=["🍎","🐶","🌻","🚲","🎵","⭐"];
  const makeCards=(level:number)=>shuffle(icons.slice(0,level+3).flatMap(icon=>[icon,icon]));
  const [level,setLevel]=useState(1),[cards,setCards]=useState(()=>makeCards(1)); const [open,setOpen]=useState<number[]>([]), [matched,setMatched]=useState<number[]>([]), [moves,setMoves]=useState(0), [locked,setLocked]=useState(false);
  const flip=(idx:number)=>{if(locked||open.length===2||open.includes(idx)||matched.includes(idx))return;const next=[...open,idx];setOpen(next);if(next.length===2){setLocked(true);setMoves(m=>m+1);if(cards[next[0]]===cards[next[1]]){setTimeout(()=>{setMatched(m=>[...m,...next]);setOpen([]);setLocked(false)},500)}else setTimeout(()=>{setOpen([]);setLocked(false)},850)}};
  const nextLevel=()=>{const next=level+1;setLevel(next);setCards(makeCards(next));setOpen([]);setMatched([]);setMoves(0);setLocked(false)};
  if(matched.length===cards.length) return <GameFrame title="그림 짝 찾기" icon="🃏" step={level} total={3} onBack={onBack}><div className="result"><span>🎉</span><h2>{level}단계를 완성했어요!</h2><p><b>{moves}번</b> 만에 모두 찾았어요.</p><em>집중해서 아주 잘 찾았어요.</em><button className="primary" onClick={level===3?onFinish:nextLevel}>{level===3?"오늘 운동 마치기":"다음 단계 도전하기"}</button></div></GameFrame>;
  return <GameFrame title="그림 짝 찾기" icon="🃏" step={level} total={3} onBack={onBack}><div className="quiz"><h2>{level}단계 · 같은 그림을 찾아보세요</h2><p>카드를 한 장씩 눌러 뒤집어요.</p><div className="cards">{cards.map((c,i)=><button key={i} className={open.includes(i)||matched.includes(i)?"open":""} onClick={()=>flip(i)}>{open.includes(i)||matched.includes(i)?c:"?"}</button>)}</div><p className="moves">{matched.length/2}쌍 발견 · {moves}번 시도</p></div></GameFrame>;
}

function MathGame({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const make=(index:number)=>{
    if(index<3){const a=Math.floor(Math.random()*9)+2,b=Math.floor(Math.random()*8)+1,minus=index>0&&Math.random()>.5;return minus?{text:`${Math.max(a,b)} − ${Math.min(a,b)}`,a:Math.abs(a-b),level:"쉬움"}:{text:`${a} + ${b}`,a:a+b,level:"쉬움"}}
    if(index<6){const a=Math.floor(Math.random()*40)+10,b=Math.floor(Math.random()*20)+2,minus=Math.random()>.5;return minus?{text:`${a} − ${Math.min(a,b)}`,a:a-Math.min(a,b),level:"보통"}:{text:`${a} + ${b}`,a:a+b,level:"보통"}}
    if(index<8){const a=Math.floor(Math.random()*70)+20,b=Math.floor(Math.random()*40)+10,minus=Math.random()>.45;return minus?{text:`${Math.max(a,b)} − ${Math.min(a,b)}`,a:Math.abs(a-b),level:"어려움"}:{text:`${a} + ${b}`,a:a+b,level:"어려움"}}
    const a=Math.floor(Math.random()*8)+2,b=Math.floor(Math.random()*8)+2;return{text:`${a} × ${b}`,a:a*b,level:"도전"}
  };
  const [q,setQ]=useState(()=>make(0)),[i,setI]=useState(0),[score,setScore]=useState(0),[picked,setPicked]=useState<number|null>(null); const opts=useMemo(()=>{const values=new Set([q.a]);let offset=1;while(values.size<4){values.add(Math.max(0,q.a+(offset%2?offset:-offset)));offset++}return shuffle([...values])},[q]);
  if(i===10)return <GameFrame title="생활 속 계산" icon="🧮" step={10} total={10} onBack={onBack}><Result score={score} total={10} onFinish={onFinish}/></GameFrame>;
  return <GameFrame title="생활 속 계산" icon="🧮" step={i+1} total={10} onBack={onBack}><div className="quiz"><span className="math-level">{q.level} · {i+1}단계</span><span className="quiz-icon">🛒</span><h2 className="equation">{q.text} = ?</h2><p>문제가 조금씩 어려워져요. 천천히 계산해 보세요.</p><div className="choices two">{opts.map(o=><Choice key={o} onClick={()=>{if(picked===null){setPicked(o);if(o===q.a)setScore(score+1)}}} state={picked!==null?o===q.a?"correct":o===picked?"wrong":"muted":""}>{o}</Choice>)}</div>{picked!==null&&<div className="feedback"><b>{picked===q.a?"정답이에요! 👏":`괜찮아요. 정답은 ${q.a}예요.`}</b><button className="primary" onClick={()=>{const next=i+1;setI(next);if(next<10)setQ(make(next));setPicked(null)}}>{i===9?"결과 보기":"다음 문제"}</button></div>}</div></GameFrame>;
}

function WordGame({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const qs=[{q:"사과와 같은 과일은 무엇일까요?",icon:"🍎",a:"포도",o:["포도","의자","연필"]},{q:"강아지와 같은 동물은 무엇일까요?",icon:"🐶",a:"고양이",o:["고양이","냉장고","구름"]},{q:"비가 올 때 쓰는 것은 무엇일까요?",icon:"🌧️",a:"우산",o:["우산","숟가락","베개"]},{q:"추울 때 입는 것은 무엇일까요?",icon:"❄️",a:"외투",o:["외투","접시","시계"]},{q:"밥을 먹을 때 쓰는 것은 무엇일까요?",icon:"🍚",a:"숟가락",o:["숟가락","모자","수건"]},{q:"봄에 피는 것은 무엇일까요?",icon:"🌸",a:"꽃",o:["꽃","자동차","컵"]},{q:"목이 마를 때 마시는 것은 무엇일까요?",icon:"🥤",a:"물",o:["물","양말","공책"]},{q:"잠을 잘 때 사용하는 것은 무엇일까요?",icon:"🌙",a:"베개",o:["베개","우산","신발"]}];
  const [i,setI]=useState(0),[score,setScore]=useState(0),[picked,setPicked]=useState(""); if(i===qs.length)return <GameFrame title="낱말 친구" icon="🌿" step={qs.length} total={qs.length} onBack={onBack}><Result score={score} total={qs.length} onFinish={onFinish}/></GameFrame>;const q=qs[i];
  return <GameFrame title="낱말 친구" icon="🌿" step={i+1} total={qs.length} onBack={onBack}><div className="quiz"><span className="quiz-icon">{q.icon}</span><h2>{q.q}</h2><p>가장 잘 어울리는 낱말을 골라주세요.</p><div className="choices">{q.o.map(o=><Choice key={o} onClick={()=>{if(!picked){setPicked(o);if(o===q.a)setScore(score+1)}}} state={picked?o===q.a?"correct":o===picked?"wrong":"muted":""}>{o}</Choice>)}</div>{picked&&<div className="feedback"><b>{picked===q.a?"맞아요! 낱말 친구를 잘 찾았어요.":`괜찮아요. 정답은 ${q.a}예요.`}</b><button className="primary" onClick={()=>{setI(i+1);setPicked("")}}>{i===qs.length-1?"결과 보기":"다음 문제"}</button></div>}</div></GameFrame>;
}
