import { $, all } from '../core/dom.js';

export function bindAppActions({state,hideMainLanding,setStep,sortRecommendations,resetTrip,recommend}){
  const mainStart=$('#mainLocateBtn');if(mainStart)mainStart.onclick=()=>{hideMainLanding();setStep(1)};
  const mainManual=$('#mainManualBtn');if(mainManual)mainManual.onclick=()=>{hideMainLanding();setStep(1)};
  const resultSort=$('#resultSort');if(resultSort)resultSort.onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;sortRecommendations(b.dataset.sort,true)};
  $('#resetBtn').onclick=resetTrip;$('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn').onclick=()=>setStep(state.step-1);
  $('#nextBtn').onclick=async()=>{
    if(state.step===1)setStep(2);
    else if(state.step===2)await recommend();
    else if(state.step===3){if(state.selected)setStep(4)}
    else resetTrip();
  };
  all('.progress-step').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(n<=state.step)setStep(n)});
  $('#editConditionsBtn').onclick=()=>setStep(1);
  $('#changePlaceBtn').onclick=()=>setStep(3);
  $('#noMatchActions').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='refine')setStep(1)};
}
