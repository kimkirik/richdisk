export type PictureCategory =
  | "가전제품"
  | "주방용품"
  | "생활용품"
  | "먹을거리"
  | "동물"
  | "옷차림"
  | "학교·놀이"
  | "탈것"
  | "자연";

export type PictureSource =
  | { kind: "asset"; value: string }
  | { kind: "emoji"; value: string };

export type PictureConcept = {
  id: string;
  word: string;
  category: PictureCategory;
  picture: PictureSource;
  family?: string;
};

export type PictureWord = PictureConcept & {
  cardId: string;
  spokenWord: string;
};

const asset = (
  id: string,
  word: string,
  category: PictureCategory,
  filename: string,
  family?: string,
): PictureConcept => ({
  id,
  word,
  category,
  picture: { kind: "asset", value: `./word-images/${filename}.webp` },
  family,
});

const emoji = (
  id: string,
  word: string,
  category: PictureCategory,
  value: string,
  family?: string,
): PictureConcept => ({ id, word, category, picture: { kind: "emoji", value }, family });

/**
 * Every entry is one real, concrete noun with one matching picture. Adjectives
 * and location phrases are deliberately excluded so the prompt stays simple.
 */
export const PICTURE_CONCEPTS: PictureConcept[] = [
  // 가전제품 20
  asset("appliance-fridge", "냉장고", "가전제품", "refrigerator"),
  asset("appliance-washer", "세탁기", "가전제품", "washing-machine"),
  asset("appliance-rice-cooker", "밥솥", "가전제품", "rice-cooker"),
  asset("appliance-microwave", "전자레인지", "가전제품", "microwave"),
  asset("appliance-vacuum", "청소기", "가전제품", "vacuum"),
  asset("appliance-fan", "선풍기", "가전제품", "fan"),
  emoji("appliance-tv", "텔레비전", "가전제품", "📺"),
  emoji("appliance-phone", "휴대전화", "가전제품", "📱"),
  emoji("appliance-desktop", "컴퓨터", "가전제품", "🖥️"),
  emoji("appliance-laptop", "노트북", "가전제품", "💻"),
  emoji("appliance-keyboard", "키보드", "가전제품", "⌨️"),
  emoji("appliance-mouse", "마우스", "가전제품", "🖱️"),
  emoji("appliance-printer", "프린터", "가전제품", "🖨️"),
  emoji("appliance-camera", "카메라", "가전제품", "📷"),
  emoji("appliance-radio", "라디오", "가전제품", "📻"),
  emoji("appliance-bulb", "전구", "가전제품", "💡", "light"),
  emoji("appliance-flashlight", "손전등", "가전제품", "🔦", "light"),
  emoji("appliance-telephone", "전화기", "가전제품", "☎️", "phone"),
  emoji("appliance-headphones", "헤드폰", "가전제품", "🎧"),
  emoji("appliance-calculator", "계산기", "가전제품", "🧮"),

  // 주방용품
  asset("kitchen-spoon", "숟가락", "주방용품", "spoon", "spoon"),
  asset("kitchen-fork", "포크", "주방용품", "fork-single"),
  asset("kitchen-rice-bowl", "밥그릇", "주방용품", "bowl", "bowl"),
  asset("kitchen-plate", "접시", "주방용품", "plate"),
  asset("kitchen-cup", "컵", "주방용품", "cup", "cup"),
  asset("kitchen-pot", "냄비", "주방용품", "pot", "pot"),
  asset("kitchen-pan", "프라이팬", "주방용품", "frying-pan", "pan"),
  emoji("kitchen-knife", "나이프", "주방용품", "🔪"),
  emoji("kitchen-chopsticks", "젓가락", "주방용품", "🥢"),
  emoji("kitchen-teapot", "주전자", "주방용품", "🫖"),
  emoji("kitchen-baby-bottle", "젖병", "주방용품", "🍼", "bottle"),
  emoji("kitchen-jar", "유리병", "주방용품", "🫙", "bottle"),
  emoji("kitchen-salt", "소금통", "주방용품", "🧂"),
  emoji("kitchen-lunchbox", "도시락", "주방용품", "🍱"),
  emoji("kitchen-takeout", "포장 상자", "주방용품", "🥡"),
  emoji("kitchen-straw-cup", "빨대컵", "주방용품", "🥤", "cup"),
  emoji("kitchen-mug", "머그잔", "주방용품", "☕", "cup"),
  emoji("kitchen-milk-glass", "우유잔", "주방용품", "🥛", "cup"),
  emoji("kitchen-ice", "얼음", "주방용품", "🧊"),
  emoji("kitchen-basket", "장보기 바구니", "주방용품", "🧺", "basket"),
  emoji("kitchen-mitt", "오븐 장갑", "주방용품", "🧤", "glove"),
  emoji("kitchen-timer", "주방 타이머", "주방용품", "⏲️", "clock"),
  emoji("kitchen-scale", "주방 저울", "주방용품", "⚖️"),
  emoji("kitchen-can", "통조림", "주방용품", "🥫"),

  // 생활용품 25
  asset("living-scissors", "가위", "생활용품", "scissors"),
  asset("living-toothbrush", "칫솔", "생활용품", "toothbrush"),
  asset("living-umbrella", "우산", "생활용품", "umbrella"),
  emoji("living-soap", "비누", "생활용품", "🧼"),
  emoji("living-sponge", "수세미", "생활용품", "🧽"),
  emoji("living-basket", "빨래 바구니", "생활용품", "🧺", "basket"),
  emoji("living-broom", "빗자루", "생활용품", "🧹"),
  emoji("living-toilet", "변기", "생활용품", "🚽"),
  emoji("living-bathtub", "욕조", "생활용품", "🛁"),
  emoji("living-shower", "샤워기", "생활용품", "🚿"),
  emoji("living-mirror", "거울", "생활용품", "🪞"),
  emoji("living-razor", "면도기", "생활용품", "🪒"),
  emoji("living-tissue", "화장지", "생활용품", "🧻"),
  emoji("living-bucket", "양동이", "생활용품", "🪣"),
  emoji("living-pin", "안전핀", "생활용품", "🧷"),
  emoji("living-key", "열쇠", "생활용품", "🔑", "lock"),
  emoji("living-lock", "자물쇠", "생활용품", "🔒", "lock"),
  emoji("living-toolbox", "공구 상자", "생활용품", "🧰"),
  emoji("living-hammer", "망치", "생활용품", "🔨"),
  emoji("living-screwdriver", "드라이버", "생활용품", "🪛"),
  emoji("living-ladder", "사다리", "생활용품", "🪜"),
  emoji("living-window", "창문", "생활용품", "🪟"),
  emoji("living-door", "문", "생활용품", "🚪"),
  emoji("living-bed", "침대", "생활용품", "🛏️"),
  emoji("living-chair", "의자", "생활용품", "🪑"),

  // 먹을거리 15
  asset("food-apple", "사과", "먹을거리", "apple"),
  asset("food-pear", "배", "먹을거리", "pear"),
  asset("food-grapes", "포도", "먹을거리", "grapes"),
  asset("food-strawberry", "딸기", "먹을거리", "strawberry"),
  emoji("food-banana", "바나나", "먹을거리", "🍌"),
  emoji("food-watermelon", "수박", "먹을거리", "🍉"),
  emoji("food-orange", "귤", "먹을거리", "🍊"),
  emoji("food-peach", "복숭아", "먹을거리", "🍑"),
  emoji("food-pineapple", "파인애플", "먹을거리", "🍍"),
  emoji("food-cherries", "체리", "먹을거리", "🍒"),
  emoji("food-carrot", "당근", "먹을거리", "🥕"),
  emoji("food-corn", "옥수수", "먹을거리", "🌽"),
  emoji("food-tomato", "토마토", "먹을거리", "🍅"),
  emoji("food-bread", "빵", "먹을거리", "🍞"),
  emoji("food-egg", "달걀", "먹을거리", "🥚"),

  // 동물 15
  emoji("animal-dog", "강아지", "동물", "🐶"),
  emoji("animal-cat", "고양이", "동물", "🐱"),
  emoji("animal-rabbit", "토끼", "동물", "🐰"),
  emoji("animal-bear", "곰", "동물", "🐻"),
  emoji("animal-panda", "판다", "동물", "🐼"),
  emoji("animal-lion", "사자", "동물", "🦁"),
  emoji("animal-tiger", "호랑이", "동물", "🐯"),
  emoji("animal-cow", "소", "동물", "🐮"),
  emoji("animal-pig", "돼지", "동물", "🐷"),
  emoji("animal-horse", "말", "동물", "🐴"),
  emoji("animal-sheep", "양", "동물", "🐑"),
  emoji("animal-chicken", "닭", "동물", "🐔"),
  emoji("animal-duck", "오리", "동물", "🦆"),
  emoji("animal-fish", "물고기", "동물", "🐟"),
  emoji("animal-butterfly", "나비", "동물", "🦋"),

  // 옷차림 7
  emoji("clothes-hat", "모자", "옷차림", "👒"),
  emoji("clothes-shirt", "반팔옷", "옷차림", "👕"),
  emoji("clothes-pants", "바지", "옷차림", "👖"),
  emoji("clothes-dress", "원피스", "옷차림", "👗"),
  emoji("clothes-coat", "외투", "옷차림", "🧥"),
  emoji("clothes-socks", "양말", "옷차림", "🧦"),
  emoji("clothes-shoes", "운동화", "옷차림", "👟"),

  // 학교·놀이 6
  emoji("school-book", "책", "학교·놀이", "📘"),
  emoji("school-pencil", "연필", "학교·놀이", "✏️"),
  emoji("school-bag", "책가방", "학교·놀이", "🎒"),
  emoji("school-ruler", "자", "학교·놀이", "📏"),
  emoji("school-crayon", "색연필", "학교·놀이", "🖍️"),
  emoji("school-ball", "축구공", "학교·놀이", "⚽"),

  // 탈것 6
  emoji("transport-car", "자동차", "탈것", "🚗"),
  emoji("transport-bus", "버스", "탈것", "🚌"),
  emoji("transport-bike", "자전거", "탈것", "🚲"),
  emoji("transport-plane", "비행기", "탈것", "✈️"),
  emoji("transport-train", "기차", "탈것", "🚆"),
  emoji("transport-ship", "여객선", "탈것", "🚢"),

  // 자연 6
  emoji("nature-sun", "해", "자연", "☀️"),
  emoji("nature-moon", "달", "자연", "🌙"),
  emoji("nature-cloud", "구름", "자연", "☁️"),
  emoji("nature-rain", "비", "자연", "🌧️"),
  emoji("nature-snowman", "눈사람", "자연", "☃️"),
  emoji("nature-tree", "나무", "자연", "🌳"),
];

export const CLASSIFIED_PICTURE_WORDS: PictureWord[] = PICTURE_CONCEPTS.map((concept) => ({
  ...concept,
  cardId: concept.id,
  spokenWord: concept.word,
}));

export const PICTURE_WORD_COUNT = CLASSIFIED_PICTURE_WORDS.length;

if (new Set(PICTURE_CONCEPTS.map((concept) => concept.id)).size !== PICTURE_CONCEPTS.length
  || new Set(PICTURE_CONCEPTS.map((concept) => concept.word)).size !== PICTURE_CONCEPTS.length) {
  throw new Error("그림 낱말에는 중복된 이름이나 식별자가 없어야 합니다.");
}
