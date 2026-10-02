import { $, all, setText, loading, toast, esc } from '../core/dom.js';
import { placePopularity } from '../domain/recommendation.js';
import { drawMap, drawRoute } from '../ui/main-map.js';
import { createResultsUI } from '../ui/results.js';

export function createSearchController({state,api,setStep}){
  const results=createResultsUI(state);
  function sortRecommendations(mode=state.resultSort,rerender=true){
    state.resultSort=mode||'recommend';
    const cmp=state.resultSort==='far'
      ?(a,b)=>b.distanceKm-a.distanceKm
      :state.resultSort==='near'
        ?(a,b)=>a.distanceKm-b.distanceKm
        :(a,b)=>((placePopularity(b)*.55)+(b.score||0)*.45)-((placePopularity(a)*.55)+(a.score||0)*.45);
    state.recommendations.sort(cmp);
    all('.result-sort button').forEach(b=>b.classList.toggle('active',b.dataset.sort===state.resultSort));
    if(rerender){results.renderRanking();drawMap(state.origin,state.recommendations)}
  }

  function currentPayload(){return {origin:state.origin,minKm:state.minKm,targetKm:state.targetKm,direction:state.direction,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value,gasPrice:Number($('#gasPrice').value||1700)}}

  async function recommend(extra={}

  async function selectPlace(i,goCourse=false){
    state.selected=state.recommendations[i];setText('#selectedPlaceName',state.selected.name);setText('#selectedPlaceMeta',`${state.selected.category||'여행지'} · ${state.selected.address||'주소 정보 없음'}`);$('#tripSummary').className='summary-box empty-state';$('#tripSummary').innerHTML='왕복 경로와 비용을 계산하고 있습니다…';$('#courseList').className='course-list empty-state';$('#courseList').innerHTML='목적지 날씨와 주변 장소를 분석해 코스를 만들고 있습니다…';$('#nextBtn').disabled=false;loading(true);if(goCourse)setStep(5);
    const base={origin:state.origin,destination:state.selected,gasPrice:Number($('#gasPrice').value||1700)};
    try{const [sum,c]=await Promise.all([api('/api/trip-summary',{method:'POST',body:JSON.stringify(base)}),api('/api/courses',{method:'POST',body:JSON.stringify({...base,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value})})]);results.renderSummary(sum);results.renderCourses(c);drawRoute(sum.outbound.coords);setText('#mapStatus',`${state.selected.name} · 왕복 ${sum.total.distanceKm.toFixed(1)}km`)}catch(e){$('#tripSummary').innerHTML=`<span class="error">${esc(e.message)}</span>`;$('#courseList').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);if(goCourse)setStep(5)}
  }
  results.setSelectPlaceHandler(selectPlace);
  return {sortRecommendations,currentPayload,recommend,selectPlace,renderRanking:results.renderRanking};
}
