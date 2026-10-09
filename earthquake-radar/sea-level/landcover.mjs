import {fromUrl} from 'geotiff';
import {createLru,validTile} from './core.mjs';
const LAND = new Set([10,20,30,40,50,60,70,90,95,100]);
const latitude=y=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;
export function coverTileId(lat,lng){
  const south=Math.floor(lat/3)*3,west=Math.floor(lng/3)*3;
  return (south<0?'S':'N')+String(Math.abs(south)).padStart(2,'0')+(west<0?'W':'E')+String(Math.abs(west)).padStart(3,'0');
}
// Each DEM cell is checked at four subcell positions against categorical data.
// Permanent water and missing/unknown classes are never eligible land.
export function landFromSamples(samples){return samples.length===4&&samples.every(v=>LAND.has(v));}
// 0 unknown, 1 land, 2 permanent water, 3 known mixed coast (path only).
export function coverFromSamples(samples){
  if(landFromSamples(samples))return 1;
  if(samples.length!==4||samples.some(v=>v!==80&&!LAND.has(v)))return 0;
  return samples.every(v=>v===80)?2:3;
}
export function coverParts(coords,available){
  if(!validTile(coords))throw Error('Invalid terrain tile');
  const n=2**coords.z,groups=new Map();
  for(let y=0;y<256;y++){
    const lat=latitude((coords.y+(y+.5)/256)/n);
    if(lat< -60||lat>83)throw Error('Land cover outside mapped latitude');
    for(let x=0;x<256;x++){
      const lng=(coords.x+(x+.5)/256)/n*360-180,id=coverTileId(lat,lng);
      if(!available.has(id))continue; // Official global coverage index: no mapped land tile.
      let group=groups.get(id);
      if(!group){group={id,left:x,right:x,top:y,bottom:y};groups.set(id,group);}
      group.left=Math.min(group.left,x);group.right=Math.max(group.right,x);group.top=Math.min(group.top,y);group.bottom=Math.max(group.bottom,y);
    }
  }
  return [...groups.values()].map(g=>({...g,width:(g.right-g.left+1)*2,height:(g.bottom-g.top+1)*2,bbox:[(coords.x+g.left/256)/n*360-180,latitude((coords.y+(g.bottom+1)/256)/n),(coords.x+(g.right+1)/256)/n*360-180,latitude((coords.y+g.top/256)/n)]}));
}
export function applyCoverRaster(mask,coords,part,raster,classified=false){
  if(raster.length!==part.width*part.height)throw Error('Invalid land cover raster');
  const n=2**coords.z,[west,south,east,north]=part.bbox;
  for(let y=part.top;y<=part.bottom;y++)for(let x=part.left;x<=part.right;x++){
    const values=[];
    for(const dy of [.25,.75])for(const dx of [.25,.75]){
      const lng=(coords.x+(x+dx)/256)/n*360-180,lat=latitude((coords.y+(y+dy)/256)/n);
      const rx=Math.max(0,Math.min(part.width-1,Math.floor((lng-west)/(east-west)*part.width)));
      const ry=Math.max(0,Math.min(part.height-1,Math.floor((north-lat)/(north-south)*part.height)));
      values.push(raster[ry*part.width+rx]);
    }
    mask[y*256+x]=classified?coverFromSamples(values):landFromSamples(values)?1:0;
  }
}
export function createLandCoverReader({classified=false}={}){
  let indexPromise;const files=createLru(6);
  return async function readLandMask(coords,signal){
    if(!indexPromise)indexPromise=fetch('/richdisk/earthquake-radar/sea-level/worldcover-index.json',{signal}).then(r=>{if(!r.ok)throw Error('Land cover index unavailable');return r.json()}).then(d=>new Set(d.tiles)).catch(e=>{indexPromise=null;throw e;});
    const parts=coverParts(coords,await indexPromise),mask=new Uint8Array(65536);
    for(const part of parts){
      if(signal?.aborted)throw Error('Land cover cancelled');
      let file=files.get(part.id);
      if(!file){file=fromUrl('/api/sea-landcover/'+part.id,{allowFullFile:false,blockSize:65536,cacheSize:12,credentials:'omit'},signal).catch(e=>{files.clear();throw e;});files.set(part.id,file);}
      const tiff=await file;
      const raster=await tiff.readRasters({bbox:part.bbox,width:part.width,height:part.height,samples:[0],interleave:true,resampleMethod:'nearest',fillValue:0,signal});
      applyCoverRaster(mask,coords,part,raster,classified);
    }
    return mask;
  };
}
