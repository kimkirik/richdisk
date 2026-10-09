// OpenFreeMap Liberty (OpenMapTiles, CC BY 4.0), customized for Korean labels.
// Use the map's Korean name when available, otherwise retain the source name.
export function koreanMapStyle(source, countryNames) {
  const style=JSON.parse(JSON.stringify(source));
  const countryCases=Object.entries(countryNames).filter(([code])=>/^[A-Z]{2}$/.test(code)).flat();
  for(const layer of style.layers) {
    if(!layer.layout?.['text-field']||/shield/.test(layer.id))continue;
    layer.layout['text-field']=['coalesce',['get','name:ko'],['get','name_ko'],
      ...(layer['source-layer']==='place'?[['case',['==',['get','class'],'country'],['match',['get','iso_a2'],...countryCases,['get','name']],['get','name']]]:[]),['get','name']];
    layer.layout['text-letter-spacing']=0;
    layer.layout['text-transform']='none';
    layer.layout['text-font']=['Noto Sans Regular'];
    layer.layout['text-allow-overlap']=false;
  }
  return style;
}

function loadScript(src) {
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;
    script.onload=resolve;script.onerror=()=>reject(new Error('지도 글꼴 엔진 로드 실패'));
    document.head.append(script);
  });
}

export async function mountKoreanBasemap(map,L,countryNames,initialMode,onReady) {
  const css=document.createElement('link');css.rel='stylesheet';css.href='/richdisk/earthquake-radar/map/vendor/maplibre.css';document.head.append(css);
  const [response]=await Promise.all([fetch('/richdisk/earthquake-radar/map/liberty.json'),loadScript('/richdisk/earthquake-radar/map/vendor/maplibre.js')]);
  if(!response.ok)throw new Error('한글 지도 자료 로드 실패');
  await loadScript('/richdisk/earthquake-radar/map/vendor/leaflet-maplibre.js');
  const style=koreanMapStyle(await response.json(),countryNames);
  map.createPane('koreanBasemapPane');map.getPane('koreanBasemapPane').style.zIndex='220';map.getPane('koreanBasemapPane').style.pointerEvents='none';
  // A single canvas and shared tiles survive map-mode switches. Keep loading off
  // the earthquake fetch path and limit workers on phones.
  window.maplibregl.setWorkerCount(2);
  const layer=L.maplibreGL({style,interactive:false,pane:'koreanBasemapPane',attributionControl:false,localIdeographFontFamily:'"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'});
  let mode=initialMode,ready=false;
  function setMode(next) {
    mode=next;
    if(!ready)return;
    const gl=layer.getMaplibreMap();
    for(const item of style.layers) {
      const label=item.type==='symbol';
      gl.setLayoutProperty(item.id,'visibility',label||mode==='street'?'visible':'none');
      if(label&&item.layout?.['text-field']) {
        gl.setPaintProperty(item.id,'text-color',mode==='satellite'?'#f4f8fc':(item.paint?.['text-color']||'#263b48'));
        gl.setPaintProperty(item.id,'text-halo-color',mode==='satellite'?'#172c39':(item.paint?.['text-halo-color']||'#ffffff'));
        gl.setPaintProperty(item.id,'text-halo-width',mode==='satellite'?1.5:1.2);
      }
    }
  }
  // Hide vector land before first paint in satellite mode (no flash of roads).
  if(mode!=='street')for(const item of style.layers)if(item.type!=='symbol')item.layout={...item.layout,visibility:'none'};
  layer.addTo(map);
  const gl=layer.getMaplibreMap();
  gl.once('load',()=>{ready=true;setMode(mode);map.getContainer().dataset.labelLanguage='ko';onReady();});
  map.attributionControl.addAttribution('<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · © OpenMapTiles · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
  return {setMode};
}
