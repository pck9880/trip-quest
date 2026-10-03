import { initGeoExplorer } from './geo-explorer.js';

export function initSearchFlow({state,travelService,setOrigin,hideMainLanding,showMainLanding,onSearch,onSelect}){
  const explorer=initGeoExplorer({state,travelService,setOrigin,onSearch,onSelect});

  async function start(launch='manual'){
    state.searchMode='travel';
    hideMainLanding?.();
    document.body.classList.remove('tq-search-ready');
    explorer.clearCandidates();
    explorer.syncOrigin();
    setOrigin?.(state.origin||null);
    document.querySelector('.wizard')?.scrollIntoView({behavior:'auto',block:'start'});
    if(launch==='gps'){
      await explorer.useGpsOrigin();
      explorer.syncOrigin();
    }
    document.body.dataset.tripStep='1';
  }

  function reset(){
    state.searchMode='travel';
    state.searchRegion=null;
    state.exploreTarget=null;
    state.recommendations=[];
    state.minKm=0;
    state.targetKm=100;
    document.body.classList.remove('tq-search-ready','tq-category-open','tq-local-search-mode');
    explorer.clearCandidates();
    explorer.syncOrigin();
    explorer.resetTarget(false);
    explorer.setSheetState('mid',false);
  }

  return {
    ...explorer,
    start,
    reset,
    syncPlaceLabel:explorer.syncOrigin,
    showMainLanding
  };
}
