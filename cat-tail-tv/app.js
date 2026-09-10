const videos=Array.isArray(window.CAT_TV_VIDEOS)?window.CAT_TV_VIDEOS:[];
if(!videos.length)throw new Error('영상 목록을 불러오지 못했습니다.');

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
let visibleLimit=100;
const pageSize=100;

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

function updateNowMeta(video){
  const rank=videos.slice().sort((a,b)=>b.score-a.score).findIndex(item=>item.id===video.id)+1;
  $('#nowRank').textContent=`추천 ${rank}`;
  $('#nowKicker').textContent=`${categoryNames[video.category]} · ${stimulusNames[video.stimulus]}`;
  $('#nowTitle').textContent=video.title;
  $('#nowWhy').textContent=video.why;
  $('#youtubeLink').href=`https://www.youtube.com/watch?v=${video.id}`;
  $('#screenIdle img').src=`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  $('#screenIdle img').alt=`${video.title} 미리보기`;
}

function playVideo(id,scroll=false){
  const video=videos.find(item=>item.id===id);if(!video)return;
  clearWatchTimer();currentId=id;$('#screenIdle').hidden=true;
  const frame=$('#videoFrame');frame.hidden=false;
  frame.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1" title="${video.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe>`;
  updateNowMeta(video);
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
  if(button.dataset.nav==='ranking'){resetAll();document.querySelector('#ranking').scrollIntoView({behavior:'smooth'})}
  if(button.dataset.nav==='favorites'){favoriteOnly=true;render(true);document.querySelector('#ranking').scrollIntoView({behavior:'smooth'});if(!favorites.size)showToast('별표를 누르면 냥이찜에 저장돼요')}
}));

updateNowMeta(videos[0]);updateReactionButtons();render();
