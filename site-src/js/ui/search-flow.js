import { $, esc, toast } from '../core/dom.js';
import { SEARCH_MODE_CONFIGS, MOOD_OPTIONS } from '../services/place-search-service.js';

function distanceLabel(km){
  const n=Number(km);
  if(!Number.isFinite(n))return '';
  if(n<1)return Math.round(n*1000)+'m';
  return n.toFixed(n<10?1:0)+'km';
}

function resultCard(item,index){
  const reviewReady=Number.isFinite(item.reviewCount)&&item.reviewCount>0;
  const scoreLabel=reviewReady?'인기 적합도':'검색 적합도';
  const reviewMeta=reviewReady?'<span>★ '+Number(item.rating||0).toFixed(1)+' · 리뷰 '+Number(item.reviewCount).toLocaleString()+'</span>':'';
  const moods=(item.moodMatches||[]).map(m=>'<span>'+esc(m)+'</span>').join('');
  const distance=Number.isFinite(item.distanceKm)?'<span>약 '+distanceLabel(item.distanceKm)+'</span>':'';
  return '<article class="tq-place-result-card"><div class="tq-place-rank">'+String(index+1).padStart(2,'0')+'</div><div><h3>'+esc(item.name)+'</h3><p>'+esc(item.address||'주소 정보 없음')+'</p><div><span>'+scoreLabel+' '+Math.round(Number(item.popularityScore)||0)+'</span>'+distance+reviewMeta+moods+'</div></div><button type="button" data-place-index="'+index+'">지도</button></article>';
}

export function initSearchFlow({state,travelService,setOrigin,hideMainLanding,showMainLanding}){
  const categoryScreen=$('#categorySelect');
  const categoryButtons=[...document.querySelectorAll('#categorySelect [data-search-mode]')];
  const regionPanel=$('#searchRegionPanel');
  const regionInput=$('#searchRegionInput');
  const regionResults=$('#searchRegionResults');
  const placeResults=$('#placeSearchResults');
  const moodPanel=$('#moodKeywordPanel');
  const moodChoices=$('#moodKeywordChoices');
  const distanceRange=$('#searchDistanceRange');
  let pendingLaunch='manual';

  const config=()=>SEARCH_MODE_CONFIGS[state.searchMode]||SEARCH_MODE_CONFIGS.travel;
  const isLocal=()=>state.searchMode==='cafe'||state.searchMode==='food';

  function syncRegionLabel(){
    const label=$('#searchRegionLabel');
    if(!label)return;
    const region=state.searchRegion||state.origin;
    label.textContent=region?(region.address||region.name):'내 위치 또는 지역을 선택하세요.';
  }

  function syncMoodUI(){
    if(!moodPanel||!moodChoices)return;
    const local=isLocal();
    moodPanel.hidden=!local;
    if(!local){moodChoices.innerHTML='';return}
    const options=MOOD_OPTIONS[state.searchMode]||[];
    moodChoices.innerHTML=options.map(value=>'<button type="button" data-mood="'+esc(value)+'" class="'+(state.moodKeywords.includes(value)?'active':'')+'">'+esc(value)+'</button>').join('');
    const count=$('#moodKeywordCount');
    if(count)count.textContent=state.moodKeywords.length+' / 2';
  }

  function syncDistanceUI(){
    if(!distanceRange)return;
    const distance=config().distance;
    distanceRange.min=String(distance.min);
    distanceRange.max=String(distance.max);
    distanceRange.step=String(distance.step);
    const raw=state.searchMode==='travel'?Number(state.targetKm||distance.default):Number(state.localRadiusKm||distance.default);
    const value=Math.max(distance.min,Math.min(distance.max,raw));
    distanceRange.value=String(value);
    const valueEl=$('#searchDistanceValue');
    if(valueEl)valueEl.textContent=distanceLabel(value);
    const hint=$('#searchDistanceHint');
    if(hint)hint.textContent=state.searchMode==='travel'?'출발지 기준 최대 '+distanceLabel(value):'선택 지역 기준 '+distanceLabel(value)+' 이내';
    const scale=$('#searchDistanceScale');
    if(scale)scale.innerHTML=state.searchMode==='travel'
      ?'<span>10km</span><span>100</span><span>200</span><span>400km</span>'
      :'<span>500m</span><span>5km</span><span>10km</span><span>20km</span>';
  }

  function syncModeUI(){
    const cfg=config(),local=isLocal();
    document.body.classList.toggle('tq-local-search-mode',local);
    document.body.dataset.searchMode=cfg.id;
    if(regionPanel)regionPanel.hidden=false;
    const input=$('#aiInput');if(input)input.placeholder=cfg.placeholder;
    const send=$('#aiSend');if(send)send.textContent=cfg.button;
    const active=$('#activeSearchMode');if(active)active.textContent=cfg.code;
    const eyebrow=document.querySelector('.tq-search-head .eyebrow');
    const title=$('#aiTitle');
    const desc=document.querySelector('.tq-search-head p');
    if(cfg.id==='travel'){
      if(eyebrow)eyebrow.textContent='TRIP SEARCH';
      if(title)title.textContent='어디로 떠나고 싶나요?';
      if(desc)desc.textContent='거리와 장소 키워드를 바탕으로 여행지를 찾고, 선택 후 코스를 추천합니다.';
    }else if(cfg.id==='cafe'){
      if(eyebrow)eyebrow.textContent='CAFE SEARCH';
      if(title)title.textContent='어떤 카페를 찾고 있나요?';
      if(desc)desc.textContent='장소 키워드와 무드 최대 2개를 조합해 거리 안에서 적합한 카페를 찾습니다.';
    }else{
      if(eyebrow)eyebrow.textContent='FOOD SEARCH';
      if(title)title.textContent='무엇을 먹고 싶나요?';
      if(desc)desc.textContent='음식·장소 키워드와 무드 최대 2개를 조합해 거리 안에서 맛집을 찾습니다.';
    }
    if(local){
      const conversation=$('#aiConversation');if(conversation)conversation.hidden=true;
      const progress=$('#aiProgress');if(progress)progress.hidden=true;
      const status=$('#aiSearchStatus');if(status)status.hidden=true;
    }else if(placeResults){
      placeResults.hidden=true;
      placeResults.innerHTML='';
    }
    syncRegionLabel();
    syncMoodUI();
    syncDistanceUI();
  }

  function closeCategory(){
    if(categoryScreen)categoryScreen.hidden=true;
    document.body.classList.remove('tq-category-open');
    document.body.classList.add('tq-search-ready');
  }

  function openCategory(launch='manual'){
    pendingLaunch=launch;
    if(launch!=='keep'){
      document.body.classList.remove('tq-search-ready');
      hideMainLanding?.();
    }
    if(categoryScreen)categoryScreen.hidden=false;
    document.body.classList.add('tq-category-open');
    categoryButtons.forEach(button=>button.classList.toggle('active',button.dataset.searchMode===state.searchMode));
    setTimeout(()=>categoryScreen?.querySelector('[data-search-mode]')?.focus({preventScroll:true}),60);
  }

  function setMode(next,{resetFilters=true}={}){
    state.searchMode=SEARCH_MODE_CONFIGS[next]?next:'travel';
    state.placeResults=[];
    if(resetFilters){state.moodKeywords=[];const input=$('#aiInput');if(input)input.value=''}
    if(state.searchMode==='travel'){
      state.minKm=0;
      if(!Number.isFinite(Number(state.targetKm))||Number(state.targetKm)<10)state.targetKm=100;
    }else if(!Number.isFinite(Number(state.localRadiusKm))||Number(state.localRadiusKm)<.5){
      state.localRadiusKm=2;
    }
    if(placeResults){placeResults.hidden=true;placeResults.innerHTML=''}
    syncModeUI();
  }

  async function useCurrentRegion(){
    if(!navigator.geolocation){toast('현재 위치 기능을 사용할 수 없습니다. 지역을 직접 입력해주세요.');return null}
    const button=$('#searchUseCurrentBtn');
    if(button){button.disabled=true;button.textContent='위치 확인 중…'}
    return new Promise(resolve=>{
      navigator.geolocation.getCurrentPosition(async pos=>{
        const current={id:'gps-current',name:'현재 위치',address:'GPS 현재 위치',lat:pos.coords.latitude,lng:pos.coords.longitude,provider:'gps'};
        state.searchRegion=current;
        if(state.searchMode==='travel'&&setOrigin)await setOrigin({...current,name:'현재 위치'});
        syncRegionLabel();
        if(button){button.disabled=false;button.textContent='내 위치'}
        toast('현재 위치를 검색 기준으로 설정했습니다.');
        resolve(current);
      },()=>{
        if(button){button.disabled=false;button.textContent='내 위치'}
        toast('위치 권한을 허용하거나 지역을 직접 입력해주세요.');
        resolve(null);
      },{enableHighAccuracy:true,timeout:9000,maximumAge:30000});
    });
  }

  async function chooseMode(next){
    setMode(next,{resetFilters:true});
    closeCategory();
    const launch=pendingLaunch;
    pendingLaunch='keep';
    if(launch==='gps')await useCurrentRegion();
    setTimeout(()=>{
      if(launch==='manual')regionInput?.focus();
      else $('#aiInput')?.focus({preventScroll:true});
      document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});
    },120);
  }

  async function resolveRegion(){
    const query=regionInput?.value.trim()||'';
    if(!query)return;
    if(regionResults){regionResults.hidden=false;regionResults.innerHTML='<div class="tq-region-empty">지역을 찾고 있습니다…</div>'}
    try{
      const result=await travelService.searchRegion(query);
      const items=result.items||[];
      if(!items.length){regionResults.innerHTML='<div class="tq-region-empty">지역을 찾지 못했습니다. 시·군·구·동 이름을 조금 더 정확히 입력해주세요.</div>';return}
      regionResults.innerHTML=items.map((item,index)=>'<button type="button" data-region-index="'+index+'"><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.address)+'</small></span><b>선택</b></button>').join('');
      regionResults.onclick=async e=>{
        const button=e.target.closest('[data-region-index]');if(!button)return;
        const item=items[Number(button.dataset.regionIndex)];
        state.searchRegion=item;
        if(state.searchMode==='travel'&&setOrigin)await setOrigin({...item,name:item.name});
        if(regionInput)regionInput.value='';
        regionResults.hidden=true;regionResults.innerHTML='';
        syncRegionLabel();
        toast(item.name+'을(를) 검색 지역으로 설정했습니다.');
        $('#aiInput')?.focus();
      };
    }catch(error){
      if(regionResults)regionResults.innerHTML='<div class="tq-region-empty error">'+esc(error.message||'지역 검색에 실패했습니다.')+'</div>';
    }
  }

  function renderPlaces(result){
    const cfg=config(),items=result.items||[];
    state.placeResults=items;
    placeResults.hidden=false;
    if(!items.length){
      placeResults.innerHTML='<section class="tq-place-empty"><small>'+esc(cfg.code)+' SEARCH</small><strong>현재 조건에서 검색 결과가 부족합니다.</strong><p>거리나 장소 키워드, 무드 선택을 바꿔보세요.</p><span>'+esc(result.source||'검색 데이터')+'</span></section>';
      return;
    }
    placeResults.innerHTML='<div class="tq-place-results-head"><div><small>'+esc(cfg.code)+' · POPULAR FIT</small><strong>'+items.length+'곳</strong></div><span>'+esc(result.rankingBasis||result.source||'검색 데이터')+'</span></div><div class="tq-place-results-list">'+items.map(resultCard).join('')+'</div>';
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
    if(placeResults){placeResults.hidden=false;placeResults.innerHTML='<div class="tq-place-loading">거리 · 키워드 · 무드를 분석해 장소를 찾고 있습니다…</div>'}
    try{
      const result=await travelService.searchPlaces({mode:state.searchMode,query,region:center,radiusKm:state.localRadiusKm,moods:state.moodKeywords});
      renderPlaces(result);
    }catch(error){
      placeResults.hidden=false;
      placeResults.innerHTML='<section class="tq-place-empty error"><strong>장소 검색에 실패했습니다.</strong><p>'+esc(error.message||'잠시 후 다시 시도해주세요.')+'</p></section>';
    }finally{
      if(send){send.disabled=false;send.textContent=config().button}
    }
    return true;
  }

  categoryButtons.forEach(button=>button.addEventListener('click',()=>chooseMode(button.dataset.searchMode)));
  $('#categoryBackBtn')?.addEventListener('click',()=>{
    if(categoryScreen)categoryScreen.hidden=true;
    document.body.classList.remove('tq-category-open');
    if(pendingLaunch==='keep')document.body.classList.add('tq-search-ready');
    else{document.body.classList.remove('tq-search-ready');showMainLanding?.()}
  });
  $('#changeSearchMode')?.addEventListener('click',()=>openCategory('keep'));
  $('#searchRegionBtn')?.addEventListener('click',resolveRegion);
  regionInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolveRegion()}});
  $('#searchUseCurrentBtn')?.addEventListener('click',useCurrentRegion);
  moodChoices?.addEventListener('click',e=>{
    const button=e.target.closest('[data-mood]');if(!button)return;
    const value=button.dataset.mood;
    if(state.moodKeywords.includes(value))state.moodKeywords=state.moodKeywords.filter(x=>x!==value);
    else if(state.moodKeywords.length>=2){toast('무드는 최대 2개까지 선택할 수 있습니다.');return}
    else state.moodKeywords=[...state.moodKeywords,value];
    syncMoodUI();
  });
  distanceRange?.addEventListener('input',e=>{
    const value=Number(e.target.value);
    if(state.searchMode==='travel'){state.minKm=0;state.targetKm=value;state.activeDistanceBand=null}
    else state.localRadiusKm=value;
    syncDistanceUI();
    try{navigator.vibrate?.(5)}catch{}
  });
  window.addEventListener('tripquest:linked-place-search',e=>{
    const detail=e.detail||{};
    const next=detail.mode==='food'?'food':'cafe';
    const anchor=detail.anchor;
    if(anchor&&Number.isFinite(Number(anchor.lat))&&Number.isFinite(Number(anchor.lng))){
      state.searchRegion={id:'course-'+next+'-'+(anchor.id||anchor.name||'anchor'),name:anchor.name||'코스 마지막 지점',address:anchor.address||anchor.name||'코스 마지막 지점',lat:Number(anchor.lat),lng:Number(anchor.lng),provider:'course'};
    }
    setMode(next,{resetFilters:true});
    document.body.classList.add('tq-search-ready');
    document.body.classList.remove('tq-category-open');
    if(categoryScreen)categoryScreen.hidden=true;
    syncRegionLabel();
    toast(next==='cafe'?'선택 코스를 기준으로 CAFE 검색으로 연결했습니다.':'선택 코스를 기준으로 FOOD 검색으로 연결했습니다.');
    setTimeout(()=>document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  });

  function reset(){
    state.searchMode='travel';state.searchRegion=null;state.localRadiusKm=2;state.moodKeywords=[];state.placeResults=[];pendingLaunch='manual';
    document.body.classList.remove('tq-search-ready','tq-category-open','tq-local-search-mode');
    if(categoryScreen)categoryScreen.hidden=true;
    syncModeUI();
  }

  syncModeUI();
  return {setMode,searchLocalPlaces,reset,syncModeUI,openCategory,useCurrentRegion};
}
