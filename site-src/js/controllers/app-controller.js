import { $, all } from '../core/dom.js';

export function bindAppActions({state,startFromMainLocation,hideMainLanding,setStep,sortRecommendations,useLocation,searchOrigin,updateSchedulePreview,resetTrip,recommend,searchSimilarDistance,primarySearch}){
  const openAdvanced=$('#openAdvancedSearch');
  if(openAdvanced)openAdvanced.onclick=()=>{
    const opening=!document.body.classList.contains('tq-advanced-open')||state.step!==2;
    if(opening){
      document.body.classList.add('tq-advanced-open');
      openAdvanced.classList.add('open');
      openAdvanced.setAttribute('aria-expanded','true');
      setStep(2);
      const box=$('#manualOptions'),toggle=$('#manualToggle');
      if(box)box.hidden=false;
      if(toggle){toggle.setAttribute('aria-expanded','true');toggle.textContent='직접 선택 접기 ↑'}
      setTimeout(()=>$('.wizard')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }else{
      document.body.classList.remove('tq-advanced-open');
      openAdvanced.classList.remove('open');
      openAdvanced.setAttribute('aria-expanded','false');
      setTimeout(()=>$('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    }
  };
  const mainLocate=$('#mainLocateBtn');if(mainLocate)mainLocate.onclick=startFromMainLocation;
  const mainManual=$('#mainManualBtn');if(mainManual)mainManual.onclick=()=>{hideMainLanding();if(state.searchMode==='travel'){setStep(1);setTimeout(()=>$('#originSearch')?.focus(),320)}else{setTimeout(()=>$('#searchRegionInput')?.focus(),220)}};
  const manualToggle=$('#manualToggle');if(manualToggle)manualToggle.onclick=()=>{const box=$('#manualOptions');if(!box)return;box.hidden=!box.hidden;manualToggle.setAttribute('aria-expanded',String(!box.hidden));manualToggle.textContent=box.hidden?'직접 선택으로 찾기 ↓':'직접 선택 접기 ↑';if(!box.hidden)setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),80)};
  const resultSort=$('#resultSort');if(resultSort)resultSort.onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;sortRecommendations(b.dataset.sort,true)};
  $('#locateBtn').onclick=()=>useLocation(false);$('#searchOriginBtn').onclick=searchOrigin;$('#originSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchOrigin()});
  $('#departTime').addEventListener('change',updateSchedulePreview);$('#returnTime').addEventListener('change',updateSchedulePreview);$('#resetBtn').onclick=resetTrip;$('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn').onclick=()=>{const target=state.step-1;if(target===2){document.body.classList.add('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.add('open');bar.setAttribute('aria-expanded','true')}}setStep(target)};$('#nextBtn').onclick=async()=>{if(state.step===1){document.body.classList.add('tq-advanced-open');if(state.origin)setStep(2);else await useLocation(true)}else if(state.step===2)setStep(3);else if(state.step===3)await recommend();else if(state.step===4){if(state.selected)setStep(5)}else resetTrip()};
  all('.progress-step').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(n<=state.step||n<=3){if(n===2){document.body.classList.add('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.add('open');bar.setAttribute('aria-expanded','true')}}setStep(n)}});$('#editConditionsBtn').onclick=()=>{document.body.classList.add('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.add('open');bar.setAttribute('aria-expanded','true')}setStep(2);const box=$('#manualOptions'),toggle=$('#manualToggle');if(box)box.hidden=false;if(toggle){toggle.setAttribute('aria-expanded','true');toggle.textContent='직접 선택 접기 ↑'}};$('#changePlaceBtn').onclick=()=>setStep(4);
  $('#noMatchActions').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='similar')searchSimilarDistance();else if(b.dataset.noMatch==='refine'){document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),180)}};
  $('#aiSend').onclick=()=>primarySearch();$('#aiInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')primarySearch()});
}
