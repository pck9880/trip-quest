import { $, setText, toast, esc } from '../core/dom.js';
import { drawMap, focusMapPoint } from '../ui/main-map.js';
import { hideMainLanding } from '../ui/landing.js';
import { gpsService } from '../services/gps-service.js';

export function createOriginController({state,travelService,setStep,recommend}){
  async function gpsOrigin(pos){
    const lat=Number(pos.lat ?? pos.coords?.latitude),lng=Number(pos.lng ?? pos.coords?.longitude);
    const accuracy=Number(pos.accuracyM ?? pos.coords?.accuracy);
    const base={lat,lng,name:'현재 위치',accuracy:Number.isFinite(accuracy)?accuracy:null};
    try{
      const place=await travelService.reverseGeocode(base.lat,base.lng);
      return place?{...base,...place,lat:base.lat,lng:base.lng,accuracy:base.accuracy}:base;
    }catch{return base}
  }
  function gpsErrorMessage(err){
    if(err?.message)return err.message;
    if(err?.code===1)return '위치 권한이 꺼져 있습니다. 브라우저/기기에서 위치 권한을 허용해주세요.';
    if(err?.code===2)return 'GPS 위치를 확인하지 못했습니다. 기기의 위치 서비스를 켜고 다시 시도해주세요.';
    if(err?.code===3)return 'GPS 응답이 늦습니다. 실외 또는 창가에서 다시 시도해주세요.';
    return '현재 위치를 확인하지 못했습니다. 다시 시도해주세요.';
  }
  async function getFreshGps(){
    const support=gpsService.support();
    if(!support.ok)throw support.error;
    return gpsService.current({enableHighAccuracy:true,timeout:20000,maximumAge:0});
  }
  async function startFromMainLocation(){
    const btn=$('#mainLocateBtn'),status=$('#mainLocationStatus');
    if(btn){btn.disabled=true;btn.textContent='GPS 위치 찾는 중…';btn.classList.remove('done','error')}
    if(status)status.textContent='GPS 신호와 위치 권한을 확인하고 있습니다…';
    try{
      const pos=await getFreshGps();
      const origin=await gpsOrigin(pos);await setOrigin(origin);
      if(btn){btn.classList.add('done');btn.textContent='위치 확인 완료 ✓'}
      if(status)status.textContent=`${origin.name||origin.address||'현재 위치'}${Number.isFinite(pos.accuracyM)?` · GPS 정확도 약 ${Math.round(pos.accuracyM)}m`:''}`;
      setTimeout(()=>{hideMainLanding();setStep(2);const manual=$('#manualOptions');if(manual)manual.hidden=true;const toggle=$('#manualToggle');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.textContent='직접 선택으로 찾기 ↓'}setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},180)},700);
    }catch(err){
      if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='GPS 다시 확인'}
      if(status)status.textContent=gpsErrorMessage(err);
    }
  }

  async function useLocation(goNext=false){
    setText('#originLabel','GPS 현재 위치를 확인하고 있습니다…');
    try{
      const pos=await getFreshGps();const origin=await gpsOrigin(pos);await setOrigin(origin);toast(`${origin.name||'현재 위치'}로 설정했습니다.`);if(goNext)setStep(2);
    }catch(err){const message=gpsErrorMessage(err);setText('#originLabel',message);toast(message)}
  }

  async function setOrigin(o){
    state.origin=o;
    const place=o.name&&o.name!=='현재 위치'?o.name:(o.address||'현재 위치');
    const accuracy=Number.isFinite(Number(o.accuracy))?` · ±${Math.round(Number(o.accuracy))}m`:'';
    setText('#originLabel',`${place}${accuracy}`);
    focusMapPoint(o,13);drawMap(state.origin,state.recommendations);await refreshLive();
    if(state.sharedPending&&state.sharedTrip){state.sharedPending=false;setTimeout(()=>recommend({focusQuery:state.sharedTrip.destination.name}),120)}
  }

  async function refreshLive(){if(!state.origin)return;try{const b=await travelService.bootstrap(state.origin);const w=b.weather.current;if(w.source==='fallback'){setText('#weatherNow','날씨 확인 필요');setText('#weatherMeta','날씨 API 연결 대기')}else{setText('#weatherNow',`${w.condition} ${Math.round(w.temperature_2m)}°`);setText('#weatherMeta',`체감 ${Math.round(w.apparent_temperature)}° · 바람 ${Math.round(w.wind_speed_10m)}km/h · Open-Meteo`)}setText('#trafficNow',b.traffic.label);setText('#trafficMeta',b.traffic.source);setText('#updatedAt',new Date(b.updatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 갱신')}catch{setText('#weatherNow','업데이트 실패');setText('#trafficNow','업데이트 실패')}}

  async function searchOrigin(){const q=$('#originSearch').value.trim();if(!q)return;$('#originResults').innerHTML='<div class="empty-state">출발지를 찾고 있습니다…</div>';try{const j=await travelService.geocode(q);if(!j.items.length){$('#originResults').innerHTML='<div class="error">검색 결과가 없습니다.</div>';return}$('#originResults').innerHTML=j.items.map((x,i)=>`<button data-i="${i}"><span><b>${esc(x.name)}</b><br><small>${esc(x.address||'')}</small></span><span>선택 →</span></button>`).join('')+'<div class="source-note">검색 데이터: OpenStreetMap / Nominatim</div>';$('#originResults').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const x=j.items[Number(b.dataset.i)];await setOrigin({...x,name:x.name});$('#originResults').innerHTML='';$('#originSearch').value='';toast('출발지를 설정했습니다.');setStep(2);const manual=$('#manualOptions');if(manual)manual.hidden=true;setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},160)};}catch(e){$('#originResults').innerHTML=`<span class="error">${esc(e.message)}</span>`}}
  return {startFromMainLocation,useLocation,setOrigin,refreshLive,searchOrigin};
}
