import { $, esc, toast } from '../core/dom.js';

function distanceLabel(km){
  const n=Number(km);
  if(!Number.isFinite(n))return '';
  return n<1?Math.round(n*1000)+'m':Math.round(n)+'km';
}

export function initSearchFlow({state,travelService,setOrigin,hideMainLanding,showMainLanding}){
  const placeInput=$('#searchRegionInput');
  const placeResults=$('#searchRegionResults');
  const distanceMin=$('#distanceMinRange');
  const distanceMax=$('#distanceMaxRange');
  const distanceFill=$('#distanceRangeFill');
  let lastSnap={min:null,max:null};

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function syncPlaceLabel(){
    const label=$('#searchRegionLabel');
    if(!label)return;
    const place=state.searchRegion||state.origin;
    if(!place){label.textContent='내 위치 또는 원하는 장소를 선택하세요.';return}
    const type=place.placeTypeLabel&&place.placeTypeLabel!=='현재 위치'?' · '+place.placeTypeLabel:'';
    label.textContent=(place.name||place.address||'선택한 장소')+type;
  }

  function pulseSnap(input,key,value){
    if(!input||lastSnap[key]===value)return;
    lastSnap[key]=value;
    input.classList.remove('is-snapping');
    void input.offsetWidth;
    input.classList.add('is-snapping');
    setTimeout(()=>input.classList.remove('is-snapping'),150);
    try{navigator.vibrate?.(8)}catch{}
  }

  function syncDistanceUI(){
    if(!distanceMin||!distanceMax)return;
    let min=Math.max(0,Math.min(400,Math.round(Number(state.minKm||0)/50)*50));
    let max=Math.max(50,Math.min(450,Math.round(Number(state.targetKm||100)/50)*50));
    if(max<=min)max=Math.min(450,min+50);
    if(max<=min)min=Math.max(0,max-50);
    state.minKm=min;state.targetKm=max;
    for(const input of [distanceMin,distanceMax]){
      input.min='0';input.max='450';input.step='50';
    }
    distanceMin.value=String(min);distanceMax.value=String(max);
    const minValue=$('#distanceMinValue'),maxValue=$('#distanceMaxValue');
    if(minValue)minValue.textContent=String(min);
    if(maxValue)maxValue.textContent=String(max);
    if(distanceFill){
      distanceFill.style.left=(min/450*100)+'%';
      distanceFill.style.right=(100-max/450*100)+'%';
    }
    const hint=$('#distanceHint'),ruler=$('#distanceRuler'),labels=$('#distanceLabels'),help=$('#distanceHelp');
    if(hint)hint.textContent='50km 스냅 · '+distanceLabel(min)+' ~ '+distanceLabel(max);
    if(ruler)ruler.innerHTML=Array.from({length:10},(_,i)=>'<i class="'+(i%2===0||i===9?'major':'')+'"></i>').join('');
    if(labels)labels.innerHTML='<span>0</span><span>100</span><span>200</span><span>300</span><span>400</span><span>450km</span>';
    if(help)help.textContent='양쪽 핸들을 드래그하면 50km마다 자석처럼 맞춰집니다.';
  }

  function setRangeBoundary(which,rawValue){
    const value=clamp(Math.round(Number(rawValue)/50)*50,0,450);
    let min=Number(state.minKm)||0,max=Number(state.targetKm)||100;
    if(which==='min')min=Math.min(value,max-50);
    else max=Math.max(value,min+50);
    min=clamp(min,0,400);max=clamp(max,min+50,450);
    state.minKm=min;state.targetKm=max;state.activeDistanceBand=null;
    syncDistanceUI();
    pulseSnap(which==='min'?distanceMin:distanceMax,which,which==='min'?min:max);
  }

  async function setCurrentPlace(){
    if(!navigator.geolocation){toast('현재 위치 기능을 사용할 수 없습니다. 장소를 직접 검색해주세요.');return null}
    const button=$('#searchUseCurrentBtn');
    if(button){button.disabled=true;button.textContent='위치 확인 중…'}
    return new Promise(resolve=>{
      navigator.geolocation.getCurrentPosition(async pos=>{
        const lat=pos.coords.latitude,lng=pos.coords.longitude;
        let resolved=null;
        try{resolved=await travelService.reverseGeocode(lat,lng)}catch{}
        const current=resolved||{id:'gps-current',provider:'gps',name:'현재 위치',address:'현재 위치',lat,lng,placeType:'current_location',placeTypeLabel:'현재 위치'};
        state.searchRegion=current;
        await setOrigin({...current,name:current.name||'현재 위치'});
        syncPlaceLabel();
        if(button){button.disabled=false;button.textContent='내 위치'}
        toast(resolved?(resolved.name+'을(를) 현재 위치로 설정했습니다.'):'현재 위치를 설정했습니다.');
        resolve(current);
      },()=>{
        if(button){button.disabled=false;button.textContent='내 위치'}
        toast('위치 권한을 허용하거나 장소를 직접 검색해주세요.');
        resolve(null);
      },{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
    });
  }

  async function resolvePlace(){
    const query=placeInput?.value.trim()||'';
    if(!query)return;
    if(placeResults){placeResults.hidden=false;placeResults.innerHTML='<div class="tq-region-empty">장소를 찾고 있습니다…</div>'}
    try{
      const result=await travelService.resolvePlace(query);
      const items=result.items||[];
      if(!items.length){
        placeResults.innerHTML='<div class="tq-region-empty">장소를 찾지 못했습니다. 공원·상권·백화점·아울렛·놀이공원·역·시장처럼 장소명을 조금 더 구체적으로 입력해주세요.</div>';
        return;
      }
      placeResults.innerHTML=items.map((item,index)=>
        '<button type="button" data-place-index="'+index+'"><span><strong>'+esc(item.name)+'</strong><small>'+
        esc((item.placeTypeLabel?item.placeTypeLabel+' · ':'')+(item.address||''))+
        '</small></span><b>선택</b></button>'
      ).join('');
      placeResults.onclick=async e=>{
        const button=e.target.closest('[data-place-index]');if(!button)return;
        const item=items[Number(button.dataset.placeIndex)];
        state.searchRegion=item;
        await setOrigin({...item,name:item.name});
        if(placeInput)placeInput.value='';
        placeResults.hidden=true;placeResults.innerHTML='';
        syncPlaceLabel();
        toast(item.name+'을(를) 여행 기준 장소로 설정했습니다.');
        $('#aiInput')?.focus();
      };
    }catch(error){
      if(placeResults)placeResults.innerHTML='<div class="tq-region-empty error">'+esc(error.message||'장소 검색에 실패했습니다.')+'</div>';
    }
  }

  async function start(launch='manual'){
    state.searchMode='travel';
    hideMainLanding?.();
    document.body.classList.add('tq-search-ready');
    if(launch==='gps')await setCurrentPlace();
    setTimeout(()=>{
      if(launch==='manual')placeInput?.focus();
      else $('#aiInput')?.focus({preventScroll:true});
      document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});
    },100);
  }

  $('#searchRegionBtn')?.addEventListener('click',resolvePlace);
  placeInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();resolvePlace()}});
  $('#searchUseCurrentBtn')?.addEventListener('click',setCurrentPlace);
  distanceMin?.addEventListener('input',e=>setRangeBoundary('min',e.target.value));
  distanceMax?.addEventListener('input',e=>setRangeBoundary('max',e.target.value));

  function reset(){
    state.searchMode='travel';state.searchRegion=null;state.minKm=0;state.targetKm=100;
    document.body.classList.remove('tq-search-ready','tq-category-open','tq-local-search-mode');
    if(placeResults){placeResults.hidden=true;placeResults.innerHTML=''}
    syncPlaceLabel();syncDistanceUI();
  }

  syncPlaceLabel();syncDistanceUI();
  return {start,reset,syncPlaceLabel,syncDistanceUI,setCurrentPlace,resolvePlace,showMainLanding};
}
