const videoCatalog = [
  {id:'9QCKe-lQQOo',title:'들판에서 뛰노는 강아지 친구들',original:'Dog TV for Dogs to Watch — Puppies Playing',channel:'Dog TV 글로벌',category:'dogs',stimulus:'high',duration:'긴 영상',minutes:600,score:99,why:'다른 강아지의 달리기와 자연 소리가 함께 나와 첫 반응 테스트에 좋아요.'},
  {id:'fP40ZgOiT2Q',title:'강아지 친구·짖는 소리·삑삑이 장난감',original:'Ultimate Dog Video — Dog Sounds & Squeak Toy',channel:'Dog TV 글로벌',category:'dogs',stimulus:'high',duration:'장시간',minutes:480,score:98,why:'강아지 모습과 익숙한 놀이 소리가 동시에 나와 고개를 갸웃할 가능성이 높아요.'},
  {id:'6ZuFA-1A7h4',title:'빠르게 뛰고 노는 강아지들',original:'Fast Boredom-Busting Videos for Dogs',channel:'Relax My Dog',category:'dogs',stimulus:'high',duration:'장시간',minutes:720,score:97,why:'빠른 움직임을 따라보는 강아지에게 특히 재미있는 친구멍 영상이에요.'},
  {id:'NJbRhqFwE-U',title:'사슴·다람쥐·새가 찾아오는 초원',original:'Deer, Squirrels & Birds — Real Nature',channel:'On Sunset Cove',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:96,why:'작고 빠른 동물과 큰 사슴이 번갈아 등장해 시선이 오래 머물기 좋아요.'},
  {id:'H7p3aqkRCnQ',title:'다람쥐 파쿠르 놀이터',original:'Squirrels Parkour TV for Dogs',channel:'Dog TV 글로벌',category:'wildlife',stimulus:'high',duration:'긴 영상',minutes:480,score:95,why:'다람쥐의 급격한 방향 전환이 강아지의 움직임 추적 본능을 자극해요.'},
  {id:'P4KtadP-TFc',title:'민들레 정원의 새와 다람쥐',original:'Happy Birds & Squirrels Nature Fun',channel:'On Sunset Cove',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:94,why:'새의 날갯짓과 다람쥐 움직임, 자연 소리의 균형이 좋아요.'},
  {id:'9besdW9U6Es',title:'뒤뜰에 찾아온 야생동물 친구들',original:'Dodo Dog TV — Backyard Wildlife',channel:'The Dodo',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:93,why:'호숫가와 공원의 실제 동물을 가까운 시점으로 보여줘 호기심을 끌어요.'},
  {id:'yHciULtmhbw',title:'다람쥐·줄무늬다람쥐·새 10시간',original:'Entertain Your Pets with Squirrels, Chipmunks & Birds',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:92,why:'작은 동물이 화면을 자주 가로질러 지루할 틈이 적어요.'},
  {id:'EKoJYVHynNI',title:'여름 호숫가의 빠른 다람쥐와 새',original:'Squirrels & Birds by the Lake',channel:'On Sunset Cove',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:91,why:'물가의 밝은 배경 위로 작은 동물이 선명하게 움직여 알아보기 쉬워요.'},
  {id:'6D1K_bguPrc',title:'새와 다람쥐 관찰 TV',original:'Dog Watch TV — Birds and Squirrel Fun',channel:'On Sunset Cove',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:90,why:'실제 새소리와 반복되지 않는 자연 움직임으로 편안하게 집중해요.'},
  {id:'C7CkHTCGSnw',title:'강아지가 보는 파랑·노랑 애니메이션',original:'Bluey — Animated Cartoon for Dogs',channel:'Dog TV 글로벌',category:'ball',stimulus:'medium',duration:'약 10시간',minutes:600,score:89,why:'강아지가 구분하기 쉬운 파랑·노랑과 부드러운 움직임으로 설계됐어요.'},
  {id:'XYis32N4J50',title:'가을 테니스공 놀이 애니메이션',original:'Dog Cartoon — Autumn Tennis Ball Playtime',channel:'Pibble & Boo',category:'ball',stimulus:'high',duration:'장시간',minutes:720,score:88,why:'노란 공의 움직임이 또렷하고 화면 전환이 비교적 부드러워요.'},
  {id:'pXjfsDC5UTc',title:'다람쥐가 테니스공을 훔쳤다!',original:'Squirrel Steals the Tennis Ball',channel:'Max & Milo TV',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:87,why:'다람쥐와 공이라는 인기 자극 두 가지를 한 화면에서 만나요.'},
  {id:'ETjjq-Q68us',title:'해변에서 파랑 공 가져오기',original:'Dog Cartoon Beach Fetch Adventure',channel:'Dog TV 글로벌',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:86,why:'파랑·노랑 고대비 색과 공 쫓기 움직임이 화면에 계속 이어져요.'},
  {id:'UHs8HY4xP6I',title:'여름 들판 테니스공 추격전',original:'Summer Dog Cartoon — Ball Chase in the Meadow',channel:'Dog TV 글로벌',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:85,why:'탁 트인 들판에서 공과 강아지가 크게 움직여 멀리서도 보기 쉬워요.'},
  {id:'ggQuMNCxago',title:'강아지와 마운트 레이니어 가상 산책',original:'Virtual Dog Sitter — Mount Rainier',channel:'Dog TV 글로벌',category:'walk',stimulus:'medium',duration:'장시간',minutes:480,score:84,why:'파랑·노랑 애니메이션 속 강아지와 함께 천천히 여행하는 구성이에요.'},
  {id:'kv3ML8ckmj8',title:'영국 숲길을 걷는 가상 산책',original:'Virtual Dog Walk with Nature Sounds',channel:'Relax My Dog',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:83,why:'사람 시점의 부드러운 산책 화면과 자연 소리가 차분한 시간을 만들어요.'},
  {id:'Jcdm9Z7HUr0',title:'고요한 숲속 산책 TV',original:'Calming Dog Walking TV — Woodland Walk',channel:'Paul Dinning',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:82,why:'카메라 움직임이 잔잔해 흥분하기 쉬운 강아지의 쉬는 시간에 어울려요.'},
  {id:'N4L7egfFnOI',title:'오리·양·염소·소·토끼 농장 친구',original:'Cute Farm Animals with Real Sounds',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:81,why:'크기와 움직임이 다른 농장 동물이 실제 소리와 함께 차례로 나와요.'},
  {id:'YsTodYhSlqQ',title:'농장 동물들의 진짜 울음소리',original:'Farm Animal Sounds — Dog, Chicken, Sheep & More',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:80,why:'익숙하거나 낯선 동물 소리에 반응하는 강아지의 청각 놀이용이에요.'},
  {id:'b4bnmUB2ggM',title:'숲 가장자리의 새와 자연 소리',original:'Birds at the Edge of the Forest',channel:'Relax My Dog',category:'wildlife',stimulus:'low',duration:'약 8시간',minutes:480,score:79,why:'조용한 새 관찰 화면이라 휴식과 가벼운 호기심을 함께 채워줘요.'},
  {id:'9i71_WTfn-s',title:'꽃밭의 새와 새소리',original:'Birds in the Flower Garden',channel:'Paul Dinning',category:'wildlife',stimulus:'low',duration:'약 8시간',minutes:480,score:78,why:'부드러운 배경과 선명한 새 움직임이 어르신 강아지에게도 부담이 적어요.'},
  {id:'vJk4MmJ-IRY',title:'풀밭 동물과 편안한 자연',original:'Calming TV for Dogs — Animals Grazing',channel:'Relax My Dog',category:'walk',stimulus:'low',duration:'약 10시간',minutes:600,score:77,why:'느리게 움직이는 동물과 자연 풍경이 편안한 배경 TV로 좋아요.'},
  {id:'-7yzLadUdHA',title:'잔잔한 음악과 자연 영상 스트림',original:'Ultimate Relaxing Music & Video for Dogs',channel:'Dog TV 글로벌',category:'walk',stimulus:'low',duration:'라이브·장시간',minutes:1440,score:76,why:'시각 자극이 강하지 않고 음악이 잔잔해 낮잠 전 틀어두기 좋아요.'},
  {id:'jDgznffOUxI',title:'강아지가 고개를 갸웃하는 소리',original:'Sounds That Tilt a Dog’s Head',channel:'n Beats',category:'sound',stimulus:'high',duration:'짧은 영상',minutes:6,score:75,why:'호출음과 강아지 소리에 즉각 반응할 수 있어 반드시 작은 음량으로 시작해요.'},
  {id:'QDY0euyVQLs',title:'강아지가 좋아하는 15가지 소리',original:'15 Sounds Dogs Love to Hear',channel:'Dog Sounds',category:'sound',stimulus:'high',duration:'짧은 영상',minutes:10,score:74,why:'다양한 소리 중 리치가 좋아하는 소리를 찾는 짧은 반응 테스트용이에요.'},
  {id:'T3JsBvzmWNQ',title:'강가에서 노는 귀여운 강아지들',original:'Cute Puppies Playing by the Peaceful River',channel:'Puppy Fun TV',category:'dogs',stimulus:'medium',duration:'약 24시간',minutes:1440,score:73,why:'강아지 친구와 물 움직임을 부드러운 애니메이션으로 보여줘요.'},
  {id:'E3F5HxgNt0Q',title:'파랑·노랑 해변 모험',original:'Cartoons for Dogs in Colors Dogs Can See',channel:'Dog TV 글로벌',category:'ball',stimulus:'medium',duration:'장시간',minutes:720,score:72,why:'강아지가 보기 쉬운 색 위주로 구성된 편안한 해변 애니메이션이에요.'},
  {id:'FLbo9f9KckQ',title:'파랑·노랑 24시간 해변 놀이',original:'24 Hours of Cartoon for Dogs — Beach Adventure',channel:'Dog TV 글로벌',category:'ball',stimulus:'medium',duration:'약 24시간',minutes:1440,score:71,why:'명확한 색 대비와 매끈한 움직임을 오래 이어 보는 배경 영상이에요.'},
  {id:'OaaKdKW1NnI',title:'혼자 있는 강아지를 위한 편안한 애니',original:'Best Dog TV for Dogs Home Alone',channel:'Dog TV 글로벌',category:'dogs',stimulus:'low',duration:'긴 영상',minutes:600,score:70,why:'잔잔한 음악과 강아지 애니메이션을 섞어 쉬는 시간에 틀기 좋아요.'}
];

videoCatalog.push(
  {id:'EF_c_TQDdJk',title:'짖는 친구와 삑삑이 장난감 놀이',original:'Entertaining Dog Videos — Bark & Squeak Toy',channel:'Doggy Daycare TV',category:'dogs',stimulus:'high',duration:'장시간',minutes:480,score:97,why:'강아지 움직임과 짖는 소리, 삑삑이 소리가 이어져 즉각적인 반응을 끌기 좋아요.'},
  {id:'MfuN5uT6b3I',title:'진짜 강아지들의 산책·놀이·탐색',original:'Real Dogs Barking, Playing & Exploring',channel:'Doggy Woods Retreat',category:'dogs',stimulus:'high',duration:'약 12시간',minutes:720,score:96,why:'실제 강아지가 뛰고 냄새 맡고 짖는 장면을 길게 담아 친구를 만난 듯한 느낌을 줘요.'},
  {id:'FRWUrv0Iiwc',title:'강아지 유치원 하루 종일 보기',original:'Entertaining Doggy Daycare TV',channel:'Doggy Woods Retreat',category:'dogs',stimulus:'high',duration:'약 7시간',minutes:446,score:94,why:'여러 강아지가 함께 움직이는 장면이 많아 사회적인 영상에 반응하는 아이에게 좋아요.'},
  {id:'4-XPlXE1Q2o',title:'7시간 동안 신나게 노는 강아지들',original:'Dogs Playing for 7 Hours',channel:'YouTube 글로벌',category:'dogs',stimulus:'high',duration:'약 7시간',minutes:420,score:93,why:'달리기와 장난치기가 계속되어 다른 강아지를 좋아하는 리치의 시선을 끌기 좋아요.'},
  {id:'w1iz2X8OsAc',title:'새끼 강아지들의 짖는 소리 모음',original:'Puppies Barking — Video for Dogs',channel:'1001 Dog Videos',category:'dogs',stimulus:'high',duration:'긴 영상',minutes:600,score:91,why:'화면 속 강아지와 여러 높이의 짖는 소리가 함께 나와 청각 반응 테스트에 알맞아요.'},
  {id:'3zahxsJHrv8',title:'강아지들의 12시간 모험',original:'Dog TV — 12 Hours Adventures for Dogs',channel:'Daycare for Your Dog',category:'dogs',stimulus:'medium',duration:'약 12시간',minutes:720,score:90,why:'진짜 강아지와 바깥 활동을 번갈아 보여줘 혼자 있는 시간의 지루함을 줄여줘요.'},
  {id:'Geq5ii1km8c',title:'하루 종일 보는 강아지 친구와 자연',original:'All-Day Entertainment for Dogs',channel:'YouTube 글로벌',category:'dogs',stimulus:'medium',duration:'약 12시간',minutes:720,score:79,why:'강아지 장면과 잔잔한 음악을 섞어 놀이와 휴식 사이에 틀기 좋아요.'},
  {id:'6-5rxfXGk4Y',title:'혼자 있을 때 보는 라이브 멍TV',original:'Live Dog TV for Dogs Home Alone',channel:'YouTube 글로벌',category:'dogs',stimulus:'low',duration:'라이브·장시간',minutes:1440,score:76,why:'부드러운 음악과 강아지용 장면을 길게 이어 편안한 배경 TV로 사용할 수 있어요.'},

  {id:'Y0w0cuHs6xk',title:'토끼와 다람쥐가 찾아오는 뒤뜰',original:'Bunnies & Squirrels — Backyard Animals',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:95,why:'토끼의 큰 움직임과 다람쥐의 빠른 움직임이 번갈아 나와 지루할 틈이 적어요.'},
  {id:'zupaflE-AY0',title:'숲속 새와 다람쥐 궁극의 멍TV',original:'The Ultimate Video for Dogs — Fun in the Forest',channel:'Paul Dinning',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:490,score:95,why:'수천만 회 시청된 실제 숲 영상으로 작은 동물과 자연 소리가 균형 있게 이어져요.'},
  {id:'AnqhzNqZaog',title:'사슴·새·다람쥐가 함께 사는 숲',original:'Cat TV for Pets & People',channel:'On Sunset Cove',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:93,why:'크기가 다른 야생동물이 가까이 등장해 화면 속 대상을 찾는 재미가 있어요.'},
  {id:'RknXKnM8TCU',title:'정원 새를 가까이 보는 8시간',original:'Relaxing Garden Birds for Dogs',channel:'4K Birdsong Station',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:92,why:'새의 날갯짓과 지저귐이 선명해 작은 움직임을 좋아하는 강아지에게 잘 맞아요.'},
  {id:'UT6oisYJZzw',title:'가을 정원의 토끼·다람쥐·새',original:'Dog & Cat TV — Bunnies, Squirrels & Birds',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:91,why:'화면을 가로지르는 토끼와 다람쥐, 새의 움직임이 다양하게 펼쳐져요.'},
  {id:'mmH_NQ7yP0Y',title:'야생동물을 만나는 사파리 멍TV',original:'Safari TV for Dogs',channel:'Great Music for Dogs',category:'wildlife',stimulus:'medium',duration:'약 8시간',minutes:480,score:89,why:'평소 보기 힘든 큰 동물을 넓은 화면으로 보여줘 새로운 시각 자극이 돼요.'},
  {id:'4NjvPeIInFA',title:'가을 초원의 사슴 관찰',original:'Deer in an Autumn Meadow',channel:'Four Paws TV',category:'wildlife',stimulus:'low',duration:'약 8시간',minutes:480,score:88,why:'사슴의 느리고 큰 움직임이 화면을 편안하게 따라가도록 도와줘요.'},
  {id:'50QYpYF8Q-c',title:'다람쥐·토끼·새 10시간 무중단',original:'Squirrels, Bunnies & Birds — Pet TV',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:87,why:'작은 야생동물이 쉬지 않고 등장하는 자연 관찰형 영상이에요.'},
  {id:'AgsYoc9aYQI',title:'장난꾸러기 다람쥐와 숲속 친구',original:'Bossy Squirrels, Deer & Forest Birds',channel:'On Sunset Cove',category:'wildlife',stimulus:'high',duration:'약 8시간',minutes:480,score:86,why:'다람쥐가 가까이 다가오고 빠르게 움직여 화면 추적 반응을 보기 좋아요.'},
  {id:'spjknBaCwt0',title:'티키바에 찾아온 새와 다람쥐',original:'Tiki Bar — Cat & Dog TV',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:84,why:'밝은 공간에 작은 동물이 또렷하게 나타나 멀리서도 움직임을 찾기 쉬워요.'},
  {id:'nYpdFLJIu74',title:'뒤뜰 동물들의 여름 하루',original:'10 Hour Pet TV — Backyard Animals',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:83,why:'자연스러운 새소리와 반복되지 않는 동물 행동이 편안한 호기심을 유지해요.'},
  {id:'z3xkR1HN5qU',title:'창문 너머 알록달록한 숲새',original:'Birds Through the Window',channel:'Paul Dinning',category:'wildlife',stimulus:'low',duration:'약 8시간',minutes:480,score:82,why:'창가에 앉아 새를 보는 듯한 시점이라 조용한 관찰 시간을 만들기 좋아요.'},
  {id:'oxBC-t16Gcc',title:'숫사슴·암사슴과 숲속 새',original:'Real Nature with Buck, Doe & Birds',channel:'On Sunset Cove',category:'wildlife',stimulus:'low',duration:'약 8시간',minutes:480,score:81,why:'큰 사슴과 작은 새가 교대로 등장해 화면 변화가 과하지 않으면서도 다양해요.'},
  {id:'4pbfX8VwamY',title:'겨울 숲 동물들의 크리스마스',original:'Festive Dog Entertainment',channel:'Farm Dog TV',category:'wildlife',stimulus:'medium',duration:'약 5시간',minutes:317,score:78,why:'겨울 풍경 속 동물과 자연 소리를 담아 계절이 달라도 즐겁게 볼 수 있어요.'},

  {id:'hC9r9y29lpA',title:'개·고양이·양·말 농장 소리',original:'Farm Animal Sounds — Dog, Cat, Sheep & Horse',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:85,why:'여러 동물의 실제 울음소리와 얼굴이 함께 나와 소리의 주인을 찾는 재미가 있어요.'},
  {id:'UYyPPis5a1s',title:'개·고양이·닭·돼지·소의 농장',original:'Farm Animal Habitats',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:84,why:'농장 환경과 동물 행동을 차분하게 보여줘 낯선 동물에 익숙해지는 데 좋아요.'},
  {id:'XZqqTFg7OUA',title:'신나는 음악과 행복한 농장동물',original:'Farm Animals with Happy Music',channel:'Farm Dog TV',category:'farm',stimulus:'high',duration:'긴 영상',minutes:240,score:82,why:'농장동물 움직임에 경쾌한 소리가 더해져 활동적인 시간에 잘 어울려요.'},
  {id:'_tDLsWiYwgE',title:'농장 편 멍TV',original:'TV for Dogs & Cats — Farm Edition',channel:'Four Paws TV',category:'farm',stimulus:'medium',duration:'약 10시간',minutes:600,score:81,why:'닭과 염소 등 작은 농장동물이 자주 움직여 화면을 따라보기 좋아요.'},
  {id:'3gHaCgq3HnM',title:'바닷가 초원에서 쉬는 소들',original:'Cows at the Coast',channel:'Paul Dinning',category:'farm',stimulus:'low',duration:'약 8시간',minutes:492,score:80,why:'소의 느린 움직임과 바닷가 풍경이 어우러져 흥분 없이 오래 보기 좋아요.'},
  {id:'C_Pc9ZIrzp8',title:'개·닭·토끼·오리·고양이 소리',original:'Farm Animal Sounds — Dog, Chicken & Rabbit',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:78,why:'작은 동물과 실제 소리를 빠르게 비교해 보는 청각·시각 놀이 영상이에요.'},
  {id:'5Gi1uZu9tWE',title:'풀을 뜯는 소들과 8시간 휴식',original:'Relaxing Grazing Cows',channel:'Paul Dinning',category:'farm',stimulus:'low',duration:'약 8시간',minutes:480,score:76,why:'느긋하게 풀을 뜯는 큰 동물을 보여줘 낮잠 전 잔잔한 배경으로 좋아요.'},
  {id:'xZJ_v5TlCuM',title:'소·고양이·닭·개 농장 모음',original:'Cute Farm Animals Compilation',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:75,why:'여러 종류의 동물이 짧게 교대해 한 대상에 싫증 나는 강아지에게 알맞아요.'},
  {id:'UYAFLkQ1KJo',title:'코끼리·말·소·양·토끼의 소리',original:'Animal Farm Sounds',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:74,why:'몸집이 크게 다른 동물들의 모습과 소리를 함께 경험할 수 있어요.'},
  {id:'AijIquoFx8Q',title:'개·염소·양·말·소·고양이',original:'Dog, Goat, Sheep, Horse & Cow Sounds',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:73,why:'강아지가 알아차리기 쉬운 실제 동물 소리 위주로 구성된 농장 영상이에요.'},
  {id:'tRblujixQAM',title:'초원을 걷는 말과 자연',original:'Relax with Nature and Horses',channel:'Paul Dinning',category:'farm',stimulus:'low',duration:'긴 영상',minutes:480,score:72,why:'말의 크고 규칙적인 움직임과 자연 풍경이 차분한 시각 자극을 줘요.'},
  {id:'uysh4mXAzgs',title:'소를 바라보며 쉬는 8시간',original:'Cows Relaxation for Dogs',channel:'Paul Dinning',category:'farm',stimulus:'low',duration:'약 8시간',minutes:480,score:71,why:'화면 전환이 적고 움직임이 느려 민감한 강아지의 편안한 시간에 어울려요.'},
  {id:'m9EljjF0xbM',title:'오리·닭·소·양과 보내는 하루',original:'Spending Time with Farm Animals',channel:'YouTube 글로벌',category:'farm',stimulus:'low',duration:'긴 영상',minutes:240,score:70,why:'평화로운 농장의 다양한 동물을 자연스러운 속도로 보여줘요.'},
  {id:'tlPVMZfxNY0',title:'말·개·닭·거북이·양의 생활',original:'Farm Animal Life',channel:'Farm Dog TV',category:'farm',stimulus:'medium',duration:'긴 영상',minutes:240,score:69,why:'뛰는 동물과 느린 동물이 섞여 리치가 좋아하는 움직임을 찾기 좋아요.'},
  {id:'Yf89N9kzSc4',title:'돼지·양·닭·소의 편안한 농장',original:'Cow, Pig, Sheep & Chicken',channel:'Farm Dog TV',category:'farm',stimulus:'low',duration:'긴 영상',minutes:240,score:67,why:'잔잔한 농장 풍경과 동물 소리를 부담 없이 틀어둘 수 있어요.'},

  {id:'IhdsYzHSpnw',title:'강아지가 보는 파랑·노랑 만화',original:'Cartoons for Dogs in Colors They Can See',channel:'Cartoon Dog Music',category:'ball',stimulus:'medium',duration:'장시간',minutes:720,score:90,why:'강아지가 구분하기 쉬운 색과 큼직한 움직임을 사용한 전용 애니메이션이에요.'},
  {id:'eQM_n7S-6ys',title:'파랑 물결 수영장과 공놀이',original:'Wave Pool Cartoon in Blue & Yellow',channel:'Dog TV 글로벌',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:89,why:'파란 물과 밝은 공의 대비가 커서 움직이는 대상을 또렷하게 따라볼 수 있어요.'},
  {id:'X0qG_xojcV8',title:'수백만 강아지가 본 편안한 컬러 만화',original:'Cartoons Loved by Millions of Dogs',channel:'Siesta Dog TV',category:'ball',stimulus:'medium',duration:'장시간',minutes:720,score:88,why:'파랑·노랑 중심 화면과 부드러운 움직임을 섞어 자극과 휴식의 균형이 좋아요.'},
  {id:'1M-9LTx-Ml4',title:'뒷마당 테니스공 추격전',original:'24 Hour Dog Cartoon — Tennis Ball Chase',channel:'Max & Milo TV',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:87,why:'밝은 공이 화면을 크게 튕기며 이동해 공을 좋아하는 강아지에게 잘 맞아요.'},
  {id:'coWZlLAtfM0',title:'편안한 음악과 강아지 색 만화',original:'Cartoons in Dog Colors with Calming Music',channel:'TV for Dogs',category:'ball',stimulus:'low',duration:'약 8시간',minutes:480,score:85,why:'파랑·노랑 애니메이션과 잔잔한 음악을 함께 사용해 쉬는 시간에 좋아요.'},
  {id:'w28bCvGF7r0',title:'재미와 휴식을 섞은 강아지 만화',original:'Cartoons for Dogs to Relax & Have Fun',channel:'Cartoon Dog Music',category:'ball',stimulus:'medium',duration:'장시간',minutes:720,score:84,why:'큰 캐릭터와 선명한 색을 부드럽게 움직여 부담 없이 시선을 끌어요.'},
  {id:'kghLSzWHiuE',title:'해변 테니스공 쫓기 24시간',original:'Beach Tennis Ball Chase',channel:'Max & Milo TV',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:83,why:'해변의 파란 물과 공 쫓기 동작이 빠르게 이어져 활동적인 강아지에게 좋아요.'},
  {id:'3mOWdcPZyRw',title:'12시간 파랑·노랑 편안한 만화',original:'Dog Cartoon — Calming TV',channel:'Dog TV 글로벌',category:'ball',stimulus:'low',duration:'약 12시간',minutes:720,score:82,why:'부드러운 음악과 보기 쉬운 색을 사용해 장시간 배경으로 틀기 좋아요.'},
  {id:'wcQK_3N1FHo',title:'맥스와 마일로의 12시간 모험',original:'12 Hour Cartoon for Dogs',channel:'Max & Milo TV',category:'ball',stimulus:'medium',duration:'약 12시간',minutes:720,score:81,why:'강아지 캐릭터와 여러 동물, 공놀이 장면이 번갈아 나와 다양해요.'},
  {id:'PAndnjZyVxI',title:'하루 종일 보는 지루함 탈출 만화',original:'Anti-Boredom Videos for Dogs',channel:'Dog TV 글로벌',category:'ball',stimulus:'medium',duration:'약 24시간',minutes:1440,score:80,why:'색 대비가 큰 물체가 계속 움직여 혼자 있는 시간의 가벼운 시각 놀이가 돼요.'},
  {id:'ak3KQRpoqv8',title:'강아지 둘과 숨겨진 테니스공',original:'Calming Music & Tennis Ball Adventure',channel:'Max & Milo TV',category:'ball',stimulus:'medium',duration:'약 24시간',minutes:1440,score:79,why:'강아지 친구와 다람쥐, 공을 한 이야기 안에 넣어 관심 대상을 다양하게 만들어요.'},
  {id:'Hsn4bB6iINY',title:'혼자 있는 강아지를 위한 컬러 만화',original:'Best Dog Cartoon for Puppy Home Alone',channel:'Cartoon for Dog',category:'ball',stimulus:'low',duration:'장시간',minutes:720,score:78,why:'보기 쉬운 색과 잔잔한 음악을 사용해 흥분보다 안정이 필요한 시간에 좋아요.'},
  {id:'7a5SpyDuZi4',title:'차분한 음악과 파랑·노랑 캐릭터',original:'Cartoons for Dogs with Calm Music',channel:'Cartoon for Dog',category:'ball',stimulus:'low',duration:'장시간',minutes:720,score:77,why:'느린 화면 전환과 강아지 친화 색으로 편안하게 바라보기 좋아요.'},
  {id:'bA7Oz6MB13c',title:'파란 수영장에서 공 쫓기',original:'Pool Playtime in Colors Dogs Can See',channel:'Max & Milo TV',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:76,why:'밝은 파란 수영장과 공의 이동이 선명해 여름철 신나는 영상으로 잘 맞아요.'},
  {id:'S6fc8S18k9o',title:'새끼 강아지를 위한 편안한 만화',original:'Best Dog Cartoon for Puppies Home Alone',channel:'Cartoon for Dog',category:'ball',stimulus:'low',duration:'장시간',minutes:720,score:75,why:'귀여운 강아지 캐릭터와 안정적인 음악을 사용해 어린 강아지도 편하게 볼 수 있어요.'},
  {id:'XFy65xMorA4',title:'가을 테니스공 모험 12시간',original:'Autumn Fun & Tennis Ball Adventures',channel:'Dog TV 글로벌',category:'ball',stimulus:'high',duration:'약 12시간',minutes:720,score:74,why:'가을 공원에서 공을 쫓는 큰 움직임이 길게 이어지는 활동형 만화예요.'},
  {id:'94qyGEG3j-Y',title:'혼자 있는 시간용 강아지 색 TV',original:'Anti-Separation Anxiety TV for Dogs',channel:'Cartoon Dog Music',category:'ball',stimulus:'low',duration:'장시간',minutes:720,score:73,why:'파랑·노랑 화면과 편안한 소리를 섞어 보호자가 자리를 비운 시간에 틀기 좋아요.'},
  {id:'RFgitoAkQQ4',title:'다람쥐와 공을 쫓는 시골길 모험',original:'Squirrel Chase and Ball Play',channel:'Max & Milo TV',category:'ball',stimulus:'high',duration:'약 24시간',minutes:1440,score:72,why:'빠른 다람쥐와 밝은 공이 함께 달려 추적 본능을 자극해요.'},
  {id:'8jDaq1CNRP8',title:'루나와 친구들의 수영장 파티',original:'Pool BBQ Party for Luna and Friends',channel:'Puppy Calm TV',category:'ball',stimulus:'medium',duration:'장시간',minutes:720,score:71,why:'파랑 수영장과 여러 강아지 캐릭터가 부드럽게 움직이는 여유로운 만화예요.'},
  {id:'qDb1FNFeu7g',title:'골든과 코기의 다람쥐 추격전',original:'Golden & Corgi Chase a Squirrel',channel:'Dog TV 글로벌',category:'ball',stimulus:'high',duration:'장시간',minutes:720,score:70,why:'화면 속 강아지 두 마리와 다람쥐, 공놀이까지 한꺼번에 볼 수 있어요.'},
  {id:'IzwuDuETocI',title:'맥스와 마일로의 해변 공놀이',original:'Relaxing & Fun Beach TV for Dogs',channel:'Max & Milo TV',category:'ball',stimulus:'medium',duration:'약 24시간',minutes:1440,score:69,why:'파란 바다와 튀는 공, 부드러운 캐릭터 움직임을 길게 이어가요.'},

  {id:'4Br96OA9h7g',title:'자연 소리와 함께 걷는 가상 숲길',original:'Virtual Dog Walk with Nature Sounds',channel:'Harmony Hounds',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:82,why:'사람과 함께 걷는 시점의 숲길과 자연 소리가 차분한 대리 산책 느낌을 줘요.'},
  {id:'2fjKOK76FAs',title:'피아노·새소리·숲소리 휴식',original:'Naturally Calm Piano, Birds & Forest',channel:'Relax My Dog',category:'walk',stimulus:'low',duration:'긴 영상',minutes:600,score:80,why:'부드러운 피아노와 자연 소리가 화면의 숲 풍경과 어우러져 낮잠 전에 좋아요.'},
  {id:'diYi2YbrnLk',title:'안개 낀 영국 숲길 24시간',original:'Foggy Forest Dog Walk TV',channel:'Harmony Hounds',category:'walk',stimulus:'low',duration:'라이브·장시간',minutes:1440,score:78,why:'안개 낀 숲을 천천히 걷는 화면이라 자극에 민감한 강아지에게 편안해요.'},
  {id:'FXVRJY8pX78',title:'차분하게 보는 숲 산책',original:'Forest Walk with Nature Sounds',channel:'Harmony Hounds',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:77,why:'급한 장면 전환 없이 숲길과 새소리를 이어가 차분한 분위기를 만들어요.'},
  {id:'c3XIme9TsIY',title:'물가를 따라 걷는 가상 산책',original:'Virtual Dog Walk Along the Water',channel:'Harmony Hounds',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:76,why:'물소리와 일정한 걸음 속도가 함께해 편안하게 바라보기 좋은 산책 영상이에요.'},
  {id:'jUljDYovpVU',title:'부드러운 폭포와 자연 휴식',original:'Calm Dog TV with Gentle Waterfalls',channel:'Paul Dinning',category:'walk',stimulus:'low',duration:'약 8시간',minutes:490,score:74,why:'흐르는 물의 반복 움직임과 자연 소리가 긴장을 낮추는 배경이 돼요.'},
  {id:'kHlGUE-VsEc',title:'새와 함께 걷는 6시간 숲길',original:'6 Hour Forest Walk Dog TV',channel:'Daycare for Your Dog',category:'walk',stimulus:'low',duration:'약 6시간',minutes:360,score:73,why:'숲길 산책 중간중간 새가 나타나 잔잔함 속에서도 작은 볼거리를 줘요.'},
  {id:'LUH6w414QHc',title:'오래된 숲속 가상 산책',original:'Virtual Walk through Ancient Woodland',channel:'Harmony Hounds',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:72,why:'고목과 숲길을 부드럽게 지나가며 자연의 깊은 소리를 들려줘요.'},
  {id:'nm5-Ci3CqW0',title:'영국 마우스홀 항구 산책',original:'Virtual Dog Walk around Mousehole',channel:'Paul Dinning',category:'walk',stimulus:'medium',duration:'긴 영상',minutes:480,score:71,why:'숲과 다른 항구 풍경, 사람과 새의 움직임을 함께 볼 수 있는 가상 산책이에요.'},
  {id:'9UPgVIqcOzs',title:'기분 전환용 HD 가상 멍TV',original:'HD Virtual Dog TV',channel:'YouTube 글로벌',category:'walk',stimulus:'medium',duration:'긴 영상',minutes:480,score:70,why:'자연과 동물 장면을 적당한 속도로 섞어 짧은 기분 전환용으로 좋아요.'},
  {id:'pDarkh5RJbA',title:'편안한 음악이 흐르는 가상 멍TV',original:'The Best Virtual TV for Dogs',channel:'YouTube 글로벌',category:'walk',stimulus:'low',duration:'긴 영상',minutes:600,score:68,why:'잔잔한 음악과 편안한 자연 화면을 이어 틀어두는 휴식 모드 영상이에요.'},
  {id:'irjUXgvMBR4',title:'편안한 음악과 잔잔한 화면',original:'Relax My Dog TV with Calming Music',channel:'YouTube 글로벌',category:'walk',stimulus:'low',duration:'긴 영상',minutes:600,score:66,why:'강한 소리나 빠른 장면이 적어 조용한 저녁이나 낮잠 시간에 어울려요.'}
);

videoCatalog.push(
  {id:'nYcHi9EgUHs',title:'졸졸 흐르는 시냇가에서 쉬는 8시간',original:'Relax Your Dog TV at the Babbling Brook',channel:'Paul Dinning',category:'walk',stimulus:'low',duration:'약 8시간',minutes:480,score:86,why:'잔잔한 시냇물과 숲의 움직임이 편안한 휴식 시간을 만들어줘요.'},
  {id:'A8Padaq7BOQ',title:'혼자 있는 강아지를 위한 12시간 휴식',original:'Anti-Anxiety Video for Dogs Home Alone',channel:'Heal My Dog',category:'walk',stimulus:'low',duration:'약 12시간',minutes:720,score:85,why:'부드러운 음악과 느린 화면으로 혼자 있는 시간을 차분하게 채워줘요.'},
  {id:'t36lxBkp-Mc',title:'숲속 시냇가의 다람쥐·까마귀·사슴',original:'Forest Stream with Squirrels, Crows and Deer',channel:'Four Paws TV',category:'wildlife',stimulus:'medium',duration:'약 10시간',minutes:600,score:90,why:'크기와 속도가 다른 야생동물이 자연스럽게 번갈아 등장해요.'},
  {id:'ze869tziyg4',title:'지루함을 날리는 강아지 유치원 TV',original:'Dog Daycare TV — Entertainment for Dogs',channel:'Farm Dog TV',category:'dogs',stimulus:'high',duration:'긴 영상',minutes:480,score:92,why:'다른 강아지의 놀이와 움직임이 활발하게 이어져 친구를 보는 재미가 있어요.'},
  {id:'sRrwWpywwXg',title:'8시간 신나는 강아지 놀이 TV',original:'8 Hours of Fun TV for Dogs',channel:'Relax My Dog',category:'dogs',stimulus:'high',duration:'약 8시간',minutes:480,score:91,why:'강아지가 좋아할 만한 움직임과 소리를 긴 시간 다양하게 보여줘요.'},
  {id:'6THahHTu2vA',title:'강아지 친구들의 12시간 모험',original:'12 Hours Adventures for Dogs',channel:'Doggy Woods Retreat',category:'dogs',stimulus:'medium',duration:'약 12시간',minutes:720,score:90,why:'강아지 친구와 야외 모험을 번갈아 보여줘 지루할 틈이 적어요.'},
  {id:'D-9yt0kgQE4',title:'하루 종일 보는 강아지 친구와 음악',original:'All Day Entertainment for Dogs',channel:'Farm Dog TV',category:'dogs',stimulus:'low',duration:'장시간',minutes:720,score:84,why:'강아지 장면과 편안한 음악을 섞어 놀이와 휴식 사이에 틀기 좋아요.'},
  {id:'QMq2Q6hXZPI',title:'꿈나라로 가는 8시간 강아지 음악',original:'8 Hours of Soothing Music for Dogs',channel:'Paws in Peace',category:'walk',stimulus:'low',duration:'약 8시간',minutes:480,score:79,why:'부드러운 소리와 안정적인 화면이 낮잠 전 긴장을 낮춰줘요.'},
  {id:'UWMvUagF2Vc',title:'카메라 가까이 온 다람쥐',original:'Squirrels for Dogs — Close Nibble',channel:'Squirrels for Dogs',category:'wildlife',stimulus:'high',duration:'긴 영상',minutes:480,score:88,why:'다람쥐의 얼굴과 먹는 움직임이 화면 가득 보여 시선을 끌어요.'},
  {id:'04eJAzAJLl4',title:'보호자를 기다리며 보는 편안 멍TV',original:'Dog TV While You Are Away',channel:'Pawful Dreams',category:'walk',stimulus:'low',duration:'긴 영상',minutes:480,score:78,why:'분리불안이 있는 시간에 과하지 않은 음악과 화면을 제공해요.'},
  {id:'qyhdLcS10CY',title:'가을 숲 사슴 자연극장 10시간',original:'Autumn Deer Nature TV',channel:'Four Paws TV',category:'wildlife',stimulus:'low',duration:'약 10시간',minutes:600,score:87,why:'가을 숲의 사슴과 잔잔한 자연 소리를 차분하게 감상할 수 있어요.'}
);

// YouTube 소유자가 외부 사이트 재생을 막은 영상은 카드에서 제외한다.
const blockedEmbedIds=new Set(['YsTodYhSlqQ','-7yzLadUdHA','N4L7egfFnOI','QDY0euyVQLs','hC9r9y29lpA','UYyPPis5a1s','xZJ_v5TlCuM','AijIquoFx8Q','tlPVMZfxNY0','Yf89N9kzSc4','diYi2YbrnLk']);
const videos=videoCatalog.filter(video=>!blockedEmbedIds.has(video.id));

const categoryNames={dogs:'친구멍',wildlife:'새·다람쥐',ball:'공·애니',walk:'자연산책',farm:'농장친구',sound:'소리반응'};
const stimulusNames={high:'신나요',medium:'적당해요',low:'잔잔해요'};
const stimulusOrder={low:1,medium:2,high:3};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const safeParse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let favorites=new Set(safeParse('richDogTvFavorites',[]).filter(id=>videos.some(video=>video.id===id)));
let reactions=safeParse('richDogTvReactions',{});
let watchHistory=safeParse('richDogTvHistory',[]).filter(id=>videos.some(video=>video.id===id)).slice(0,videos.length);
let currentId=watchHistory[0]||videos[0].id;
let currentList=[...videos];
let favoriteOnly=false;
let toastTimer;
let watchTimer;
let timerRemaining=0;
let visibleLimit=100;
const pageSize=100;

function reactionValue(reaction,strong=false){
  const values=strong?{wag:8,watch:4,ignore:-10}:{wag:3,watch:2,ignore:-4};
  return values[reaction]||0;
}

function personalScore(video){
  let learnedBonus=0;
  Object.entries(reactions).forEach(([id,reaction])=>{
    const watched=videos.find(item=>item.id===id);if(!watched)return;
    if(watched.category===video.category)learnedBonus+=reactionValue(reaction);
    if(watched.stimulus===video.stimulus)learnedBonus+=Math.round(reactionValue(reaction)/2);
  });
  learnedBonus=Math.max(-12,Math.min(12,learnedBonus));
  return Math.max(40,Math.min(100,video.score+learnedBonus+reactionValue(reactions[video.id],true)));
}

function saveLocal(){
  try{
    localStorage.setItem('richDogTvFavorites',JSON.stringify([...favorites]));
    localStorage.setItem('richDogTvReactions',JSON.stringify(reactions));
    localStorage.setItem('richDogTvHistory',JSON.stringify(watchHistory));
  }catch{
    showToast('이 브라우저에서는 찜 기록을 저장할 수 없어요.');
  }
}

function showToast(message){
  const toast=$('#toast');toast.textContent=message;toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
}

function getFilteredVideos(){
  const query=$('#searchInput').value.trim().toLowerCase();
  const category=$('#categorySelect').value;
  const stimulus=$('#stimulusSelect').value;
  const sort=$('#sortSelect').value;
  let list=videos.filter(v=>{
    const haystack=`${v.title} ${v.original} ${v.channel} ${v.why}`.toLowerCase();
    return(!query||haystack.includes(query))&&(category==='all'||v.category===category)&&(stimulus==='all'||v.stimulus===stimulus)&&(!favoriteOnly||favorites.has(v.id));
  });
  list.sort((a,b)=>{
    if(sort==='rich')return personalScore(b)-personalScore(a)||b.score-a.score;
    if(sort==='calm')return stimulusOrder[a.stimulus]-stimulusOrder[b.stimulus]||b.score-a.score;
    if(sort==='active')return stimulusOrder[b.stimulus]-stimulusOrder[a.stimulus]||b.score-a.score;
    if(sort==='duration')return a.minutes-b.minutes;
    return b.score-a.score;
  });
  return list;
}

function cardTemplate(v,index){
  const score=personalScore(v);
  const watched=watchHistory.includes(v.id);
  return `<article class="video-card ${index<3?'top-three':''} ${watched?'watched':''}">
    <button class="thumb-button" type="button" data-play="${v.id}" aria-label="${v.title} 재생">
      <span class="rank-badge">TOP ${String(index+1).padStart(2,'0')}</span>
      ${watched?'<span class="watched-mark">✓ 봤어요</span>':''}
      <span class="thumb-fallback" aria-hidden="true">미리보기 준비 중</span>
      <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${v.title} 미리보기" loading="lazy" decoding="async">
      <span class="duration-badge">${v.duration}</span>
    </button>
    <div class="card-body">
      <div class="card-meta"><span class="card-kind">${categoryNames[v.category]}</span><span class="score">추천 <b>${score}</b>점</span></div>
      <h3>${v.title}</h3><p class="channel">YouTube 영상 · 소리는 작게 시작</p><p class="why">${v.why}</p>
      <div class="card-footer"><span class="stimulus" data-level="${v.stimulus}"><i></i>${stimulusNames[v.stimulus]}</span><button class="favorite-button ${favorites.has(v.id)?'active':''}" type="button" data-favorite="${v.id}" aria-pressed="${favorites.has(v.id)}" aria-label="${v.title} ${favorites.has(v.id)?'찜 해제':'리치찜'}">★</button></div>
    </div>
  </article>`;
}

function render(resetPage=false){
  if(resetPage)visibleLimit=pageSize;
  currentList=getFilteredVideos();
  const visibleVideos=currentList.slice(0,visibleLimit);
  $('#videoGrid').innerHTML=visibleVideos.map(cardTemplate).join('');
  $('#resultCount').textContent=currentList.length;
  $('#favoriteCount').textContent=favorites.size;
  $('#desktopFavoriteCount').textContent=favorites.size;
  $('#emptyState').hidden=currentList.length>0;
  $('#videoGrid').hidden=currentList.length===0;
  $('#loadMore').hidden=visibleVideos.length>=currentList.length;
  $('#loadMore').textContent=`영상 더 보기 (${currentList.length-visibleVideos.length}개 남음)`;
  const category=$('#categorySelect');const stimulus=$('#stimulusSelect');const sort=$('#sortSelect');const query=$('#searchInput').value.trim();
  $('#filterSummary').textContent=`${favoriteOnly?'리치찜 · ':''}${query?`“${query}” 검색 · `:''}${category.options[category.selectedIndex].text} · ${stimulus.options[stimulus.selectedIndex].text} · ${sort.options[sort.selectedIndex].text} · ${watchHistory.length}개 봄`;
  $$('#categoryChips button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category.value)));
  $$('.thumb-button').forEach(btn=>btn.addEventListener('click',()=>playVideo(btn.dataset.play,true)));
  $$('.favorite-button').forEach(btn=>btn.addEventListener('click',()=>toggleFavorite(btn.dataset.favorite)));
  $$('.thumb-button img').forEach(img=>img.addEventListener('error',()=>img.classList.add('is-missing'),{once:true}));
}

function currentVideo(){return videos.find(v=>v.id===currentId)||videos[0]}

function playVideo(id,scroll=false){
  const v=videos.find(item=>item.id===id);if(!v)return;
  clearWatchTimer();
  currentId=id;
  watchHistory=[id,...watchHistory.filter(item=>item!==id)].slice(0,videos.length);saveLocal();
  $('#screenIdle').hidden=true;
  const frame=$('#videoFrame');frame.hidden=false;
  frame.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&playsinline=1" title="${v.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe>`;
  const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===v.id)+1;
  $('#nowRank').textContent=`추천 ${rank}`;$('#nowKicker').textContent=`${categoryNames[v.category]} · ${stimulusNames[v.stimulus]}`;$('#nowTitle').textContent=v.title;$('#nowWhy').textContent=v.why;$('#youtubeLink').href=`https://www.youtube.com/watch?v=${v.id}`;
  $('#stopVideo').hidden=false;$('#playerStatus').textContent='재생 중 · 소리는 작게, 리치가 편안한지 살펴보세요.';
  updateReactionButtons();
  render();
  if(scroll)document.querySelector('.watch-deck').scrollIntoView({behavior:'smooth',block:'start'});
}

function clearWatchTimer(resetLabel=true){
  clearInterval(watchTimer);watchTimer=null;timerRemaining=0;
  if(resetLabel)$('#timerButton').textContent='3분 타이머';
}

function stopPlayback(message='시청을 끝냈어요. 리치의 반응을 남겨 다음 추천에 반영해 보세요.'){
  clearWatchTimer();$('#videoFrame').replaceChildren();$('#videoFrame').hidden=true;updateIdleScreen(currentVideo());$('#screenIdle').hidden=false;$('#stopVideo').hidden=true;$('#playerStatus').textContent=message;
}

function updateIdleScreen(video){
  const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===video.id)+1;
  $('#idleImage').src=`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  $('#idleImage').alt=`${video.title} 영상 미리보기`;
  $('#idleEyebrow').textContent=`리치 추천 ${rank}번 · ${categoryNames[video.category]}`;
  $('#idleTitle').textContent='한 편 더 볼까?';
  $('#idleDescription').textContent=video.why;
  $('#startTest').innerHTML='<span aria-hidden="true">▶</span> 3분 반응 테스트';
}

function updateTimerLabel(){
  const minutes=Math.floor(timerRemaining/60);const seconds=String(timerRemaining%60).padStart(2,'0');
  $('#timerButton').textContent=`${minutes}:${seconds} 남음`;
}

function toggleWatchTimer(){
  if(watchTimer){clearWatchTimer();$('#playerStatus').textContent='타이머를 해제했어요. 리치가 흥분하면 바로 시청을 끝내 주세요.';return;}
  if($('#videoFrame').hidden)playVideo(currentId,false);
  timerRemaining=180;updateTimerLabel();$('#playerStatus').textContent='3분 반응 테스트 중 · 편안하게 보면 계속, 흥분하면 바로 멈춰 주세요.';
  watchTimer=setInterval(()=>{timerRemaining-=1;updateTimerLabel();if(timerRemaining<=0)stopPlayback('3분 테스트가 끝났어요. 리치의 반응을 선택해 주세요.')},1000);
}

function stepVideo(direction){
  const list=currentList.length?currentList:videos;
  let index=list.findIndex(v=>v.id===currentId);if(index<0)index=0;
  index=(index+direction+list.length)%list.length;playVideo(list[index].id,false);
}

function updateReactionButtons(){
  const selected=reactions[currentId];
  $$('[data-reaction]').forEach(button=>{const active=button.dataset.reaction===selected;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))});
}

function recordReaction(reaction){
  const removing=reactions[currentId]===reaction;
  if(removing)delete reactions[currentId];else reactions[currentId]=reaction;
  saveLocal();$('#sortSelect').value='rich';updateReactionButtons();render();
  const messages={wag:'좋아한 종류를 리치 맞춤 추천에 더 반영했어요 🐾',watch:'집중한 종류를 다음 추천에 반영했어요.',ignore:'관심 없는 종류는 다음 추천에서 낮췄어요.'};
  showToast(removing?'반응 기록을 지웠어요.':messages[reaction]);
}

function toggleFavorite(id){
  favorites.has(id)?favorites.delete(id):favorites.add(id);saveLocal();render();
  showToast(favorites.has(id)?'리치찜에 저장했어 ★':'리치찜에서 뺐어');
}

function setCategory(category){
  $('#categorySelect').value=category;
  $$('#categoryChips button').forEach(button=>{const active=button.dataset.category===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
  render(true);
}

function setActiveNav(name){
  $$('[data-nav]').forEach(item=>item.classList.toggle('active',item.dataset.nav===name));
}

function openFavorites(){
  favoriteOnly=true;setActiveNav('favorites');render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'});
  if(!favorites.size)showToast('영상의 별표를 누르면 여기에 모아둘게요.');
}

function surpriseVideo(list=videos){
  const allowed=list.filter(video=>reactions[video.id]!=='ignore'&&video.id!==currentId);
  const fresh=allowed.filter(video=>!watchHistory.includes(video.id));
  const pool=fresh.length?fresh:allowed.length?allowed:list;
  return pool[Math.floor(Math.random()*pool.length)]||videos[0];
}

function launchQuickMode(mode){
  resetAll();
  if(mode==='surprise'){
    const pick=surpriseVideo();playVideo(pick.id,false);showToast(`오늘의 깜짝 픽 · ${pick.title}`);
  }else{
    if(mode==='excited'){$('#categorySelect').value='ball';$('#stimulusSelect').value='high';$('#sortSelect').value='active'}
    if(mode==='animal'){$('#categorySelect').value='wildlife'}
    if(mode==='calm'){$('#stimulusSelect').value='low';$('#sortSelect').value='calm'}
    render(true);const pick=surpriseVideo(currentList.slice(0,12));playVideo(pick.id,false);
  }
  setActiveNav('home');document.querySelector('#top').scrollIntoView({behavior:'smooth'});
}

function resetAll(){
  favoriteOnly=false;$('#searchInput').value='';$('#categorySelect').value='all';$('#stimulusSelect').value='all';$('#sortSelect').value='score';
  $$('#categoryChips button').forEach(button=>{const active=button.dataset.category==='all';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});render(true);
}

$('#startTest').addEventListener('click',()=>{
  const queue=videos.filter(video=>reactions[video.id]!=='ignore').sort((a,b)=>personalScore(b)-personalScore(a));
  const fresh=queue.filter(video=>!watchHistory.includes(video.id));
  playVideo((fresh[0]||queue[0]||videos[0]).id,false);toggleWatchTimer();
});
$('#prevVideo').addEventListener('click',()=>stepVideo(-1));
$('#nextVideo').addEventListener('click',()=>stepVideo(1));
$('#surpriseButton').addEventListener('click',()=>{const pick=surpriseVideo(currentList);playVideo(pick.id,false);showToast(`리치 픽 · ${pick.title}`)});
$('#timerButton').addEventListener('click',toggleWatchTimer);
$('#stopVideo').addEventListener('click',()=>stopPlayback());
$('#fullscreenButton').addEventListener('click',async()=>{try{await $('#screenShell').requestFullscreen()}catch{showToast('영상 오른쪽 아래 전체화면 버튼을 눌러줘')}});
$$('[data-reaction]').forEach(button=>button.addEventListener('click',()=>recordReaction(button.dataset.reaction)));
$('#guideButton').addEventListener('click',()=>$('#guideDialog').showModal());
$('#headerFavorites').addEventListener('click',openFavorites);
$('#footerGuideButton').addEventListener('click',()=>$('#guideDialog').showModal());
$('#searchInput').addEventListener('input',()=>render(true));
$('#stimulusSelect').addEventListener('change',()=>render(true));
$('#sortSelect').addEventListener('change',()=>render(true));
$('#categorySelect').addEventListener('change',event=>setCategory(event.target.value));
$$('#categoryChips button').forEach(button=>button.addEventListener('click',()=>setCategory(button.dataset.category)));
$('#resetFilters').addEventListener('click',resetAll);
$('#loadMore').addEventListener('click',()=>{visibleLimit+=pageSize;render()});
$$('[data-quick]').forEach(button=>button.addEventListener('click',()=>launchQuickMode(button.dataset.quick)));
$$('[data-nav]').forEach(button=>button.addEventListener('click',()=>{
  setActiveNav(button.dataset.nav);
  if(button.dataset.nav==='home'){favoriteOnly=false;render(true);document.querySelector('#top').scrollIntoView({behavior:'smooth'})}
  if(button.dataset.nav==='ranking'){favoriteOnly=false;render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'})}
  if(button.dataset.nav==='favorites')openFavorites();
}));

if(watchHistory.length){const recent=currentVideo();const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===recent.id)+1;updateIdleScreen(recent);$('#nowRank').textContent=`추천 ${rank}`;$('#nowKicker').textContent=`${categoryNames[recent.category]} · ${stimulusNames[recent.stimulus]}`;$('#nowTitle').textContent=recent.title;$('#nowWhy').textContent=recent.why;$('#youtubeLink').href=`https://www.youtube.com/watch?v=${recent.id}`}
updateReactionButtons();resetAll();
