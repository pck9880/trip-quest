import { $, all, setText, loading, toast, esc } from '../core/dom.js';
import { drawMap, drawRoute } from '../ui/main-map.js';
import { createResultsUI } from '../ui/results.js';
import { keepService } from '../services/keep-service.js';

export function createSearchController({state,travelService,setStep}){
  const results=createResultsUI(state);
  let pendingExpand=null;

  function hideExpandModal(){
    const modal=$('#rangeExpandModal');
    if(modal)modal.hidden=true;
    pendingExpand=null;
  }
  function showExpandModal({fromName,toName,request}){
    const modal=$('#rangeExpandModal');
    if(!modal)return false;
    const categoryText=(state.categories||[]).join(' · ')||'선택 장소';
    setText('#rangeExpandFrom',fromName);
    setText('#rangeExpandTo',toName);
    setText('#rangeExpandText',fromName+'에서 '+categoryText+' 조건에 맞는 장소를 찾지 못했습니다. '+toName+' 전체로 범위를 넓혀서 찾아볼까요?');
    pendingExpand=request;
    modal.hidden=false;
    return true;
  }
  function offerExpandedSearch(scopeIndex){
    const boundaries=state.regionBoundaries||[];
    const path=state.regionPath||[];
    if(scopeIndex<=0||!boundaries[scopeIndex-1])return false;
    const targetIndex=scopeIndex-1;
    return showExpandModal({
      fromName:path[scopeIndex]||boundaries[scopeIndex]?.name||'현재 지역',
      toName:path[targetIndex]||boundaries[targetIndex]?.name||'상위 지역',
      request:{
        regionBoundary:boundaries[targetIndex],
        regionPath:path.slice(0,targetIndex+1),
        scopeIndex:targetIndex,
        expanded:true
      }
    });
  }

  if(typeof document!=='undefined'){
    const expandConfirm=$('#rangeExpandConfirm');
    if(expandConfirm)expandConfirm.onclick=async()=>{
      const req=pendingExpand;
      hideExpandModal();
      if(req)await recommend(req);
    };
    const expandCancel=$('#rangeExpandCancel');
    if(expandCancel)expandCancel.onclick=()=>{hideExpandModal();setStep(1)};
    const expandModal=$('#rangeExpandModal');
    if(expandModal)expandModal.addEventListener('click',e=>{if(e.target===expandModal)hideExpandModal()});
  }
  function sortRecommendations(mode=state.resultSort,rerender=true){
    state.resultSort=mode||'recommend';
    const cmp=state.resultSort==='name'
      ?(a,b)=>a.name.localeCompare(b.name,'ko')
      :state.resultSort==='category'
        ?(a,b)=>(a.category||'').localeCompare(b.category||'','ko')||((b.score||0)-(a.score||0))
        :(a,b)=>(b.score||0)-(a.score||0);
    state.recommendations.sort(cmp);
    all('.result-sort button').forEach(b=>b.classList.toggle('active',b.dataset.sort===state.resultSort));
    if(rerender){results.renderRanking();drawMap(state.origin,state.recommendations)}
  }

  function presentRecommendations(items=[]){
    state.recommendations=Array.isArray(items)?items:[];
    state.selected=null;
    sortRecommendations('recommend',false);
    results.renderRanking();
    drawMap(state.origin,state.recommendations);
    return state.recommendations;
  }

  function currentPayload(){return {origin:state.origin,regionBoundary:state.regionBoundary,regionPath:state.regionPath,categories:state.categories,facilities:state.facilities,gasPrice:1858}}

  async function recommend(extra={}){
    state.lastSearchMode='selection';state.activeDistanceBand=null;
    if(!state.regionBoundary){toast('지역을 먼저 선택하세요.');setStep(1);return}
    if(!state.categories.length){toast('플레이스를 한 개 이상 선택하세요.');setStep(2);return}
    hideExpandModal();
    const payload={...currentPayload(),...extra};
    const scopePath=payload.regionPath||state.regionPath||[];
    const scopeIndex=Number.isInteger(extra.scopeIndex)?extra.scopeIndex:Math.max(0,(state.regionBoundaries||[]).length-1);
    loading(true);setStep(4);$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='선택한 지역의 플레이스를 불러오고 있습니다…';$('#noMatchActions').hidden=true;
    try{
      const j=await travelService.selectionSearch(payload);
      presentRecommendations(j.items||[]);
      setText('#resultCaption',`${scopePath.join(' › ')} · ${state.categories.join(' · ')} · ${state.recommendations.length}곳`);
      setText('#mapStatus',`후보 ${state.recommendations.length}곳 · ${j.source||'지도 데이터'}`);
      if(!state.recommendations.length){
        const offered=offerExpandedSearch(scopeIndex);
        if(!offered){
          $('#noMatchActions').hidden=false;
          setText('#resultCaption',scopePath.join(' › ')+' · 조건에 맞는 장소 없음');
        }
      }else if(extra.expanded){
        toast((scopePath.at(-1)||'확대 지역')+' 범위에서 다시 찾았습니다.');
      }
    }catch(e){$('#ranking').innerHTML=`<span class="error">${esc(e.message)}</span>`}
    finally{loading(false);setStep(4)}
  }

  async function selectPlace(i,goCourse=false){
    state.selected=state.recommendations[i];setText('#selectedPlaceName',state.selected.name);setText('#selectedPlaceMeta',`${state.selected.category||'여행지'} · ${state.selected.address||'주소 정보 없음'}`);$('#tripSummary').className='summary-box empty-state';$('#tripSummary').innerHTML='왕복 경로와 비용을 계산하고 있습니다…';$('#courseList').className='course-list empty-state';$('#courseList').innerHTML='목적지 날씨와 주변 장소를 분석해 코스를 만들고 있습니다…';$('#nextBtn').disabled=false;loading(true);if(goCourse)setStep(5);
    const base={origin:state.origin,destination:state.selected,gasPrice:1858};
    try{
      const c=await travelService.courses({...base,categories:state.categories});
      results.renderCourses(c);
      if(state.origin){
        const sum=await travelService.tripSummary(base);results.renderSummary(sum);drawRoute(sum.outbound.coords);setText('#mapStatus',`${state.selected.name} · 왕복 ${sum.total.distanceKm.toFixed(1)}km`);
      }else{
        $('#tripSummary').className='summary-box empty-state';$('#tripSummary').innerHTML='장소 선택 완료 · 출발 위치를 설정하면 왕복 거리와 교통비를 계산할 수 있습니다.';setText('#mapStatus',state.selected.name);
      }
    }catch(e){$('#tripSummary').innerHTML=`<span class="error">${esc(e.message)}</span>`;$('#courseList').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);if(goCourse)setStep(5)}
  }
  function openKeptCourse(id){
    const item=keepService.get(id);
    const course=item?.course;
    if(!item||!course){toast('저장한 코스 정보를 찾지 못했습니다.');return false}
    state.selected={...(item.destination||{})};
    state.selectedCourse=course.id||'KEEP';
    state.selectedCourseData=course;
    setStep(5);
    const opened=results.renderSavedCourse(item);
    if(!opened){toast('저장한 코스를 열지 못했습니다.');return false}
    setTimeout(()=>document.querySelector('[data-step-view="5"]')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    return true;
  }

  results.setSelectPlaceHandler(selectPlace);
  return {sortRecommendations,currentPayload,recommend,selectPlace,renderRanking:results.renderRanking,presentRecommendations,openKeptCourse};
}
