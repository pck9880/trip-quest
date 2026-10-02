import { $, all } from '../core/dom.js';

export function bindAppActions({state,setStep,sortRecommendations,useLocation,searchOrigin,updateSchedulePreview,resetTrip,recommend,searchSimilarDistance,primarySearch,openCategorySelect}){
  const mainLocate=$('#mainLocateBtn');if(mainLocate)mainLocate.onclick=()=>openCategorySelect?.('gps');
  const mainManual=$('#mainManualBtn');if(mainManual)mainManual.onclick=()=>openCategorySelect?.('manual');
  const resultSort=$('#resultSort');if(resultSort)resultSort.onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;sortRecommendations(b.dataset.sort,true)};
  $('#locateBtn')?.addEventListener('click',()=>useLocation(false));
  $('#searchOriginBtn')?.addEventListener('click',searchOrigin);
  $('#originSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchOrigin()});
  $('#departTime')?.addEventListener('change',updateSchedulePreview);
  $('#returnTime')?.addEventListener('change',updateSchedulePreview);
  $('#resetBtn')?.addEventListener('click',resetTrip);
  $('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn')?.addEventListener('click',()=>setStep(Math.max(1,state.step-1)));
  $('#nextBtn')?.addEventListener('click',async()=>{if(state.step===4&&state.selected)setStep(5);else if(state.step===5)resetTrip()});
  $('#editConditionsBtn')?.addEventListener('click',()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),160)});
  $('#changePlaceBtn')?.addEventListener('click',()=>setStep(4));
  $('#noMatchActions')?.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='similar')searchSimilarDistance();else{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),160)}});
  $('#aiSend')?.addEventListener('click',()=>primarySearch());
  $('#aiInput')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')primarySearch()});
}
