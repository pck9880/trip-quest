import { $, all, setText } from '../core/dom.js';
import { stepMeta } from '../data/ui-options.js';
import { invalidateMainMap } from './main-map.js';

export function createWizardUI(state){
  function setStep(n){
    n=Math.max(1,Math.min(5,n));state.step=n;document.body.dataset.tripStep=String(n);
    all('.step-view').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepView)===n));
    all('.progress-step').forEach(x=>{const s=Number(x.dataset.step);x.classList.toggle('active',s===n);x.classList.toggle('done',s<n)});
    const m=stepMeta[n];setText('#stepEyebrow',m[0]);setText('#stepTitle',m[1]);setText('#stepDescription',m[2]);
    $('#backBtn').disabled=n===1;
    let label='다음 →',disabled=false,hint='';
    if(n===1){label='플레이스 선택으로 →';disabled=!state.regionBoundary;hint=(state.regionPath||[]).length?(state.regionPath||[]).join(' › '):'시·도를 먼저 선택하세요.'}
    if(n===2){label='부가조건 선택으로 →';disabled=!state.categories.length;hint=state.categories.length?state.categories.join(' · '):'플레이스를 한 개 이상 선택하세요.'}
    if(n===3){label='이 조건으로 장소 보기 →';hint=(state.facilities||[]).length?`부가조건 ${state.facilities.length}개 적용`:'부가조건 없이 전체 검색'}
    if(n===4){label=state.selected?'선택 장소 코스 보기 →':'플레이스에서 하나를 선택하세요';disabled=!state.selected;hint=state.selected?`${state.selected.name} 선택됨`:'각 카드의 “이 여행지 선택” 버튼을 누르세요.'}
    if(n===5){label='새 TRIP QUEST';hint=state.selectedCourse?`${state.selectedCourse}코스를 선택했습니다.`:'주변 코스를 선택할 수 있습니다.'}
    $('#nextBtn').textContent=label;$('#nextBtn').disabled=disabled;setText('#actionHint',hint);
    $('.wizard')?.scrollIntoView({behavior:'smooth',block:'start'});
    if(n===4)setTimeout(invalidateMainMap,120);
  }
  function syncDistanceUI(){}
  function setDistanceBoundary(){}
  function syncCategoriesUI(){
    all('#placeChoices button').forEach(b=>b.classList.toggle('selected',(state.categories||[]).includes(b.dataset.value)));
  }
  function syncFacilitiesUI(){
    all('#facilityChoices button').forEach(b=>b.classList.toggle('selected',(state.facilities||[]).includes(b.dataset.value)));
  }
  function syncDirectionUI(){}
  function validateUIRuntime(){
    const required=[['regionLevel1','#regionLevel1'],['placeChoices','#placeChoices'],['facilityChoices','#facilityChoices'],['ranking','#ranking'],['resultSort','#resultSort']];
    const missing=required.filter(([,sel])=>!$(sel)).map(([name])=>name);
    if(missing.length)throw new Error('UI 구성요소 누락: '+missing.join(', '));return true;
  }
  function bindChoices(){}
  return {setStep,syncDistanceUI,setDistanceBoundary,syncCategoriesUI,syncFacilitiesUI,syncDirectionUI,validateUIRuntime,bindChoices};
}
