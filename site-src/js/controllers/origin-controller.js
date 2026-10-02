import { $, setText, toast, esc } from '../core/dom.js';
import { drawMap, focusMapPoint } from '../ui/main-map.js';
import { hideMainLanding } from '../ui/landing.js';

export function createOriginController({state,api,setStep,recommend}){
  async function startFromMainLocation(){
    const btn=$('#mainLocateBtn'),status=$('#mainLocationStatus');
    if(!navigator.geolocation){
      btn?.classList.add('error');if(btn)btn.textContent='위치 기능을 사용할 수 없음';
      if(status)status.textContent='출발지를 직접 입력해주세요.';return;
    }
    if(btn){btn.disabled=true;btn.textContent='내 위치 찾는 중…';btn.classList.remove('done','error')}
    if(status)status.textContent='현재 위치 권한을 확인하고 있습니다…';
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});
        if(btn){btn.classList.add('done');btn.textContent='위치 확인 완료 ✓'}
        if(status)status.textContent='현재 위치를 찾았습니다. 여행 취향 검색 화면으로 이동합니다.';
        setTimeout(()=>{
          hideMainLanding();
          setStep(2);
          const manual=$('#manualOptions');if(manual)manual.hidden=true;
          const toggle=$('#manualToggle');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.textContent='직접 선택으로 찾기 ↓'}
          setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},180);
        },520);
      }catch(e){
        if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='다시 시도'}
        if(status)status.textContent='위치를 설정하지 못했습니다. 다시 시도해주세요.';
      }
    },()=>{
      if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='위치 권한 다시 확인'}
      if(status)status.textContent='위치 권한이 꺼져 있습니다. 권한을 허용하거나 출발지를 직접 입력해주세요.';
    },{enableHighAccuracy:true,timeout:9000});
  }

  async function useLocation(goNext=false){
    if(!navigator.geolocation){toast('브라우저 위치 기능을 사용할 수 없습니다. 출발지를 검색해주세요.');return}
    $('#originLabel').textContent='현재 위치를 확인하고 있습니다…';
    navigator.geolocation.getCurrentPosition(async pos=>{await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});toast('현재 위치를 설정했습니다.');if(goNext)setStep(2)},()=>{setText('#originLabel','위치 권한이 꺼져 있습니다. 출발지를 직접 검색하세요.');toast('위치 권한을 허용하거나 출발지를 검색해주세요.')},{enableHighAccuracy:true,timeout:8000});
  }

  async function setOrigin(o){state.origin=o;setText('#originLabel',`${o.name||'출발지'} · ${Number(o.lat).toFixed(5)}, ${Number(o.lng).toFixed(5)}`);focusMapPoint(o,10);drawMap(state.origin,state.recommendations);await refreshLive();if(state.sharedPending&&state.sharedTrip){state.sharedPending=false;setTimeout(()=>recommend({focusQuery:state.sharedTrip.destination.name}),120)}}

  async function refreshLive(){if(!state.origin)return;try{const b=await api(`/api/bootstrap?lat=${state.origin.lat}&lng=${state.origin.lng}`);const w=b.weather.current;if(w.source==='fallback'){setText('#weatherNow','날씨 확인 필요');setText('#weatherMeta','날씨 API 연결 대기')}else{setText('#weatherNow',`${w.condition} ${Math.round(w.temperature_2m)}°`);setText('#weatherMeta',`체감 ${Math.round(w.apparent_temperature)}° · 바람 ${Math.round(w.wind_speed_10m)}km/h`)}setText('#trafficNow',b.traffic.label);setText('#trafficMeta',b.traffic.source);setText('#updatedAt',new Date(b.updatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 갱신')}catch{setText('#weatherNow','업데이트 실패');setText('#trafficNow','업데이트 실패')}}

  async function searchOrigin(){const q=$('#originSearch').value.trim();if(!q)return;$('#originResults').innerHTML='<div class="empty-state">출발지를 찾고 있습니다…</div>';try{const j=await api(`/api/geocode?q=${encodeURIComponent(q)}`);if(!j.items.length){$('#originResults').innerHTML='<div class="error">검색 결과가 없습니다.</div>';return}$('#originResults').innerHTML=j.items.map((x,i)=>`<button data-i="${i}"><span><b>${esc(x.name)}</b><br><small>${esc(x.address||'')}</small></span><span>선택 →</span></button>`).join('');$('#originResults').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const x=j.items[Number(b.dataset.i)];await setOrigin({...x,name:x.name});$('#originResults').innerHTML='';$('#originSearch').value='';toast('출발지를 설정했습니다.');setStep(2);const manual=$('#manualOptions');if(manual)manual.hidden=true;setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},160)};}catch(e){$('#originResults').innerHTML=`<span class="error">${esc(e.message)}</span>`}}
  return {startFromMainLocation,useLocation,setOrigin,refreshLive,searchOrigin};
}
