import { $, all } from '../core/dom.js';

export function bindAppActions({state,setStep,sortRecommendations,useLocation,searchOrigin,updateSchedulePreview,resetTrip,recommend,searchSimilarDistance,primarySearch,startTripSearch}){
  const mainLocate=$('#mainLocateBtn');if(mainLocate)mainLocate.onclick=()=>startTripSearch?.('gps');
  const mainManual=$('#mainManualBtn');if(mainManual)mainManual.onclick=()=>startTripSearch?.('manual');
  const resultSort=$('#resultSort');if(resultSort)resultSort.onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;sortRecommendations(b.dataset.sort,true)};
  $('#locateBtn')?.addEventListener('click',()=>useLocation(false));
  $('#searchOriginBtn')?.addEventListener('click',searchOrigin);
  $('#originSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchOrigin()});
  $('#departTime')?.addEventListener('change',updateSchedulePreview);
  $('#returnTime')?.addEventListener('change',updateSchedulePreview);
  $('#boardDurationChoices')?.addEventListener('click',e=>{
    const b=e.target.closest('button[data-hours]');if(!b)return;
    document.querySelectorAll('#boardDurationChoices button').forEach(x=>x.classList.toggle('selected',x===b));
    const depart=$('#departTime'),ret=$('#returnTime');if(!depart||!ret)return;
    const start=depart.value?new Date(depart.value):new Date();
    const end=new Date(start.getTime()+Number(b.dataset.hours||10)*3600000);
    const pad=n=>String(n).padStart(2,'0');
    ret.value=`${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    updateSchedulePreview();
  });
  $('#resetBtn')?.addEventListener('click',resetTrip);
  $('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn')?.addEventListener('click',()=>setStep(Math.max(1,state.step-1)));
  $('#nextBtn')?.addEventListener('click',async()=>{
    if(state.step===1){if(!state.origin){document.querySelector('#originSearch')?.focus();return}setStep(2)}
    else if(state.step===2){await recommend()}
    else if(state.step===3){await recommend()}
    else if(state.step===4&&state.selected)setStep(5);
    else if(state.step===5)resetTrip();
  });
  $('#editConditionsBtn')?.addEventListener('click',()=>{document.body.classList.add('tq-search-ready');setStep(1);document.querySelector('#tripExplorer')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),160)});
  $('#changePlaceBtn')?.addEventListener('click',()=>{document.body.classList.add('tq-search-ready');setStep(1);document.querySelector('#tripExplorer')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),160)});
  $('#noMatchActions')?.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='similar')searchSimilarDistance();else{document.body.classList.add('tq-search-ready');document.querySelector('#tripExplorer')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),160)}});
  $('#aiSend')?.addEventListener('click',()=>primarySearch());
  $('#aiInput')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')primarySearch()});
}
