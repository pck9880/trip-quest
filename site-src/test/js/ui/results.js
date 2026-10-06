import { $, esc } from '../core/dom.js';

export function createResultsUI(state){
  let onSelectPlace=null;
  function setSelectPlaceHandler(handler){onSelectPlace=handler}
  function renderRanking(){
    if(!state.recommendations.length){
      $('#ranking').className='ranking empty-state';
      $('#ranking').innerHTML='선택한 지역에서 여행 목적지로 추천할 장소를 찾지 못했습니다.<br>지역 범위를 넓히거나 다른 플레이스를 선택해보세요.';
      $('#noMatchActions').hidden=false;
      return;
    }
    $('#ranking').className='ranking';
    $('#noMatchActions').hidden=true;
    $('#ranking').innerHTML=state.recommendations.map((p,i)=>{
      const distance=Number.isFinite(Number(p.distanceKm))&&Number(p.distanceKm)>0?'<span>'+Number(p.distanceKm).toFixed(1)+'km</span>':'';
      return '<article class="rank-card" data-i="'+i+'"><div class="rank-number">'+String(i+1).padStart(2,'0')+'</div><div><h3>'+esc(p.name)+'</h3><div class="rank-tags"><span class="tag good">추천 '+Math.round(p.score||70)+'</span><span class="tag">'+esc(p.category||'장소')+'</span></div><div class="rank-meta"><span>'+esc(p.address||p.liveRegion||'선택 지역')+'</span>'+distance+'</div><div class="rank-reason">'+esc(p.aiReason||'여행 목적지 품질 필터를 통과한 장소')+'</div></div><div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button></div></article>';
    }).join('');
    $('#ranking').onclick=e=>{
      const card=e.target.closest('.rank-card');if(!card)return;
      const i=Number(card.dataset.i);
      if(e.target.closest('.select-place'))onSelectPlace?.(i,true);
    };
  }
  return {setSelectPlaceHandler,renderRanking};
}
