import {validTile} from './core.mjs';

export const ELEVATION_SOURCES = {
  ahn: {label:'네덜란드 AHN · 지면 DTM 0.5m 원자료', datum:'NAP', url:'https://www.ahn.nl/kwaliteitsbeschrijving'},
  gsi5a: {label:'일본 GSI · 항공 레이저 5m 원자료', datum:'일본 국가 표고 기준', url:'https://maps.gsi.go.jp/development/ichiran.html'},
  gsi10: {label:'일본 GSI · 10m 원자료', datum:'일본 국가 표고 기준', url:'https://maps.gsi.go.jp/development/ichiran.html'},
  mapzen: {label:'Mapzen · 지역별 해상도가 다른 합성 고도', datum:'원자료별 높이 기준', url:'https://registry.opendata.aws/terrain-tiles/'}
};
export function terrainRegion(lat,lng) {
  if(lat>=50.72&&lat<=53.56&&lng>=3.2&&lng<=7.28)return 'ahn';
  // Coarse request envelopes around the archipelago, not a country boundary.
  // Actual availability and every nodata pixel are checked after retrieval.
  if((lat>=20&&lat<30&&lng>=122&&lng<=154)||(lat>=30&&lat<34&&lng>=129&&lng<=142)||(lat>=34&&lat<38&&lng>=130&&lng<=142)||(lat>=38&&lat<42&&lng>=137&&lng<=146)||(lat>=42&&lat<=46&&lng>=139&&lng<=146))return 'gsi';
  return '';
}
export function tileRegion({x,y,z}) {
  const n=2**z;
  return terrainRegion(Math.atan(Math.sinh(Math.PI*(1-2*(y+.5)/n)))*180/Math.PI,(x+.5)/n*360-180);
}
export function mercatorBounds({x,y,z}) {
  if(!validTile({x,y,z}))throw Error('Invalid elevation tile');
  const half=20037508.342789244,span=2*half/2**z,left=-half+x*span,top=half-y*span;
  return [left,top-span,left+span,top];
}
export function ahnUrl(coords) {
  if(!validTile(coords)||coords.z<10||tileRegion(coords)!=='ahn')throw Error('Outside AHN request area');
  const url=new URL('https://service.pdok.nl/rws/ahn/wcs/v1_0');
  url.search=new URLSearchParams({SERVICE:'WCS',VERSION:'1.0.0',REQUEST:'GetCoverage',COVERAGE:'dtm_05m',CRS:'EPSG:3857',BBOX:mercatorBounds(coords).join(','),WIDTH:'256',HEIGHT:'256',FORMAT:'GEOTIFF',RESPONSE_CRS:'EPSG:3857',INTERPOLATION:'NEAREST'});
  return url.href;
}
// GSI's signed 24-bit centimetres are NOT Mapzen's Terrarium RGB encoding.
export function decodeGsi(rgba) {
  if(rgba.length!==256*256*4)throw Error('Invalid GSI raster size');
  const heights=new Float32Array(65536);
  for(let i=0;i<heights.length;i++) {
    const j=i*4,v=rgba[j]*65536+rgba[j+1]*256+rgba[j+2];
    const h=(v<8388608?v:v-16777216)*.01;
    heights[i]=!rgba[j+3]||v===8388608||h< -12000||h>9000?NaN:h;
  }
  return heights;
}
export function cleanAhn(values,noData) {
  if(values.length!==65536)throw Error('Invalid AHN raster size');
  return Float32Array.from(values,h=>Number.isFinite(h)&&h!==noData&&h>=-100&&h<=1000?h:NaN);
}
// Keep gaps within a selected national raster unknown. Filling individual gaps
// from another DEM could hide missing dykes or mix vertical datums silently.
export async function selectElevation(coords,cover,read) {
  const region=tileRegion(coords),fallbacks=[];
  const candidates=region==='ahn'?['ahn']:region==='gsi'?['gsi5a','gsi10']:[];
  for(const source of [...candidates,'mapzen']) {
    try {
      const heights=await read(source,coords);
      if(heights.length!==cover.length)throw Error('Unexpected elevation raster size');
      let land=0,missing=0,usable=0;
      for(let i=0;i<cover.length;i++) {
        if(cover[i]===1){land++;if(!Number.isFinite(heights[i]))missing++;}
        if((cover[i]===1||cover[i]===3)&&Number.isFinite(heights[i]))usable++;
      }
      if(!usable&&source!=='mapzen'){fallbacks.push(source);continue;}
      return {heights,quality:{source,land,missing,fallbacks}};
    } catch(error) {
      if(error.name==='AbortError'||source==='mapzen')throw error;
      fallbacks.push(source);
    }
  }
}
