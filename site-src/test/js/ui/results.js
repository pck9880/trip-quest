import { $, esc } from '../core/dom.js';
import { focusMapPoint } from './main-map.js';

export function createResultsUI(state){
  let onSelectPlace=null;
  function setSelectPlaceHandler(handler){onSelectPlace=handler}

  function renderRanking(){
    if(!state.recommendations.length){
      $('#ranking').className='ranking empty-state';
      $('#ranking').innerHTML='선택한 지역과 조건에 맞는 장소를 찾지 못했습니다.<br>플레이스 종류나 부가조건을 조정해보세요.';
      $('#noMatchActions').hidden=false;
      return;
    }
    $('#ranking').className='ranking';
    $('#noMatchActions').hidden=true;
    $('#ranking').innerHTML=state.recommendations.map((p,i)=>{
      const distance=Number.isFinite(Number(p.distanceKm))&&Number(p.distanceKm)>0
        ?'<span>'+Number(p.distanceKm).toFixed(1)+'km</span>':'';
      const facilities=Object.entries(p.facilities||{})
        .filter(([,v])=>v)
        .map(([k])=>({parking:'주차',indoor:'실내',outdoor:'실외',pet:'반려동물',wheelchair:'무장애',toilets:'화장실'}[k]))
        .filter(Boolean).slice(0,3);
      return '<article class="rank-card" data-i="'+i+'">'+
        '<div class="rank-number">'+String(i+1).padStart(2,'0')+'</div>'+
        '<div><h3>'+esc(p.name)+'</h3>'+
        '<div class="rank-tags"><span class="tag good">적합도 '+Math.round(p.score||70)+'</span><span class="tag">'+esc(p.category||'장소')+'</span>'+facilities.map(x=>'<span class="tag">'+esc(x)+'</span>').join('')+'</div>'+
        '<div class="rank-meta"><span>'+esc(p.address||p.liveRegion||'선택 지역')+'</span>'+distance+'</div>'+
        '<div class="rank-reason">'+esc(p.aiReason||'선택한 행정구역 경계 안의 장소')+'</div></div>'+
        '<div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button><button class="btn secondary map-focus">지도에서 보기</button></div></article>';
    }).join('');
    $('#ranking').onclick=e=>{
      const card=e.target.closest('.rank-card');if(!card)return;
      const i=Number(card.dataset.i);
      if(e.target.closest('.select-place'))onSelectPlace?.(i,true);
      else focusMapPoint(state.recommendations[i],14);
    };
  }

  return {setSelectPlaceHandler,renderRanking};
}
