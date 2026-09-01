(()=>{
  "use strict";
  const payload=window.DISASTER_DATA||{videos:[],candidateCount:0,generatedAt:null,source:"backup"};
  const categoryOptions=[
    ["전체","◉"],["지진·쓰나미","⌁"],["홍수·폭우","≋"],["태풍·허리케인","◌"],
    ["토네이도","↯"],["화산","△"],["산불","♨"],["산사태·눈사태","▰"],
    ["폭염·한파·폭설","✣"],["가뭄·사막화","☼"],["낙뢰·우박","ϟ"],
    ["싱크홀","⊙"],["운석·우주기상","✦"],["UFO·미확인","◇"]
  ];
  const labels={latest:"최신 순위",views:"조회수 순위",recommended:"추천 순위",oldest:"오래된 순위"};
  const state={category:"전체",sort:"latest",language:localStorage.getItem("disaster-watch-language")==="original"?"original":"ko",query:"",limit:24};
  const els={
    category:document.getElementById("category"),sort:document.getElementById("sort"),language:document.getElementById("language"),
    search:document.getElementById("search"),grid:document.getElementById("videoGrid"),more:document.getElementById("more"),empty:document.getElementById("empty"),
    title:document.getElementById("rankingTitle"),rankingLabel:document.getElementById("rankingLabel"),dataState:document.getElementById("dataState"),
    candidateCount:document.getElementById("candidateCount"),languageNotice:document.getElementById("languageNotice")
  };
  const videos=Array.isArray(payload.videos)?payload.videos.filter(video=>video&&video.youtubeId):[];
  const originalOf=video=>video.originalTitle||video.titleKo||"YouTube 영상";
  const koreanTitle=video=>video.titleKo||`${video.countryKo||"세계"} ${video.category||"재난"} 관련 영상`;
  const shownTitle=video=>state.language==="original"?originalOf(video):koreanTitle(video);
  const publishedTime=video=>{
    const parsed=Date.parse(video.publishedAt||`${video.year||1970}-01-01T00:00:00Z`);
    return Number.isNaN(parsed)?0:parsed;
  };
  const publishedLabel=video=>video.publishedAt?video.publishedAt.slice(0,10).replaceAll("-","."):String(video.year||"날짜 미상");
  const compact=value=>new Intl.NumberFormat("ko-KR",{notation:"compact",maximumFractionDigits:1}).format(Number(value)||0);
  const text=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=value;return node};

  categoryOptions.forEach(([name,icon])=>{const option=document.createElement("option");option.value=name;option.textContent=`${icon} ${name}`;els.category.appendChild(option)});
  els.language.value=state.language;

  function filtered(){
    const needle=state.query.trim().toLocaleLowerCase("ko");
    const list=videos.filter(video=>{
      if(state.category!=="전체"&&video.category!==state.category)return false;
      if(!needle)return true;
      return `${koreanTitle(video)} ${originalOf(video)} ${video.countryKo||""} ${video.channel||""} ${video.category||""}`.toLocaleLowerCase("ko").includes(needle);
    });
    return list.sort((a,b)=>{
      if(state.sort==="latest")return publishedTime(b)-publishedTime(a);
      if(state.sort==="oldest")return publishedTime(a)-publishedTime(b);
      if(state.sort==="views")return (Number(b.viewCount)||0)-(Number(a.viewCount)||0)||publishedTime(b)-publishedTime(a);
      return (Number(a.rank)||9999)-(Number(b.rank)||9999)||publishedTime(b)-publishedTime(a);
    }).slice(0,100);
  }

  function card(video,index){
    const anchor=document.createElement("a");anchor.className="card";anchor.href=`https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeId)}`;anchor.target="_blank";anchor.rel="noopener noreferrer";
    anchor.setAttribute("aria-label",`${shownTitle(video)} YouTube에서 재생`);
    const visual=text("div","visual");
    const image=document.createElement("img");image.className="thumb";image.src=`https://i.ytimg.com/vi/${encodeURIComponent(video.youtubeId)}/hqdefault.jpg`;image.alt="";image.loading="lazy";image.referrerPolicy="no-referrer";
    image.addEventListener("error",()=>{image.style.opacity="0"},{once:true});
    visual.append(image,text("span","rank",String(index+1).padStart(2,"0")),text("span","youtube","YouTube"),text("span","play","▶"));
    const body=text("div","body");
    const meta=text("div","meta");meta.append(text("span","",video.category||"재난 영상"),text("b","",video.channel||"YouTube"));
    body.append(meta,text("h3","",shownTitle(video)));
    const original=originalOf(video);
    if(state.language==="ko"&&original!==koreanTitle(video)){
      const small=text("small","original-title");small.append(text("b","","원제"),document.createTextNode(original));body.append(small);
    }
    const info=text("p","card-info");
    if(video.countryKo){info.append(document.createTextNode(video.countryKo),text("i","","·"))}
    info.append(document.createTextNode(publishedLabel(video)));
    if(Number(video.viewCount)>0)info.append(text("span","views",`조회 ${compact(video.viewCount)}`));
    body.append(info);anchor.append(visual,body);return anchor;
  }

  function render(){
    const top=filtered();
    const visible=top.slice(0,state.limit);
    const fragment=document.createDocumentFragment();visible.forEach((video,index)=>fragment.append(card(video,index)));
    els.grid.replaceChildren(fragment);
    els.empty.hidden=top.length!==0;
    els.more.hidden=state.limit>=top.length;
    els.more.querySelector("span").textContent=`${Math.min(state.limit,top.length)} / ${top.length}`;
    els.rankingLabel.textContent=labels[state.sort];
    els.title.textContent=`${state.category==="전체"?"재난 영상":state.category} TOP ${top.length}`;
    els.languageNotice.textContent=state.language==="ko"?"외국어 제목은 한글로 표시하고 원제도 함께 보여줍니다.":"영상 제목을 게시된 원문 그대로 표시합니다.";
    const categoryPool=state.category==="전체"?videos:videos.filter(video=>video.category===state.category);
    const generated=payload.generatedAt?new Date(payload.generatedAt).toLocaleString("ko-KR",{dateStyle:"medium",timeStyle:"short"}):"백업 목록";
    const completeness=state.category!=="전체"&&categoryPool.length<100?` · 현재 ${categoryPool.length}/100개, 자동 갱신 대기 중`:"";
    els.dataState.querySelector("span").textContent=`개인 API 키 없이 갱신 · ${generated}${completeness}`;
  }

  els.candidateCount.textContent=compact(payload.candidateCount||videos.length);
  els.category.addEventListener("change",event=>{state.category=event.target.value;state.query="";els.search.value="";state.limit=24;render()});
  els.sort.addEventListener("change",event=>{state.sort=event.target.value;state.query="";els.search.value="";state.limit=24;render()});
  els.language.addEventListener("change",event=>{state.language=event.target.value;localStorage.setItem("disaster-watch-language",state.language);state.limit=24;render()});
  els.search.addEventListener("input",event=>{state.query=event.target.value;state.limit=24;render()});
  els.more.addEventListener("click",()=>{state.limit+=24;render()});
  render();
})();
