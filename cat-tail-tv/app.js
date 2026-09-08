const videos=[
  {id:'b_xKQ20jnQA',title:'가을 정원의 새와 다람쥐 8시간',channel:'Birder King',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:99,why:'작고 불규칙한 움직임과 실제 자연 소리가 첫 반응 테스트에 잘 맞아요.'},
  {id:'VDmX50GKtys',title:'수족관 물고기 물멍 8시간',channel:'TV BINI',category:'fish',stimulus:'low',duration:'약 8시간',minutes:480,score:98,why:'물고기가 화면을 부드럽게 가로질러 흥분을 낮춘 채 시선을 끌어요.'},
  {id:'vi8aw01OrP8',title:'잡아봐! 물고기 사냥 게임 8시간',channel:'CAT GAMES',category:'fish',stimulus:'high',duration:'약 8시간',minutes:480,score:97,why:'단순한 배경 위를 빠르게 움직이는 물고기를 따라보는 사냥 놀이예요.'},
  {id:'cntQVbin6N0',title:'황금빛 계절의 새와 다람쥐',channel:'Birder King',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:96,why:'화면 가까이 찾아오는 새와 다람쥐를 편안한 자연 소리와 함께 볼 수 있어요.'},
  {id:'zupaflE-AY0',title:'숲속 새와 다람쥐 관찰 TV',channel:'Paul Dinning',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:490,score:95,why:'작은 동물의 자연스러운 방문이 반복되지 않아 오래 집중하기 좋아요.'},
  {id:'Y0w0cuHs6xk',title:'토끼와 다람쥐가 찾아오는 뒤뜰',channel:'Four Paws TV',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:94,why:'토끼의 큰 움직임과 다람쥐의 빠른 움직임이 번갈아 나타나요.'},
  {id:'H7p3aqkRCnQ',title:'다람쥐 파쿠르 놀이터',channel:'Dog TV 글로벌',category:'squirrels',stimulus:'high',duration:'긴 영상',minutes:480,score:93,why:'급격한 방향 전환과 점프가 화면 추적 반응을 확인하기 좋아요.'},
  {id:'P4KtadP-TFc',title:'민들레 정원의 새와 다람쥐',channel:'On Sunset Cove',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:92,why:'날갯짓과 다람쥐 움직임, 자연 소리의 균형이 좋아요.'},
  {id:'yHciULtmhbw',title:'다람쥐·줄무늬다람쥐·새 10시간',channel:'Four Paws TV',category:'squirrels',stimulus:'high',duration:'약 10시간',minutes:600,score:91,why:'작은 동물이 화면을 자주 가로질러 활동적인 냥이에게 잘 맞아요.'},
  {id:'RknXKnM8TCU',title:'정원 새를 가까이 보는 8시간',channel:'4K Birdsong Station',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:90,why:'새의 날갯짓과 지저귐이 선명해 창밖을 보는 듯한 경험을 줘요.'},
  {id:'UT6oisYJZzw',title:'가을 정원의 토끼·다람쥐·새',channel:'Four Paws TV',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:89,why:'크기와 속도가 다른 동물이 번갈아 지나가 지루할 틈이 적어요.'},
  {id:'AgsYoc9aYQI',title:'장난꾸러기 다람쥐와 숲속 친구',channel:'On Sunset Cove',category:'squirrels',stimulus:'high',duration:'약 8시간',minutes:480,score:88,why:'다람쥐가 카메라 가까이 다가와 사냥 본능을 자극해요.'},
  {id:'50QYpYF8Q-c',title:'다람쥐·토끼·새 10시간',channel:'Four Paws TV',category:'squirrels',stimulus:'medium',duration:'약 10시간',minutes:600,score:87,why:'작은 야생동물이 자연스럽게 드나드는 관찰형 영상이에요.'},
  {id:'z3xkR1HN5qU',title:'창문 너머 알록달록한 숲새',channel:'Paul Dinning',category:'birds',stimulus:'low',duration:'약 8시간',minutes:480,score:86,why:'창가에서 조용히 새를 바라보는 듯해 휴식 시간에 좋아요.'},
  {id:'b4bnmUB2ggM',title:'숲 가장자리의 새와 자연 소리',channel:'Relax My Dog',category:'nature',stimulus:'low',duration:'약 8시간',minutes:480,score:85,why:'조용한 새 관찰 화면이라 낮잠 전 가벼운 자극으로 알맞아요.'},
  {id:'9i71_WTfn-s',title:'꽃밭의 새와 잔잔한 새소리',channel:'Paul Dinning',category:'nature',stimulus:'low',duration:'약 8시간',minutes:480,score:84,why:'부드러운 배경과 또렷한 새 움직임이 예민한 냥이에게 부담이 적어요.'},
  {id:'nYpdFLJIu74',title:'뒤뜰 동물들의 여름 하루',channel:'Four Paws TV',category:'nature',stimulus:'low',duration:'약 10시간',minutes:600,score:83,why:'자연스러운 새소리와 과하지 않은 동물 움직임이 편안한 호기심을 유지해요.'},
  {id:'EKoJYVHynNI',title:'호숫가의 빠른 다람쥐와 새',channel:'On Sunset Cove',category:'birds',stimulus:'medium',duration:'약 8시간',minutes:480,score:82,why:'밝은 물가를 가로지르는 작은 동물을 선명하게 볼 수 있어요.'}
];

const categoryNames={birds:'새',squirrels:'다람쥐·토끼',fish:'물고기',nature:'조용한 자연'};
const stimulusNames={high:'활발해요',medium:'적당해요',low:'잔잔해요'};
const stimulusOrder={low:1,medium:2,high:3};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const safeParse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let favorites=new Set(safeParse('catTailTvFavorites',[]).filter(id=>videos.some(video=>video.id===id)));
let reactions=safeParse('catTailTvReactions',{});
let currentId=videos[0].id;
let currentList=[...videos];
let favoriteOnly=false;
let toastTimer;
let watchTimer;
let timerRemaining=0;
let visibleLimit=12;
const pageSize=12;

function reactionValue(reaction,strong=false){
  const values=strong?{pounce:8,watch:5,ignore:-10}:{pounce:3,watch:2,ignore:-4};
  return values[reaction]||0;
}

function personalScore(video){
  let learnedBonus=0;
  Object.entries(reactions).forEach(([id,reaction])=>{
    const watched=videos.find(item=>item.id===id);
    if(!watched)return;
    if(watched.category===video.category)learnedBonus+=reactionValue(reaction);
    if(watched.stimulus===video.stimulus)learnedBonus+=Math.round(reactionValue(reaction)/2);
  });
  return Math.max(40,Math.min(100,video.score+Math.max(-12,Math.min(12,learnedBonus))+reactionValue(reactions[video.id],true)));
}

function saveLocal(){
  localStorage.setItem('catTailTvFavorites',JSON.stringify([...favorites]));
  localStorage.setItem('catTailTvReactions',JSON.stringify(reactions));
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
  const list=videos.filter(video=>{
    const haystack=`${video.title} ${video.channel} ${video.why}`.toLowerCase();
    return(!query||haystack.includes(query))&&(category==='all'||video.category===category)&&(stimulus==='all'||video.stimulus===stimulus)&&(!favoriteOnly||favorites.has(video.id));
  });
  list.sort((a,b)=>{
    if(sort==='cat')return personalScore(b)-personalScore(a)||b.score-a.score;
    if(sort==='calm')return stimulusOrder[a.stimulus]-stimulusOrder[b.stimulus]||b.score-a.score;
    if(sort==='active')return stimulusOrder[b.stimulus]-stimulusOrder[a.stimulus]||b.score-a.score;
    if(sort==='duration')return a.minutes-b.minutes;
    return b.score-a.score;
  });
  return list;
}

function cardTemplate(video,index){
  return `<article class="video-card ${index<3?'top-three':''}">
    <button class="thumb-button" type="button" data-play="${video.id}" aria-label="${video.title} 재생">
      <span class="rank-badge">${index+1}</span>
      <img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="${video.title} 미리보기" loading="lazy">
      <span class="duration-badge">${video.duration}</span>
    </button>
    <div class="card-body">
      <div class="card-meta"><span class="card-kind">${categoryNames[video.category]}</span><span class="score">추천 <b>${personalScore(video)}</b>점</span></div>
      <h3>${video.title}</h3><p class="channel">${video.channel} · 소리는 작게 시작</p><p class="why">${video.why}</p>
      <div class="card-footer"><span class="stimulus" data-level="${video.stimulus}"><i></i>${stimulusNames[video.stimulus]}</span><button class="favorite-button ${favorites.has(video.id)?'active':''}" type="button" data-favorite="${video.id}" aria-label="${favorites.has(video.id)?'찜 해제':'냥이찜'}">★</button></div>
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
  $('#emptyState').hidden=currentList.length>0;
  $('#videoGrid').hidden=currentList.length===0;
  $('#loadMore').hidden=visibleVideos.length>=currentList.length;
  $('#loadMore').textContent=`영상 더 보기 (${currentList.length-visibleVideos.length}개 남음)`;
  $$('.thumb-button').forEach(button=>button.addEventListener('click',()=>playVideo(button.dataset.play,true)));
  $$('.favorite-button').forEach(button=>button.addEventListener('click',()=>toggleFavorite(button.dataset.favorite)));
}

function playVideo(id,scroll=false){
  const video=videos.find(item=>item.id===id);if(!video)return;
  clearWatchTimer();currentId=id;$('#screenIdle').hidden=true;
  const frame=$('#videoFrame');frame.hidden=false;
  frame.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1" title="${video.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe>`;
  const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===video.id)+1;
  $('#nowRank').textContent=`추천 ${rank}`;$('#nowKicker').textContent=`${categoryNames[video.category]} · ${stimulusNames[video.stimulus]}`;$('#nowTitle').textContent=video.title;$('#nowWhy').textContent=video.why;$('#youtubeLink').href=`https://www.youtube.com/watch?v=${video.id}`;
  $('#stopVideo').hidden=false;$('#playerStatus').textContent='재생 중 · 화면을 덮치려 하면 바로 시청을 끝내 주세요.';
  updateReactionButtons();
  if(scroll)document.querySelector('.watch-deck').scrollIntoView({behavior:'smooth',block:'start'});
}

function clearWatchTimer(resetLabel=true){clearInterval(watchTimer);watchTimer=null;timerRemaining=0;if(resetLabel)$('#timerButton').textContent='3분 타이머'}
function stopPlayback(message='시청을 끝냈어요. 반응을 남기면 다음 추천이 더 잘 맞아요.'){
  clearWatchTimer();$('#videoFrame').replaceChildren();$('#videoFrame').hidden=true;$('#screenIdle').hidden=false;$('#stopVideo').hidden=true;$('#playerStatus').textContent=message;
}
function updateTimerLabel(){const minutes=Math.floor(timerRemaining/60);const seconds=String(timerRemaining%60).padStart(2,'0');$('#timerButton').textContent=`${minutes}:${seconds} 남음`}
function toggleWatchTimer(){
  if(watchTimer){clearWatchTimer();$('#playerStatus').textContent='타이머를 해제했어요. 냥이가 흥분하면 바로 끝내 주세요.';return}
  if($('#videoFrame').hidden)playVideo(currentId,false);
  timerRemaining=180;updateTimerLabel();$('#playerStatus').textContent='3분 반응 테스트 중 · 귀와 꼬리가 편안한지 살펴봐요.';
  watchTimer=setInterval(()=>{timerRemaining-=1;updateTimerLabel();if(timerRemaining<=0)stopPlayback('3분 테스트가 끝났어요. 냥이의 반응을 선택해 주세요.')},1000);
}
function stepVideo(direction){const list=currentList.length?currentList:videos;let index=list.findIndex(video=>video.id===currentId);if(index<0)index=0;index=(index+direction+list.length)%list.length;playVideo(list[index].id,false)}
function updateReactionButtons(){const selected=reactions[currentId];$$('[data-reaction]').forEach(button=>button.classList.toggle('selected',button.dataset.reaction===selected))}
function recordReaction(reaction){
  reactions[currentId]=reaction;saveLocal();$('#sortSelect').value='cat';updateReactionButtons();render();
  showToast({pounce:'좋아한 움직임을 냥이 맞춤 추천에 더 반영했어요 🐾',watch:'집중한 종류를 다음 추천에 반영했어요.',ignore:'관심 없는 종류는 추천에서 낮췄어요.'}[reaction]);
}
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);saveLocal();render();showToast(favorites.has(id)?'냥이찜에 저장했어요 ★':'냥이찜에서 뺐어요')}
function setCategory(category){favoriteOnly=false;$('#categorySelect').value=category;$$('#categoryChips button').forEach(button=>button.classList.toggle('active',button.dataset.category===category));render(true)}
function resetAll(){favoriteOnly=false;$('#searchInput').value='';$('#categorySelect').value='all';$('#stimulusSelect').value='all';$('#sortSelect').value='score';$$('#categoryChips button').forEach(button=>button.classList.toggle('active',button.dataset.category==='all'));render(true)}

$('#startTest').addEventListener('click',()=>{const queue=videos.filter(video=>reactions[video.id]!=='ignore').sort((a,b)=>personalScore(b)-personalScore(a));playVideo((queue[0]||videos[0]).id,false);toggleWatchTimer()});
$('#prevVideo').addEventListener('click',()=>stepVideo(-1));
$('#nextVideo').addEventListener('click',()=>stepVideo(1));
$('#timerButton').addEventListener('click',toggleWatchTimer);
$('#stopVideo').addEventListener('click',()=>stopPlayback());
$('#fullscreenButton').addEventListener('click',async()=>{try{await $('#screenShell').requestFullscreen()}catch{showToast('영상 오른쪽 아래 전체화면 버튼을 눌러 주세요')}});
$$('[data-reaction]').forEach(button=>button.addEventListener('click',()=>recordReaction(button.dataset.reaction)));
$('#guideButton').addEventListener('click',()=>$('#guideDialog').showModal());
$('#searchInput').addEventListener('input',()=>render(true));
$('#stimulusSelect').addEventListener('change',()=>render(true));
$('#sortSelect').addEventListener('change',()=>render(true));
$('#categorySelect').addEventListener('change',event=>setCategory(event.target.value));
$$('#categoryChips button').forEach(button=>button.addEventListener('click',()=>setCategory(button.dataset.category)));
$('#resetFilters').addEventListener('click',resetAll);
$('#loadMore').addEventListener('click',()=>{visibleLimit+=pageSize;render()});
$$('[data-quick]').forEach(button=>button.addEventListener('click',()=>{
  const mode=button.dataset.quick;resetAll();
  if(mode==='hunt'){$('#stimulusSelect').value='high';$('#sortSelect').value='active'}
  if(mode==='water')setCategory('fish');
  if(mode==='calm'){$('#stimulusSelect').value='low';$('#sortSelect').value='calm'}
  render();document.querySelector('#ranking').scrollIntoView({behavior:'smooth'});
}));
$$('[data-nav]').forEach(button=>button.addEventListener('click',()=>{
  $$('[data-nav]').forEach(item=>item.classList.remove('active'));button.classList.add('active');
  if(button.dataset.nav==='home'){favoriteOnly=false;render(true);document.querySelector('#top').scrollIntoView({behavior:'smooth'})}
  if(button.dataset.nav==='ranking'){favoriteOnly=false;render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'})}
  if(button.dataset.nav==='favorites'){favoriteOnly=true;render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'});if(!favorites.size)showToast('별표를 누르면 냥이찜에 저장돼요')}
}));

updateReactionButtons();render();
