import { $, all, setText } from '../core/dom.js';
import { stepMeta } from '../data/ui-options.js';

export function createWizardUI(state){
  function setStep(n){
    n=Math.max(1,Math.min(4,n));state.step=n;document.body.dataset.tripStep=String(n);
    all('.step-view').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepView)===n));
    all('.progress-step').forEach(x=>{const s=Number(x.dataset.step);x.classList.toggle('active',s===n);x.classList.toggle('done',s<n)});
    const m=stepMeta[n];setText('#stepEyebrow',m[0]);setText('#stepTitle',m[1]);setText('#stepDescription',m[2]);
    $('#backBtn').disabled=n===1;
    let label='다음 →',disabled=false,hint='';
    if(n===1){label='플레이스 선택으로 →';disabled=!state.regionBoundary;hint=(state.regionPath||[]).length?(state.regionPath||[]).join(' › '):'시·도를 먼저 선택하세요.'}
    if(n===2){label='이 선택으로 장소 보기 →';disabled=!state.categories.length;hint=state.categories.length?state.categories.join(' · '):'플레이스를 한 개 이상 선택하세요.'}
    if(n===3){label=state.selected?'선택 장소 주변 보기 →':'플레이스에서 하나를 선택하세요';disabled=!state.selected;hint=state.selected?state.selected.name+' 선택됨':'각 카드의 “이 여행지 선택” 버튼을 누르세요.'}
    if(n===4){label='코스 완료';disabled=true;hint=state.selectedCourseData?'최적 코스 계산 완료':'주변 추천에서 원하는 장소를 선택하세요.'}
    $('#nextBtn').textContent=label;$('#nextBtn').disabled=disabled;$('#nextBtn').hidden=n===4;setText('#actionHint',hint);
    $('.wizard')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function syncDistanceUI(){}
  function setDistanceBoundary(){}
  function syncCategoriesUI(){all('#placeChoices button').forEach(b=>b.classList.toggle('selected',(state.categories||[]).includes(b.dataset.value)))}
  function syncFacilitiesUI(){}
  function syncDirectionUI(){}
  function validateUIRuntime(){
    const required=[['regionLevel1','#regionLevel1'],['placeChoices','#placeChoices'],['ranking','#ranking'],['resultSort','#resultSort']];
    const missing=required.filter(([,sel])=>!$(sel)).map(([name])=>name);
    if(missing.length)throw new Error('UI 구성요소 누락: '+missing.join(', '));
    return true;
  }
  function bindChoices(){}
  return {setStep,syncDistanceUI,setDistanceBoundary,syncCategoriesUI,syncFacilitiesUI,syncDirectionUI,validateUIRuntime,bindChoices};
}
