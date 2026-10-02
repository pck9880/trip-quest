import { $, esc, toast } from '../core/dom.js';
import { SEARCH_MODE_CONFIGS } from '../services/place-search-service.js';

function distanceLabel(km){
  const n=Number(km);
  if(!Number.isFinite(n))return '';
  return n<1?`${Math.round(n*1000)}m`:`${n.toFixed(n<10?1:0)}km`;
}

export function initSearchMode({state,travelService}){
  const buttons=[...document.querySelectorAll('[data-search-mode]')];
  const regionPanel=$('#searchRegionPanel');
  const regionInput=$('#searchRegionInput');
  const regionResults=$('#searchRegionResults');
  const radiusControl=$('#localRadiusControl');
  const placeResults=$('#placeSearchResults');

  function mode(){return SEARCH_MODE_CONFIGS[state.searchMode]||SEARCH_MODE_CONFIGS.travel}

  function syncRegionLabel(){
    const label=$('#searchRegionLabel');
    if(!label)return;
    const region=state.searchRegion;
    label.textContent=region?region.address||region.name:'내 위치 또는 지역을 선택하세요.';
  }

  function syncModeUI(){
    const cfg=mode(),local=cfg.id!=='travel';
    document.body.classList.toggle('tq-local-search-mode',local);
    document.body.dataset.searchMode=cfg.id;
    buttons.forEach(button=>{
      const active=button.dataset.searchMode===cfg.id;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(regionPanel)regionPanel.hidden=!local;
    if(radiusControl)radiusControl.hidden=!local;
    const distance=$('#advancedDistanceControl');if(distance)distance.hidden=local;
    const advanced=$('#openAdvancedSearch');if(advanced)advanced.hidden=local;
    const input=$('#aiInput');if(input)input.placeholder=cfg.placeholder;
    const send=$('#aiSend');if(send)send.textContent=cfg.button;
    const eyebrow=document.querySelector('.tq-search-head .eyebrow');
    const title=$('#aiTitle');
    const desc=document.querySelector('.tq-search-head p');
    if(cfg.id==='travel'){
      if(eyebrow)eyebrow.textContent='TRIP QUEST 추천';
      if(title)title.textContent='오늘 어디로 떠날까요?';
      if(desc)desc.textContent='거리와 취향을 분석해 갈 만한 여행지를 추천합니다.';
    }else if(cfg.id==='cafe'){
      if(eyebrow)eyebrow.textContent='CAFE SEARCH';
      if(title)title.textContent='어느 동네 카페를 찾을까요?';
      if(desc)desc.textContent='동 단위 지역이나 현재 위치를 정한 뒤 실제 장소를 검색합니다.';
    }else{
      if(eyebrow)eyebrow.textContent='FOOD SEARCH';
      if(title)title.textContent='어느 동네 맛집을 찾을까요?';
      if(desc)desc.textContent='지역과 음식 키워드를 함께 입력해 주변 음식점을 찾습니다.';
    }
    if(local){
      $('#aiConversation').hidden=true;
      $('#aiProgress').hidden=true;
      $('#aiSearchStatus').hidden=true;
    }else if(placeResults){
      placeResults.hidden=true;
      placeResults.innerHTML='';
    }
    syncRegionLabel();
  }

  function setMode(next){
    state.searchMode=SEARCH_MODE_CONFIGS[next]?next:'travel';
    state.placeResults=[];
    if(placeResults){placeResults.hidden=true;placeResults.innerHTML=''}
    syncModeUI();
    $('#aiInput')?.focus({preventScroll:true});
  }

  async function resolveRegion(){
    const query=regionInput?.value.trim()||'';
    if(!query)return;
    if(regionResults){regionResults.hidden=false;regionResults.innerHTML='<div class="tq-region-empty">지역을 찾고 있습니다…</div>'}
    try{
      const result=await travelService.searchRegion(query);
      const items=result.items||[];
      if(!items.length){regionResults.innerHTML='<div class="tq-region-empty">지역을 찾지 못했습니다. 시·군·구·동 이름을 조금 더 정확히 입력해주세요.</div>';return}
      regionResults.innerHTML=items.map((item,index)=>`<button type="button" data-region-index="${index}"><span><strong>${esc(item.name)}</strong><small>${esc(item.address)}</small></span><b>선택</b></button>`).join('');
      regionResults.onclick=e=>{
        const button=e.target.closest('[data-region-index]');if(!button)return;
        const item=items[Number(button.dataset.regionIndex)];
        state.searchRegion=item;
        if(regionInput)regionInput.value='';
        regionResults.hidden=true;regionResults.innerHTML='';
        syncRegionLabel();
        toast(`${item.name}을(를) 검색 지역으로 설정했습니다.`);
      };
    }catch(error){
      if(regionResults)regionResults.innerHTML=`<div class="tq-region-empty error">${esc(error.message||'지역 검색에 실패했습니다.')}</div>`;
    }
  }

  async function useCurrentRegion(){
    if(!navigator.geolocation){toast('현재 위치 기능을 사용할 수 없습니다. 지역을 직접 입력해주세요.');return}
    const button=$('#searchUseCurrentBtn');
    if(button){button.disabled=true;button.textContent='위치 확인 중…'}
    navigator.geolocation.getCurrentPosition(pos=>{
      state.searchRegion={id:'gps-current',name:'현재 위치',address:'GPS 현재 위치',lat:pos.coords.latitude,lng:pos.coords.longitude,provider:'gps'};
      syncRegionLabel();
      if(button){button.disabled=false;button.textContent='내 위치'}
      toast('현재 위치를 검색 지역으로 설정했습니다.');
    },()=>{
      if(button){button.disabled=false;button.textContent='내 위치'}
      toast('위치 권한을 허용하거나 지역을 직접 입력해주세요.');
    },{enableHighAccuracy:true,timeout:9000,maximumAge:30000});
  }

  function renderPlaces(result){
    const cfg=mode(),items=result.items||[];
    state.placeResults=items;
    placeResults.hidden=false;
    if(!items.length){
      placeResults.innerHTML=`<section class="tq-place-empty"><small>${esc(cfg.label)} SEARCH</small><strong>현재 범위에서 검색 결과가 부족합니다.</strong><p>검색 반경을 넓히거나 동·구 이름과 검색어를 바꿔보세요.</p><span>${esc(result.source||'검색 데이터')}</span></section>`;
      return;
    }
    placeResults.innerHTML=`<div class="tq-place-results-head"><div><small>${esc(cfg.label)} SEARCH</small><strong>${items.length}곳 찾음</strong></div><span>${esc(result.source||'검색 데이터')}</span></div><div class="tq-place-results-list">${items.map((item,index)=>`<article class="tq-place-result-card"><div class="tq-place-rank">${String(index+1).padStart(2,'0')}</div><div><h3>${esc(item.name)}</h3><p>${esc(item.address||'주소 정보 없음')}</p><div><span>${esc(item.category||cfg.label)}</span>${Number.isFinite(item.distanceKm)?`<span>약 ${distanceLabel(item.distanceKm)}</span>`:''}</div></div><button type="button" data-place-index="${index}">지도</button></article>`).join('')}</div>`;
    placeResults.onclick=e=>{
      const button=e.target.closest('[data-place-index]');if(!button)return;
      const item=items[Number(button.dataset.placeIndex)];
      if(item?.detailUrl)window.open(item.detailUrl,'_blank','noopener');
    };
  }

  async function searchLocalPlaces(query){
    if(state.searchMode==='travel')return false;
    const center=state.searchRegion||state.origin;
    if(!center){
      toast('검색할 지역을 먼저 선택하거나 내 위치를 사용해주세요.');
      regionInput?.focus();
      return true;
    }
    const send=$('#aiSend');
    if(send){send.disabled=true;send.textContent='검색 중…'}
    if(placeResults){placeResults.hidden=false;placeResults.innerHTML='<div class="tq-place-loading">주변 장소를 찾고 있습니다…</div>'}
    try{
      const result=await travelService.searchPlaces({
        mode:state.searchMode,
        query,
        region:center,
        radiusKm:state.localRadiusKm
      });
      renderPlaces(result);
    }catch(error){
      placeResults.hidden=false;
      placeResults.innerHTML=`<section class="tq-place-empty error"><strong>장소 검색에 실패했습니다.</strong><p>${esc(error.message||'잠시 후 다시 시도해주세요.')}</p></section>`;
    }finally{
      if(send){send.disabled=false;send.textContent=mode().button}
    }
    return true;
  }

  buttons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.searchMode)));
  $('#searchRegionBtn')?.addEventListener('click',resolveRegion);
  regionInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolveRegion()}});
  $('#searchUseCurrentBtn')?.addEventListener('click',useCurrentRegion);
  radiusControl?.addEventListener('click',e=>{
    const button=e.target.closest('[data-radius-km]');if(!button)return;
    state.localRadiusKm=Number(button.dataset.radiusKm)||2;
    radiusControl.querySelectorAll('[data-radius-km]').forEach(x=>x.classList.toggle('active',x===button));
  });

  function reset(){state.searchMode='travel';state.searchRegion=null;state.localRadiusKm=2;state.placeResults=[];syncModeUI()}
  syncModeUI();
  return {setMode,searchLocalPlaces,reset,syncModeUI};
}
