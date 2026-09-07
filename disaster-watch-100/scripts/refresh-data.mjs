import {writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const ROOT=dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT=join(ROOT,"data.js");
const MAX_PER_CATEGORY=120;
const MAX_SEARCH_PAGES=5;
const SEARCH_CONCURRENCY=6;
const CATEGORY_CONCURRENCY=3;
const TRANSLATE_CONCURRENCY=4;
const COMMENT_CONCURRENCY=12;
const INVIDIOUS=["https://inv.nadeko.net","https://invidious.nerdvpn.de","https://yt.chocolatemoo53.com"];

const queries={
  "지진·쓰나미":["earthquake tsunami breaking news","earthquake aftermath raw footage","tsunami evacuation disaster report","지진 쓰나미 피해 현장 뉴스","地震 津波 被害 ニュース","terremoto tsunami últimas noticias","gempa bumi tsunami berita terkini","séisme tsunami actualités"],
  "홍수·폭우":["flash flood heavy rain breaking news","flood disaster raw footage","torrential rain flooding evacuation","홍수 폭우 침수 현장 뉴스","洪水 豪雨 被害 ニュース","inundaciones lluvias torrenciales noticias","banjir hujan lebat berita terkini","inondations pluies torrentielles actualités"],
  "태풍·허리케인":["typhoon hurricane breaking news","hurricane landfall raw footage","tropical cyclone evacuation report","태풍 허리케인 피해 현장 뉴스","台風 ハリケーン 被害 ニュース","huracán ciclón últimas noticias","topan badai tropis berita terkini","ouragan cyclone actualités"],
  "토네이도":["tornado breaking news raw footage","tornado damage aftermath report","waterspout tornado caught on camera","토네이도 용오름 피해 현장 뉴스","竜巻 被害 ニュース 映像","tornado noticias imágenes reales","angin puting beliung berita terkini","tornade actualités images"],
  "화산":["volcano eruption breaking news","volcanic eruption lava raw footage","volcano evacuation ash cloud report","화산 폭발 분화 현장 뉴스","火山 噴火 被害 ニュース","erupción volcánica últimas noticias","gunung api erupsi berita terkini","éruption volcanique actualités"],
  "산불":["wildfire breaking news raw footage","forest fire evacuation report","wildfire damage aerial footage","산불 피해 진화 현장 뉴스","山火事 被害 ニュース 映像","incendio forestal últimas noticias","kebakaran hutan berita terkini","incendie de forêt actualités"],
  "산사태·눈사태":["landslide avalanche breaking news","mudslide rockslide raw footage","landslide rescue disaster report","산사태 눈사태 피해 현장 뉴스","土砂崩れ 雪崩 被害 ニュース","deslizamiento avalancha últimas noticias","tanah longsor berita terkini","glissement de terrain avalanche actualités"],
  "폭염·한파·폭설":["extreme weather heatwave cold wave news","blizzard heavy snow breaking news","extreme heat disaster report","폭염 한파 폭설 피해 현장 뉴스","猛暑 寒波 大雪 被害 ニュース","ola de calor nevada últimas noticias","gelombang panas badai salju berita","canicule vague de froid actualités"],
  "가뭄·사막화":["drought water shortage breaking news","drought disaster aerial footage","desertification crisis report","가뭄 물부족 사막화 현장 뉴스","干ばつ 水不足 被害 ニュース","sequía escasez de agua noticias","kekeringan krisis air berita","sécheresse pénurie eau actualités"],
  "낙뢰·우박":["lightning strike hailstorm breaking news","giant hail storm raw footage","severe lightning storm damage report","낙뢰 우박 피해 현장 뉴스","落雷 雹 被害 ニュース 映像","rayos granizo últimas noticias","petir hujan es berita terkini","foudre grêle actualités"],
  "싱크홀":["sinkhole ground collapse breaking news","massive sinkhole raw footage","road collapse sinkhole disaster report","싱크홀 지반침하 현장 뉴스","陥没穴 地面陥没 ニュース","socavón hundimiento últimas noticias","lubang amblas tanah berita","effondrement chaussée actualités"],
  "운석·우주기상":["meteor asteroid breaking news footage","meteorite impact caught on camera","solar storm geomagnetic storm report","운석 소행성 태양폭풍 뉴스","隕石 小惑星 太陽嵐 ニュース","meteorito asteroide tormenta solar noticias","meteor badai matahari berita","météorite astéroïde tempête solaire actualités"],
  "UFO·미확인":["UFO UAP official footage news","unidentified anomalous phenomena hearing","UAP sighting credible news report","UFO 미확인 비행물체 공식 영상 뉴스","UFO 未確認飛行物体 ニュース","OVNI UAP noticias imágenes","UFO penampakan berita terkini","OVNI PAN actualités images"]
};

const countryRules=[
  [/nepal|네팔|नेपाल/i,"네팔"],[/japan|일본|日本/i,"일본"],[/korea|한국|대한민국|韓国/i,"한국"],[/china|중국|中国/i,"중국"],
  [/indonesia|인도네시아/i,"인도네시아"],[/india|인도|भारत/i,"인도"],[/philippine|필리핀/i,"필리핀"],[/taiwan|대만|台湾/i,"대만"],
  [/thailand|태국/i,"태국"],[/turkey|türkiye|튀르키예|터키/i,"튀르키예"],[/mexico|멕시코/i,"멕시코"],[/chile|칠레/i,"칠레"],
  [/brazil|브라질/i,"브라질"],[/canada|캐나다/i,"캐나다"],[/australia|호주/i,"호주"],[/russia|러시아/i,"러시아"],
  [/ukraine|우크라이나/i,"우크라이나"],[/italy|이탈리아/i,"이탈리아"],[/spain|스페인/i,"스페인"],[/france|프랑스/i,"프랑스"],
  [/germany|독일/i,"독일"],[/united kingdom|britain|영국/i,"영국"],[/united states|\busa\b|america|미국/i,"미국"],
  [/hawaii|하와이/i,"미국"],[/california|texas|florida|미국/i,"미국"],[/iceland|아이슬란드/i,"아이슬란드"],
  [/pakistan|파키스탄/i,"파키스탄"],[/afghanistan|아프가니스탄/i,"아프가니스탄"],[/bangladesh|방글라데시/i,"방글라데시"]
];

function hash(value){let result=0;for(const character of value)result=(result*31+character.codePointAt(0))>>>0;return result}
function validId(value){return typeof value==="string"&&/^[\w-]{11}$/.test(value)}
function clean(value){return typeof value==="string"?value.replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/\s+/g," ").trim():""}
function countryOf(title){return countryRules.find(([pattern])=>pattern.test(title))?.[1]||"세계"}
function numberOf(value){const number=typeof value==="number"?value:Number(String(value??"").replace(/[^\d.-]/g,""));return Number.isFinite(number)&&number>=0?Math.round(number):0}
function publishedAt(value){const numeric=numberOf(value);if(!numeric)return null;const date=new Date(numeric>10_000_000_000?numeric:numeric*1000);return Number.isNaN(date.getTime())?null:date.toISOString()}
function needsKorean(value){return [...value].some(character=>/\p{L}/u.test(character)&&!/\p{Script=Hangul}/u.test(character))}
function usefulTranslation(original,translated){return translated&&translated.trim()!==original.trim()&&/[가-힣]/.test(translated)}

async function timedFetch(url,options={},timeout=4500){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...options,signal:controller.signal,headers:{accept:"application/json","accept-language":"en-US,en;q=.8","user-agent":"Mozilla/5.0 DisasterWatchUpdater/1.0",...(options.headers||{})}})}finally{clearTimeout(timer)}
}

async function mapLimit(values,limit,worker){
  const output=new Array(values.length);let cursor=0;
  const run=async()=>{while(cursor<values.length){const index=cursor++;try{output[index]=await worker(values[index],index)}catch{output[index]=null}}};
  await Promise.all(Array.from({length:Math.min(limit,values.length)},run));return output;
}

function parseInvidious(item,category,rank){
  if(!item||item.type!=="video"||item.isUpcoming===true||!validId(item.videoId))return null;
  const title=clean(item.title);const date=publishedAt(item.published);if(!title)return null;
  return {category,originalTitle:title,titleKo:"",countryKo:countryOf(title),year:date?Number(date.slice(0,4)):0,youtubeId:item.videoId,channel:clean(item.author)||"YouTube",publishedAt:date,viewCount:numberOf(item.viewCount),rank,isLive:true};
}

function rendererText(value){if(!value||typeof value!=="object")return"";if(typeof value.simpleText==="string")return value.simpleText.trim();return Array.isArray(value.runs)?value.runs.map(run=>typeof run?.text==="string"?run.text:"").join("").trim():""}
function relativeDate(value){const match=value.toLowerCase().match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);if(!match)return null;const units={second:1e3,minute:6e4,hour:36e5,day:864e5,week:6048e5,month:26298e5,year:315576e5};return new Date(Date.now()-Number(match[1])*units[match[2]]).toISOString()}
function compactViews(value){const normalized=value.replace(/,/g,"");const match=normalized.match(/([\d.]+)\s*([KMB])/i);if(!match)return numberOf(normalized);return Math.round(Number(match[1])*({K:1e3,M:1e6,B:1e9}[match[2].toUpperCase()]))||0}
function extractObjects(html,marker,limit=30){const found=[];let cursor=0;while(found.length<limit){const at=html.indexOf(marker,cursor);if(at<0)break;const start=html.indexOf("{",at+marker.length);if(start<0)break;let depth=0,quoted=false,escaped=false,end=-1;for(let i=start;i<html.length;i++){const char=html[i];if(quoted){if(escaped)escaped=false;else if(char==="\\")escaped=true;else if(char==='"')quoted=false;continue}if(char==='"'){quoted=true;continue}if(char==="{")depth++;else if(char==="}"&&--depth===0){end=i+1;break}}if(end<0)break;found.push(html.slice(start,end));cursor=end}return found}
function parseRenderer(item,category,rank){
  const id=item?.videoId,title=clean(rendererText(item?.title));if(!validId(id)||!title||item?.upcomingEventData)return null;
  const date=relativeDate(rendererText(item.publishedTimeText));
  return {category,originalTitle:title,titleKo:"",countryKo:countryOf(title),year:date?Number(date.slice(0,4)):0,youtubeId:id,channel:clean(rendererText(item.ownerText)||rendererText(item.longBylineText))||"YouTube",publishedAt:date,viewCount:compactViews(rendererText(item.viewCountText)),rank,isLive:true};
}

function datedQuery(query,page){if(page===1)return query;const end=new Date().getUTCFullYear()+1-(page-2)*4;return `${query} after:${Math.max(2005,end-4)}-01-01 before:${end}-01-01`}
async function youtubeFallback(query,category,page,rankBase){
  const url=new URL("https://www.youtube.com/results");url.searchParams.set("search_query",datedQuery(query,page));url.searchParams.set("sp","EgIQAQ==");url.searchParams.set("hl","en");url.searchParams.set("gl","US");
  try{const response=await timedFetch(url,{headers:{accept:"text/html"}},5500);if(!response.ok)return[];const html=await response.text();return extractObjects(html,'"videoRenderer":').flatMap((raw,index)=>{try{const video=parseRenderer(JSON.parse(raw),category,rankBase+index);return video?[video]:[]}catch{return[]}})}catch{return[]}
}

async function searchOne(query,category,page,rankBase){
  const start=hash(`${category}:${page}:${query}`)%INVIDIOUS.length;
  for(let rotation=0;rotation<2;rotation++){
    const base=INVIDIOUS[(start+rotation)%INVIDIOUS.length];const url=new URL("/api/v1/search",base);
    url.searchParams.set("q",query);url.searchParams.set("type","video");url.searchParams.set("page",String(page));url.searchParams.set("sort_by",page===1?"relevance":page===2?"upload_date":"view_count");
    try{const response=await timedFetch(url,{},3500);if(!response.ok)continue;const json=await response.json();if(!Array.isArray(json))continue;const videos=json.map((item,index)=>parseInvidious(item,category,rankBase+index)).filter(Boolean).map(video=>({...video,_commentsBase:base}));if(videos.length)return videos}catch{}
  }
  return youtubeFallback(query,category,page,rankBase);
}

async function searchCategory(category,categoryQueries){
  const pool=new Map();let candidateCount=0,rankBase=1;
  for(let page=1;page<=MAX_SEARCH_PAGES&&pool.size<MAX_PER_CATEGORY;page++){
    const batches=await mapLimit(categoryQueries,SEARCH_CONCURRENCY,(query,index)=>searchOne(query,category,page,rankBase+index*40));
    for(const videos of batches.filter(Boolean)){candidateCount+=videos.length;for(const video of videos){const current=pool.get(video.youtubeId);if(!current||video.viewCount>current.viewCount)pool.set(video.youtubeId,current?{...video,rank:current.rank}:video)}}
    rankBase+=categoryQueries.length*40;
  }
  const videos=[...pool.values()].sort((a,b)=>a.rank-b.rank).slice(0,MAX_PER_CATEGORY).map((video,index)=>({...video,rank:index+1}));
  console.log(`${category}: ${videos.length} unique / ${candidateCount} candidates`);return {videos,candidateCount};
}

async function edgeChunk(items){
  for(let attempt=0;attempt<2;attempt++)try{const response=await timedFetch("https://edge.microsoft.com/translate/translatetext?from=&to=ko&isEnterpriseClient=false",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(items.map(item=>item.originalTitle))},7000);if(!response.ok)throw new Error(String(response.status));const json=await response.json();const result=new Map();items.forEach((item,index)=>{const translated=json?.[index]?.translations?.[0]?.text?.trim();if(usefulTranslation(item.originalTitle,translated))result.set(item.originalTitle,translated)});return result}catch{await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)))}return new Map()
}
async function googleOne(title){
  for(let attempt=0;attempt<3;attempt++){
    try{const url=new URL("https://translate.googleapis.com/translate_a/single");url.searchParams.set("client","gtx");url.searchParams.set("sl","auto");url.searchParams.set("tl","ko");url.searchParams.set("dt","t");url.searchParams.set("q",title);const response=await timedFetch(url,{},5500);if(!response.ok)throw new Error(String(response.status));const json=await response.json();const translated=Array.isArray(json?.[0])?json[0].map(segment=>Array.isArray(segment)?segment[0]||"":"").join("").trim():"";if(usefulTranslation(title,translated))return translated}catch{}
    await new Promise(resolve=>setTimeout(resolve,350*(attempt+1)));
  }
  return null;
}
async function translate(videos){
  const foreign=[...new Map(videos.filter(video=>needsKorean(video.originalTitle)).map(video=>[video.originalTitle,video])).values()];const translations=new Map();
  const chunks=Array.from({length:Math.ceil(foreign.length/16)},(_,index)=>foreign.slice(index*16,index*16+16));
  const edgeResults=await mapLimit(chunks,TRANSLATE_CONCURRENCY,edgeChunk);for(const result of edgeResults.filter(Boolean))for(const [key,value] of result)translations.set(key,value);
  const missing=foreign.filter(video=>!translations.has(video.originalTitle));
  const googleResults=await mapLimit(missing,10,video=>googleOne(video.originalTitle));googleResults.forEach((value,index)=>{if(value)translations.set(missing[index].originalTitle,value)});
  console.log(`Translations: ${translations.size}/${foreign.length}`);
  return videos.map(video=>({...video,titleKo:translations.get(video.originalTitle)||(!needsKorean(video.originalTitle)?video.originalTitle:`${video.countryKo} ${video.category} 관련 영상`)}));
}

async function commentCountFrom(base,videoId){
  try{const url=new URL(`/api/v1/comments/${videoId}`,base);url.searchParams.set("sort_by","top");url.searchParams.set("source","youtube");const response=await timedFetch(url,{},5000);if(!response.ok)return null;const json=await response.json();if(json?.commentCount===undefined||json?.commentCount===null)return null;const count=numberOf(json.commentCount);return Number.isFinite(count)?count:null}catch{return null}
}
async function loadCommentCounts(videos){
  let found=0;
  const values=await mapLimit(videos,COMMENT_CONCURRENCY,async video=>{
    const bases=[video._commentsBase,...INVIDIOUS].filter((value,index,array)=>value&&array.indexOf(value)===index);
    for(const base of bases){const count=await commentCountFrom(base,video.youtubeId);if(count!==null){found++;return count}}
    return 0;
  });
  console.log(`Comment counts: ${found}/${videos.length}`);return new Map(videos.map((video,index)=>[video.youtubeId,values[index]||0]));
}

async function main(){
  const categoryResults=await mapLimit(Object.entries(queries),CATEGORY_CONCURRENCY,([category,categoryQueries])=>searchCategory(category,categoryQueries));
  const rawVideos=categoryResults.flatMap(result=>result.videos);const candidateCount=categoryResults.reduce((sum,result)=>sum+result.candidateCount,0);
  const sufficientlyComplete=Object.keys(queries).filter(category=>rawVideos.filter(video=>video.category===category).length>=100).length;
  if(rawVideos.length<1300||sufficientlyComplete!==Object.keys(queries).length)throw new Error(`Public search was incomplete: ${rawVideos.length} videos, ${sufficientlyComplete} complete categories`);
  const [translated,commentCounts]=await Promise.all([translate(rawVideos),loadCommentCounts(rawVideos)]);
  const videos=translated.map(({_commentsBase,...video})=>({...video,commentCount:commentCounts.get(video.youtubeId)||0}));const payload={schema:1,generatedAt:new Date().toISOString(),candidateCount,source:"public-search",videos};
  await writeFile(OUTPUT,`window.DISASTER_DATA=${JSON.stringify(payload)};\n`,"utf8");console.log(`Wrote ${videos.length} videos to ${OUTPUT}`);
}

main().catch(error=>{console.error(error);process.exitCode=1});
