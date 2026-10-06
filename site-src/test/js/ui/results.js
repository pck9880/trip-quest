import { $, esc } from '../core/dom.js';
import { pickPopularRecommendations, popularBasis } from '../domain/popularity.js';

export function createResultsUI(state){
  let onSelectPlace=null;
  function setSelectPlaceHandler(handler){onSelectPlace=handler}

  function cardHtml(p,i,{popularRank=0}={}){
    const distance=Number.isFinite(Number(p.distanceKm))&&Number(p.distanceKm)>0?'<span>'+Number(p.distanceKm).toFixed(1)+'km</span>':'';
    const rankClass=popularRank?(' popular-card popular-rank-'+popularRank):'';
    const badge=popularRank?'<div class="popular-badge">TOP '+popularRank+'</div>':'';
    return '<article class="rank-card'+rankClass+'" data-i="'+i+'">'+badge+
      '<div class="rank-number">'+String(i+1).padStart(2,'0')+'</div>'+
      '<div><h3>'+esc(p.name)+'</h3>'+
      '<div class="rank-tags"><span class="tag good">추천 '+Math.round(p.score||70)+'</span><span class="tag">'+esc(p.category||'장소')+'</span></div>'+
      '<div class="rank-meta"><span>'+esc(p.address||p.liveRegion||'선택 지역')+'</span>'+distance+'</div>'+
      '<div class="rank-reason">'+esc(p.aiReason||'여행 목적지 품질 필터를 통과한 장소')+'</div></div>'+
      '<div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button></div></article>';
  }

  function renderRanking(){
    if(!state.recommendations.length){
      $('#ranking').className='ranking empty-state';
      $('#ranking').innerHTML='선택한 지역에서 여행 목적지로 추천할 장소를 찾지 못했습니다.<br>지역 범위를 넓히거나 다른 플레이스를 선택해보세요.';
      $('#noMatchActions').hidden=false;
      return;
    }

    $('#ranking').className='ranking ranking-with-popular';
    $('#noMatchActions').hidden=true;

    const popular=pickPopularRecommendations(state.recommendations);
    const popularIndexes=new Set(popular.map(x=>x.index));
    const basis=popularBasis(state.recommendations);
    const basisText=basis==='foot-traffic'
      ?'유동인구 데이터 기준'
      :'공식 데이터·여행지 성격·인지도 신호를 합산한 인기 추천';

    const popularHtml='<section class="popular-picks"><div class="popular-picks-head"><div><span>POPULAR PICKS</span><h3>이 지역 인기 추천</h3><p>'+esc(basisText)+'</p></div><strong>'+popular.length+'곳</strong></div><div class="popular-grid">'+
      popular.map((x,idx)=>cardHtml(x.place,x.index,{popularRank:idx+1})).join('')+
      '</div></section>';

    const regular=state.recommendations
      .map((p,i)=>({p,i}))
      .filter(x=>!popularIndexes.has(x.i));

    const regularHtml=regular.length
      ?'<section class="regular-results"><div class="regular-results-head"><span>ALL RESULTS</span><strong>전체 추천 '+state.recommendations.length+'곳</strong></div><div class="regular-results-list">'+regular.map(x=>cardHtml(x.p,x.i)).join('')+'</div></section>'
      :'';

    $('#ranking').innerHTML=popularHtml+regularHtml;
    $('#ranking').onclick=e=>{
      const card=e.target.closest('.rank-card');if(!card)return;
      const i=Number(card.dataset.i);
      if(e.target.closest('.select-place'))onSelectPlace?.(i,true);
    };
  }

  return {setSelectPlaceHandler,renderRanking};
}
