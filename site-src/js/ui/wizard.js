import { $, all, setText } from '../core/dom.js';
import { stepMeta } from '../data/ui-options.js';
import { normalizedDistanceRange } from '../domain/recommendation.js';
import { invalidateMainMap } from './main-map.js';

export function createWizardUI(state){
  let lastDistanceHaptic={min:state.minKm,max:state.targetKm};
  function setStep(n){
    n=Math.max(1,Math.min(5,n));state.step=n;document.body.dataset.tripStep=String(n);if(n!==2){document.body.classList.remove('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.remove('open');bar.setAttribute('aria-expanded','false')}}all('.step-view').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepView)===n));
    all('.progress-step').forEach(x=>{const s=Number(x.dataset.step);x.classList.toggle('active',s===n);x.classList.toggle('done',s<n)});
    const m=stepMeta[n];setText('#stepEyebrow',m[0]);setText('#stepTitle',m[1]);setText('#stepDescription',m[2]);
    $('#backBtn').disabled=n===1;let label='다음 →',disabled=false,hint='';
    if(n===1){label='다음 단계 →';disabled=false;hint=state.origin?'출발지 설정 완료':'현재 위치 또는 출발지를 설정하세요.'}
    if(n===2){label='AI로 추천받기 →';disabled=state.categories.length===0;hint=`${state.minKm}~${state.targetKm}km · ${state.direction==='전체'?'방향 상관없음':state.direction} · 취향 ${state.categories.length}개`}
    if(n===3){label='추천지 찾기 →';hint='날씨·교통·거리 조건을 함께 계산합니다.'}
    if(n===4){label=state.selected?'선택 여행지 코스 보기 →':'추천지에서 하나를 선택하세요';disabled=!state.selected;hint=state.selected?`${state.selected.name} 선택됨`:'각 카드의 “이 여행지 선택” 버튼을 누르세요.'}
    if(n===5){label='새 여행 시작';hint=state.selectedCourse?`${state.selectedCourse}코스를 선택했습니다.`:'A 도보 근거리 / B 드라이브 중 선택할 수 있습니다.'}
    $('#nextBtn').textContent=label;$('#nextBtn').disabled=disabled;setText('#actionHint',hint);const simpleSearch=n===2&&!document.body.classList.contains('tq-advanced-open');const target=simpleSearch?$('.ai-hero'):$('.wizard');if(target)window.scrollTo({top:Math.max(0,target.offsetTop-18),behavior:'smooth'});if(n===4)setTimeout(invalidateMainMap,120)
  }
  
  function syncDistanceUI(){
    if(state.searchMode!=='travel')return;
    const raw=normalizedDistanceRange({minKm:state.minKm,targetKm:state.targetKm});
    let min=Math.max(0,Math.min(350,Math.round(raw.min/50)*50));
    let max=Math.max(50,Math.min(450,Math.round(raw.max/50)*50));
    if(max<=min)max=Math.min(450,min+50);
    if(max<=min){min=Math.max(0,max-50)}
    state.minKm=min;state.targetKm=max;
    setText('#distanceMinValue',min);setText('#distanceMaxValue',max);
    setText('#distanceHint','50km 스냅 · '+min+'~'+max+'km');
    const minRange=$('#distanceMinRange'),maxRange=$('#distanceMaxRange'),fill=$('#distanceRangeFill');
    if(minRange){minRange.min='0';minRange.max='450';minRange.step='50';minRange.value=String(min)}
    if(maxRange){maxRange.min='0';maxRange.max='450';maxRange.step='50';maxRange.value=String(max)}
    if(fill){fill.style.left=(min/450*100)+'%';fill.style.right=(100-max/450*100)+'%'}
  }
  
  function setDistanceBoundary(which,value,haptic=true){
    const v=Math.max(0,Math.min(450,Math.round(Number(value)/50)*50));
    if(which==='min')state.minKm=Math.min(v,state.targetKm-50);
    else state.targetKm=Math.max(v,state.minKm+50);
    syncDistanceUI();state.activeDistanceBand=null;
    const current=which==='min'?state.minKm:state.targetKm;
    if(haptic&&current!==lastDistanceHaptic[which]){
      lastDistanceHaptic={min:state.minKm,max:state.targetKm};
      try{navigator.vibrate?.(8)}catch{}
    }
  }
  
  function syncCategoriesUI(){
    all('#categoryChoices button').forEach(b=>b.classList.toggle('selected',state.categories.includes(b.dataset.value)));
    setText('#categoryCount',`${state.categories.length}개 선택`);
  }
  
  function syncDirectionUI(){
    all('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value===state.direction));
    setText('#directionValue',state.direction==='전체'?'상관없음':state.direction);
  }
  
  function validateUIRuntime(){
    const required=[
      ['categoryChoices','#categoryChoices'],
      ['directionChoices','#directionChoices'],
      ['ranking','#ranking'],
      ['resultSort','#resultSort']
    ];
    const missing=required.filter(([,sel])=>!$(sel)).map(([name])=>name);
    if(missing.length)throw new Error('UI 구성요소 누락: '+missing.join(', '));
    if(typeof all!=='function')throw new Error('다중 요소 선택 기능을 초기화하지 못했습니다.');
    return true;
  }
  
  function bindChoices(){
    $('#directionChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.direction=b.dataset.value;syncDirectionUI()});
    $('#categoryChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;b.classList.toggle('selected');state.categories=all('#categoryChoices button.selected').map(x=>x.dataset.value);syncCategoriesUI();setStep(2)});
    const duration=$('#boardDurationChoices');if(duration)duration.addEventListener('click',e=>{const b=e.target.closest('button[data-hours]');if(!b)return;duration.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));document.body.dataset.tripDuration=b.dataset.hours;});
  }
  return {setStep,syncDistanceUI,setDistanceBoundary,syncCategoriesUI,syncDirectionUI,validateUIRuntime,bindChoices};
}
