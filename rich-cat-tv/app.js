const videoCatalog=[
  {id:'B-FR23hswfQ',title:'풀밭에 찾아온 새·다람쥐·토끼',channel:'Birder King',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:99,why:'낮은 풀밭 위 작은 친구들이 가까이 나타나 첫 반응 테스트에 좋아요.'},
  {id:'BmDJKHrjw9c',title:'핀란드 숲의 다람쥐와 작은 새',channel:'Red Squirrel Studios',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:98,why:'다람쥐의 빠른 손놀림과 새의 날갯짓이 자연스럽게 번갈아 나와요.'},
  {id:'I8Wtq7Q0IiM',title:'숲속 새와 다람쥐 8시간',channel:'Birder King',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:97,why:'숲 바닥과 나뭇가지 사이의 작은 움직임을 오래 추적하기 좋아요.'},
  {id:'qW-KIjHjjHM',title:'화면을 달리는 생쥐 사냥 게임',channel:'TV BINI',category:'mice',stimulus:'high',duration:'짧은 영상',minutes:6,score:97,why:'단순한 배경 위 생쥐가 빠르게 움직여 짧고 집중적인 사냥놀이가 돼요.'},
  {id:'TgNKCYmzdTU',title:'음악 없는 실제 수족관 물고기',channel:'Cat TV Fish Tank 4K',category:'fish',stimulus:'low',duration:'약 8시간',minutes:480,score:96,why:'음악 없이 실제 물고기와 물결만 보여줘 조용한 물멍 시간에 좋아요.'},
  {id:'H7p3aqkRCnQ',title:'다람쥐 파쿠르 놀이터',channel:'Pet TV',category:'squirrels',stimulus:'high',duration:'긴 영상',minutes:480,score:96,why:'급격하게 방향을 바꾸는 다람쥐가 활발한 냥이의 시선을 끌어요.'},
  {id:'P4KtadP-TFc',title:'민들레 정원의 새와 다람쥐',channel:'On Sunset Cove',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:95,why:'밝은 정원에서 새의 날갯짓과 다람쥐 움직임을 선명하게 볼 수 있어요.'},
  {id:'UGBcZHeHgYs',title:'하얀 생쥐를 잡아라',channel:'TV BINI',category:'mice',stimulus:'high',duration:'짧은 영상',minutes:8,score:95,why:'대비가 큰 흰 생쥐가 화면을 오가며 앞발 반응을 이끌어요.'},
  {id:'NJbRhqFwE-U',title:'초원에 모인 사슴·다람쥐·새',channel:'On Sunset Cove',category:'squirrels',stimulus:'medium',duration:'약 8시간',minutes:480,score:94,why:'크기가 다른 동물이 번갈아 나타나 화면을 탐색하는 재미가 있어요.'},
  {id:'cUubU-JAuhU',title:'가까이 헤엄치는 실제 열대어',channel:'Cat TV Fish Tank 4K',category:'fish',stimulus:'medium',duration:'약 8시간',minutes:480,score:94,why:'카메라 가까이 지나는 물고기의 부드러운 움직임을 따라보기 좋아요.'},
  {id:'Y0w0cuHs6xk',title:'뒤뜰의 토끼와 다람쥐',channel:'Four Paws TV',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:93,why:'토끼의 큰 점프와 다람쥐의 작은 움직임이 번갈아 등장해요.'},
  {id:'RknXKnM8TCU',title:'정원 새를 가까이 보는 8시간',channel:'4K Birdsong Station',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:93,why:'새의 날갯짓과 지저귐이 또렷해 창밖을 보는 듯 집중하기 좋아요.'},
  {id:'yHciULtmhbw',title:'다람쥐·줄무늬다람쥐·새 10시간',channel:'Four Paws TV',category:'squirrels',stimulus:'high',duration:'약 10시간',minutes:600,score:92,why:'작은 동물이 화면을 자주 가로질러 활동적인 냥이에게 잘 맞아요.'},
  {id:'zupaflE-AY0',title:'숲속 새와 다람쥐 자연극장',channel:'Paul Dinning',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:490,score:92,why:'실제 숲의 소리와 반복되지 않는 동물 행동이 편안한 호기심을 유지해요.'},
  {id:'UT6oisYJZzw',title:'가을 정원의 토끼·다람쥐·새',channel:'Four Paws TV',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:91,why:'낙엽 사이를 오가는 작은 동물의 움직임이 풍부하게 이어져요.'},
  {id:'EKoJYVHynNI',title:'여름 호숫가의 새와 다람쥐',channel:'On Sunset Cove',category:'calm',stimulus:'medium',duration:'약 8시간',minutes:480,score:91,why:'물가의 밝은 배경 위 작은 동물이 또렷하게 움직여 알아보기 쉬워요.'},
  {id:'6D1K_bguPrc',title:'새와 다람쥐 관찰 창',channel:'On Sunset Cove',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:90,why:'실제 새소리와 자연스러운 움직임이 창가 관찰 시간을 만들어줘요.'},
  {id:'50QYpYF8Q-c',title:'다람쥐·토끼·새 10시간 무중단',channel:'Four Paws TV',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:90,why:'다양한 작은 야생동물이 쉬지 않고 등장하는 자연 관찰 영상이에요.'},
  {id:'9besdW9U6Es',title:'뒤뜰에 찾아온 야생동물 친구들',channel:'The Dodo',category:'calm',stimulus:'medium',duration:'약 8시간',minutes:480,score:89,why:'호숫가와 공원의 실제 동물을 가까운 시점으로 편안하게 보여줘요.'},
  {id:'AgsYoc9aYQI',title:'장난꾸러기 다람쥐의 숲',channel:'On Sunset Cove',category:'squirrels',stimulus:'high',duration:'약 8시간',minutes:480,score:89,why:'다람쥐가 카메라 가까이 다가오고 빠르게 움직여 추적 본능을 자극해요.'},
  {id:'z3xkR1HN5qU',title:'창문 너머 알록달록한 숲새',channel:'Paul Dinning',category:'birds',stimulus:'low',duration:'약 8시간',minutes:480,score:88,why:'창가에 앉아 새를 보는 듯한 조용한 시점이라 휴식 시간에 좋아요.'},
  {id:'b4bnmUB2ggM',title:'숲 가장자리의 새와 자연 소리',channel:'Relaxing Pet TV',category:'calm',stimulus:'low',duration:'약 8시간',minutes:480,score:87,why:'느린 화면과 작은 새 움직임이 과한 흥분 없이 호기심을 채워줘요.'},
  {id:'9i71_WTfn-s',title:'꽃밭의 새와 새소리',channel:'Paul Dinning',category:'birds',stimulus:'low',duration:'약 8시간',minutes:480,score:86,why:'부드러운 배경과 선명한 새 움직임이 나이 든 고양이에게도 부담이 적어요.'},
  {id:'AnqhzNqZaog',title:'사슴·새·다람쥐가 함께 사는 숲',channel:'On Sunset Cove',category:'calm',stimulus:'low',duration:'약 8시간',minutes:480,score:85,why:'큰 사슴과 작은 새가 천천히 교대해 느긋하게 관찰하기 좋아요.'},
  {id:'spjknBaCwt0',title:'티키바에 찾아온 새와 다람쥐',channel:'Four Paws TV',category:'birds',stimulus:'medium',duration:'약 10시간',minutes:600,score:84,why:'밝고 단순한 공간에 작은 동물이 나타나 멀리서도 움직임을 찾기 쉬워요.'},
  {id:'4NjvPeIInFA',title:'가을 초원의 사슴 관찰',channel:'Four Paws TV',category:'calm',stimulus:'low',duration:'약 8시간',minutes:480,score:82,why:'사슴의 느리고 큰 움직임을 편안하게 따라갈 수 있는 잔잔한 영상이에요.'},
  {id:'oxBC-t16Gcc',title:'숫사슴·암사슴과 숲속 새',channel:'On Sunset Cove',category:'calm',stimulus:'low',duration:'약 8시간',minutes:480,score:80,why:'화면 변화가 과하지 않아 낮잠 전 조용한 자연 창으로 잘 어울려요.'}
];

const bonusVideoSeeds=[
  ['fO3lUnuL5T4','birds','LensMyth'],['7-BwZu0O_bk','birds','LensMyth'],['02ML4zlcRpk','birds','Birder King'],
  ['QSVxmzAqaIc','birds','Meow Meow TV'],['cEL4oNfySw8','birds','Cat Bird TV'],['jvUCHMNtVvE','birds','Zen Cat TV'],
  ['-icCx_XGELk','birds','Cat Bird TV'],['WeFaz6ZMAeU','birds','Paws and Hearts HD'],['mO4j4nWOf3M','birds','LensMyth'],
  ['lnKoQLSeS5U','birds','Paul Dinning'],['GpgZriJI-Ho','birds','Birder King'],['__FX7YF8dhA','birds','Meow Meow TV'],
  ['cICTGlCkpD0','birds','Cat Bird TV'],['sGfkdbgX01Y','birds','PurrNest TV'],['RtS4kYzvDo0','birds','My Meow TV'],
  ['TcmD2h-KR70','squirrels','Birder King'],['sJAAVLCw_aI','squirrels','Videos For Cats'],['TrCYFFy8jhE','squirrels','Cat Bird TV'],
  ['DqMYru_RWPs','squirrels','Birder King'],['Dix58mO0Pbc','squirrels','Birder King'],['d_QoanRKrKI','squirrels','Red Squirrel Studios'],
  ['FmyRNJmKIfo','squirrels','Cat Toys Studio'],['3sJeUrbEh1o','squirrels','Cat Bird TV'],['zziWMBi6CyE','squirrels','PurrNest TV'],
  ['5OWeFefVOFk','squirrels','Urban Hobbies'],['5hd9RQxnkzs','squirrels','Videos For Cats'],['LKW9xlR_SPM','squirrels','Cat Bird TV'],
  ['dvKrZWEbhj4','squirrels','The Cat Eats Show'],['p_Uwfy5p9FI','squirrels','Purr & Feather TV'],['NGkxiqgi4rs','squirrels','Kat Nap TV'],
  ['M6hq0aUQgk4','fish','Cat TV Fish Tank 4K'],['aJ1KYUO2ysU','fish','Cat TV Fish Tank 4K'],['g_oTUj9AIOc','fish','Safa Fish Cat TV'],
  ['Q-2koc9lgZI','fish','The Timeless Garden'],['lLhCb8i5cy0','fish','Zen Cat TV'],['n0kIqhspl74','fish','Zen Cat TV'],
  ['2Qel1R6Fgeo','fish','Cat Toys Studio'],['DpJvcIVGUHw','fish','Cat TV Fish Tank 4K'],['KxNm8313grs','fish','Relax Tank'],
  ['gIv1WaJzAv4','fish','Cat TV Fish Tank 4K'],['Cqt8YPbBUWM','fish','Cat Lab Studios'],['XycrYM5z9Kk','fish','Zoë’s Cat TV'],
  ['ATeit6LRXrc','fish','Sounds Cats React To'],['6qxZtm32kFY','fish','Yoshi’s Catflix'],['3RDa4ZKFBRk','fish','Cat TV Collection'],
  ['INaB_kXHqd0','mice','Paul Dinning'],['sHlwV-EMZs0','mice','Paul Dinning'],['6pbreU5ChmA','mice','Paul Dinning'],
  ['MTMxdy6jbnI','mice','Paul Dinning'],['EIFKgb3ivv4','mice','Paws & Chaos'],['uXN5MPwY2T8','mice','Best for Cats'],
  ['QQo1U2wgsDs','mice','Next to Nature'],['2AgVMA02lTw','mice','Paul Dinning'],['Ste2fVF7OgM','mice','KingBirder'],
  ['4CcKiRSjbU0','mice','GALBRO'],['qZRdCgzbHO0','mice','CATS TV'],['R49d7jahPg0','mice','Studio Cat King'],
  ['9zE4FbmwSqM','mice','Ai Texnoo'],['nNMKf4IRZ9E','mice','Cat Games 28'],
  ['qTMJl9e4-zI','calm','On Sunset Cove'],['ENSDb0Xwj_M','calm','PawWildia Nature TV'],['XhzyzLqYrg0','calm','Heart Scene'],
  ['P67jx1sttdc','calm','Feline Forest TV'],['7DyOK2Kjr80','calm','PurrWild Garden TV'],['KinjsVJn0-o','calm','LensMyth'],
  ['xbs7FT7dXYc','calm','Paul Dinning'],['MrSYP-cotdg','calm','Birder King'],['fLz3Jf6uUvY','calm','PurrNest Wildlife TV'],
  ['MWL7m_ktW-Y','calm','Cat Bird TV'],['vMfyMCs_vUQ','calm','Window Birds TV'],['dlS_gw1Uul0','calm','Heart Scene'],
  ['mELGt73hSG4','calm','PurrWild Garden TV'],['hVnim_IrKCY','calm','Cat Garden TV']
];
const bonusTitles={birds:['창가의 새 놀이터','날갯짓 자연극장','정원 새 관찰'],squirrels:['다람쥐 숲속 탐험','꼬리 쫓기 놀이터','다람쥐와 새의 정원'],fish:['알록달록 수족관','물고기 물멍 시간','화면 속 물고기 잡기'],mice:['생쥐 숨바꼭질','쥐구멍 사냥 게임','빠른 생쥐 따라잡기'],calm:['느긋한 자연 창문','낮잠 전 숲 구경','편안한 야생 정원']};
const bonusWhys={birds:'새의 날갯짓과 작은 움직임을 자연스럽게 따라보기 좋아요.',squirrels:'다람쥐의 빠르고 불규칙한 움직임이 냥이의 호기심을 깨워요.',fish:'화면을 부드럽게 오가는 물고기를 편안하게 관찰할 수 있어요.',mice:'작은 사냥감의 빠른 움직임에 집중하며 앞발 놀이를 즐겨요.',calm:'과한 화면 전환 없이 자연 풍경을 차분하게 감상하기 좋아요.'};
const bonusVideos=bonusVideoSeeds.map(([id,category,channel],index)=>({id,title:`${bonusTitles[category][index%3]} ${String(index+28).padStart(3,'0')}`,channel,category,stimulus:{birds:'medium',squirrels:'high',fish:'low',mice:'high',calm:'low'}[category],duration:'냥이 영상',minutes:60,score:Math.max(72,94-Math.floor(index/4)),why:bonusWhys[category]}));
const videos=[...videoCatalog,...bonusVideos];
const categoryNames={birds:'새 구경',squirrels:'다람쥐·토끼',fish:'물고기',mice:'쥐·사냥감',calm:'편안한 자연'};
const stimulusNames={high:'사냥 본능',medium:'호기심 톡톡',low:'느긋하게'};
const stimulusOrder={low:1,medium:2,high:3};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const safeParse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let favorites=new Set(safeParse('catTvFavorites',[]).filter(id=>videos.some(video=>video.id===id)));
let reactions=safeParse('catTvReactions',{});
let watchHistory=safeParse('catTvHistory',[]).filter(id=>videos.some(video=>video.id===id)).slice(0,videos.length);
let currentId=watchHistory[0]||videos[0].id;
let currentList=[...videos];
let favoriteOnly=false;
let toastTimer;
let watchTimer;
let timerRemaining=0;
let visibleLimit=100;
const pageSize=100;

function reactionValue(reaction,strong=false){const values=strong?{pounce:8,watch:4,ignore:-10}:{pounce:3,watch:2,ignore:-4};return values[reaction]||0;}
function personalScore(video){let learnedBonus=0;Object.entries(reactions).forEach(([id,reaction])=>{const watched=videos.find(item=>item.id===id);if(!watched)return;if(watched.category===video.category)learnedBonus+=reactionValue(reaction);if(watched.stimulus===video.stimulus)learnedBonus+=Math.round(reactionValue(reaction)/2)});learnedBonus=Math.max(-10,Math.min(10,learnedBonus));return Math.max(40,Math.min(100,video.score+learnedBonus+reactionValue(reactions[video.id],true)))}
function saveLocal(){try{localStorage.setItem('catTvFavorites',JSON.stringify([...favorites]));localStorage.setItem('catTvReactions',JSON.stringify(reactions));localStorage.setItem('catTvHistory',JSON.stringify(watchHistory))}catch{showToast('이 브라우저에서는 냥이 기록을 저장할 수 없어요.')}}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400)}
function getFilteredVideos(){const query=$('#searchInput').value.trim().toLowerCase();const category=$('#categorySelect').value;const stimulus=$('#stimulusSelect').value;const sort=$('#sortSelect').value;const list=videos.filter(video=>{const haystack=`${video.title} ${video.channel} ${video.why}`.toLowerCase();return(!query||haystack.includes(query))&&(!favoriteOnly||favorites.has(video.id))});list.sort((a,b)=>{if(category!=='all'){const categoryPriority=Number(b.category===category)-Number(a.category===category);if(categoryPriority)return categoryPriority}if(stimulus!=='all'){const stimulusPriority=Number(b.stimulus===stimulus)-Number(a.stimulus===stimulus);if(stimulusPriority)return stimulusPriority}if(sort==='cat')return personalScore(b)-personalScore(a)||b.score-a.score;if(sort==='calm')return stimulusOrder[a.stimulus]-stimulusOrder[b.stimulus]||b.score-a.score;if(sort==='active')return stimulusOrder[b.stimulus]-stimulusOrder[a.stimulus]||b.score-a.score;if(sort==='duration')return a.minutes-b.minutes;return b.score-a.score});return list}
function cardTemplate(video,index){const watched=watchHistory.includes(video.id);return `<article class="video-card ${index<3?'top-three':''} ${watched?'watched':''}"><button class="thumb-button" type="button" data-play="${video.id}" aria-label="${video.title} 재생"><span class="rank-badge">PICK ${String(index+1).padStart(2,'0')}</span>${watched?'<span class="watched-mark">✓ 봤어요</span>':''}<span class="thumb-fallback" aria-hidden="true">미리보기 준비 중</span><img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="${video.title} 미리보기" loading="lazy" decoding="async"><span class="duration-badge">${video.duration}</span></button><div class="card-body"><div class="card-meta"><span class="card-kind">${categoryNames[video.category]}</span><span class="score">냥이궁합 <b>${personalScore(video)}</b></span></div><h3>${video.title}</h3><p class="channel">${video.channel} · 소리는 작게 시작</p><p class="why">${video.why}</p><div class="card-footer"><span class="stimulus" data-level="${video.stimulus}"><i></i>${stimulusNames[video.stimulus]}</span><button class="favorite-button ${favorites.has(video.id)?'active':''}" type="button" data-favorite="${video.id}" aria-pressed="${favorites.has(video.id)}" aria-label="${video.title} ${favorites.has(video.id)?'찜 해제':'냥이찜'}">♥</button></div></div></article>`}
function render(resetPage=false){if(resetPage)visibleLimit=pageSize;currentList=getFilteredVideos();const visible=currentList.slice(0,visibleLimit);$('#videoGrid').innerHTML=visible.map(cardTemplate).join('');$('#resultCount').textContent=currentList.length;$('#favoriteCount').textContent=favorites.size;$('#desktopFavoriteCount').textContent=favorites.size;$('#emptyState').hidden=currentList.length>0;$('#videoGrid').hidden=currentList.length===0;$('#loadMore').hidden=visible.length>=currentList.length;$('#loadMore').textContent=`영상 더 보기 (${currentList.length-visible.length}개 남음)`;const category=$('#categorySelect');const stimulus=$('#stimulusSelect');const sort=$('#sortSelect');const query=$('#searchInput').value.trim();const categoryLabel=category.value==='all'?'전체 영상':`${category.options[category.selectedIndex].text} 우선`;const stimulusLabel=stimulus.value==='all'?'전체 자극':`${stimulus.options[stimulus.selectedIndex].text} 우선`;$('#filterSummary').textContent=`${favoriteOnly?'냥이찜 · ':''}${query?`“${query}” 검색 · `:''}${categoryLabel} · ${stimulusLabel} · ${sort.options[sort.selectedIndex].text} · ${watchHistory.length}개 봄`;$$('#categoryChips button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category.value)));$$('.thumb-button').forEach(button=>button.addEventListener('click',()=>playVideo(button.dataset.play,true)));$$('.favorite-button').forEach(button=>button.addEventListener('click',()=>toggleFavorite(button.dataset.favorite)));$$('.thumb-button img').forEach(image=>image.addEventListener('error',()=>image.classList.add('is-missing'),{once:true}))}
function currentVideo(){return videos.find(video=>video.id===currentId)||videos[0]}
function updateNowPlaying(video){const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===video.id)+1;$('#nowRank').textContent=`추천 ${rank}`;$('#nowKicker').textContent=`${categoryNames[video.category]} · ${stimulusNames[video.stimulus]}`;$('#nowTitle').textContent=video.title;$('#nowWhy').textContent=video.why;$('#youtubeLink').href=`https://www.youtube.com/watch?v=${video.id}`}
function playVideo(id,scroll=false){const video=videos.find(item=>item.id===id);if(!video)return;clearWatchTimer();currentId=id;watchHistory=[id,...watchHistory.filter(item=>item!==id)].slice(0,videos.length);saveLocal();$('#screenIdle').hidden=true;const frame=$('#videoFrame');frame.hidden=false;frame.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1" title="${video.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe>`;updateNowPlaying(video);$('#stopVideo').hidden=false;$('#playerStatus').textContent='재생 중 · 냥이가 화면을 잡으려 하면 잠시 쉬어 주세요.';updateReactionButtons();render();if(scroll)document.querySelector('.watch-deck').scrollIntoView({behavior:'smooth',block:'start'})}
function clearWatchTimer(){clearInterval(watchTimer);watchTimer=null;timerRemaining=0;$('#timerButton').textContent='3분 타이머'}
function updateIdleScreen(video){const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===video.id)+1;$('#idleImage').src=`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;$('#idleImage').alt=`${video.title} 영상 미리보기`;$('#idleEyebrow').textContent=`냥이 추천 ${rank}번 · ${categoryNames[video.category]}`;$('#idleTitle').textContent='한 편 더 볼까?';$('#idleDescription').textContent=video.why;$('#startTest').innerHTML='<span aria-hidden="true">▶</span> 3분 냥이 테스트'}
function stopPlayback(message='시청을 끝냈어요. 냥이의 반응을 남겨 다음 추천에 반영해 보세요.'){clearWatchTimer();$('#videoFrame').replaceChildren();$('#videoFrame').hidden=true;updateIdleScreen(currentVideo());$('#screenIdle').hidden=false;$('#stopVideo').hidden=true;$('#playerStatus').textContent=message}
function updateTimerLabel(){const minutes=Math.floor(timerRemaining/60);const seconds=String(timerRemaining%60).padStart(2,'0');$('#timerButton').textContent=`${minutes}:${seconds} 남음`}
function toggleWatchTimer(){if(watchTimer){clearWatchTimer();$('#playerStatus').textContent='타이머를 해제했어요. 과하게 흥분하면 바로 시청을 끝내 주세요.';return}if($('#videoFrame').hidden)playVideo(currentId,false);timerRemaining=180;updateTimerLabel();$('#playerStatus').textContent='3분 반응 테스트 중 · 눈과 앞발 움직임을 가볍게 살펴봐요.';watchTimer=setInterval(()=>{timerRemaining-=1;updateTimerLabel();if(timerRemaining<=0)stopPlayback('3분 테스트가 끝났어요. 냥이의 반응을 선택해 주세요.')},1000)}
function stepVideo(direction){const list=currentList.length?currentList:videos;let index=list.findIndex(video=>video.id===currentId);if(index<0)index=0;index=(index+direction+list.length)%list.length;playVideo(list[index].id,false)}
function updateReactionButtons(){const selected=reactions[currentId];$$('[data-reaction]').forEach(button=>{const active=button.dataset.reaction===selected;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))})}
function recordReaction(reaction){const removing=reactions[currentId]===reaction;if(removing)delete reactions[currentId];else reactions[currentId]=reaction;saveLocal();$('#sortSelect').value='cat';updateReactionButtons();render();const messages={pounce:'앞발이 반응한 종류를 냥이 맞춤에 더 반영했어요 🐾',watch:'집중해서 본 종류를 다음 추천에 반영했어요.',ignore:'관심 없는 종류는 다음 추천에서 낮췄어요.'};showToast(removing?'반응 기록을 지웠어요.':messages[reaction])}
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);saveLocal();render();showToast(favorites.has(id)?'냥이찜에 저장했어요 ♥':'냥이찜에서 뺐어요.')}
function setCategory(category){$('#categorySelect').value=category;$$('#categoryChips button').forEach(button=>{const active=button.dataset.category===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});render(true)}
function resetAll(){favoriteOnly=false;$('#searchInput').value='';$('#categorySelect').value='all';$('#stimulusSelect').value='all';$('#sortSelect').value='score';$$('#categoryChips button').forEach(button=>{const active=button.dataset.category==='all';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});render(true)}
function setActiveNav(name){$$('[data-nav]').forEach(item=>item.classList.toggle('active',item.dataset.nav===name))}
function openFavorites(){favoriteOnly=true;setActiveNav('favorites');render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'});if(!favorites.size)showToast('영상의 하트를 누르면 여기에 모아둘게요.')}
function surpriseVideo(list=videos){const allowed=list.filter(video=>reactions[video.id]!=='ignore'&&video.id!==currentId);const fresh=allowed.filter(video=>!watchHistory.includes(video.id));const pool=fresh.length?fresh:allowed.length?allowed:list;return pool[Math.floor(Math.random()*pool.length)]||videos[0]}
function launchQuickMode(mode){resetAll();if(mode==='surprise'){const pick=surpriseVideo();playVideo(pick.id,false);showToast(`오늘의 깜짝 픽 · ${pick.title}`)}else{if(mode==='hunt'){$('#categorySelect').value='mice';$('#stimulusSelect').value='high';$('#sortSelect').value='active'}if(mode==='window'){$('#categorySelect').value='birds'}if(mode==='aquarium'){$('#categorySelect').value='fish'}render(true);playVideo(surpriseVideo(currentList).id,false)}setActiveNav('home');document.querySelector('#top').scrollIntoView({behavior:'smooth'})}

$('#startTest').addEventListener('click',()=>{const queue=videos.filter(video=>reactions[video.id]!=='ignore').sort((a,b)=>personalScore(b)-personalScore(a));const fresh=queue.filter(video=>!watchHistory.includes(video.id));playVideo((fresh[0]||queue[0]||videos[0]).id,false);toggleWatchTimer()});
$('#prevVideo').addEventListener('click',()=>stepVideo(-1));
$('#nextVideo').addEventListener('click',()=>stepVideo(1));
$('#surpriseButton').addEventListener('click',()=>{const pick=surpriseVideo(currentList);playVideo(pick.id,false);showToast(`냥이 픽 · ${pick.title}`)});
$('#timerButton').addEventListener('click',toggleWatchTimer);
$('#stopVideo').addEventListener('click',()=>stopPlayback());
$('#fullscreenButton').addEventListener('click',async()=>{try{await $('#screenShell').requestFullscreen()}catch{showToast('영상 오른쪽 아래 전체화면 버튼을 눌러 주세요.')}});
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
$$('[data-nav]').forEach(button=>button.addEventListener('click',()=>{setActiveNav(button.dataset.nav);if(button.dataset.nav==='home'){favoriteOnly=false;render(true);document.querySelector('#top').scrollIntoView({behavior:'smooth'})}if(button.dataset.nav==='ranking'){favoriteOnly=false;render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'})}if(button.dataset.nav==='favorites')openFavorites()}));

if(watchHistory.length){const recent=currentVideo();updateIdleScreen(recent);updateNowPlaying(recent)}
updateReactionButtons();resetAll();

let deferredInstallPrompt=null;
const installTriggers=$$('.install-trigger');
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function updateInstallButtons(){installTriggers.forEach(button=>{const installed=isStandalone();button.classList.toggle('installed',installed);button.setAttribute('aria-label',installed?'냥이TV가 설치되어 있어요':'냥이TV 앱 설치');const label=button.querySelector('small');if(label)label.textContent=installed?'설치됨':'설치'})}
async function installApp(){
  if(isStandalone()){showToast('냥이TV가 이미 앱으로 설치되어 있어요.');return}
  if(deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(choice.outcome==='accepted')showToast('냥이TV 설치를 시작했어요!');return}
  const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
  showToast(isIos?'Safari 공유 버튼에서 “홈 화면에 추가”를 눌러 주세요.':'브라우저 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택해 주세요.');
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;updateInstallButtons()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallButtons();showToast('냥이TV 설치 완료! 홈 화면에서 바로 만나요.')});
installTriggers.forEach(button=>button.addEventListener('click',installApp));
updateInstallButtons();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
