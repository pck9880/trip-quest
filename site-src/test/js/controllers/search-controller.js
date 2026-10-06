import { $, all, setText, loading, toast, esc } from '../core/dom.js';
import { createResultsUI } from '../ui/results.js';
import { keepService } from '../services/keep-service.js';
import { pickPopularRecommendations, popularBasis } from '../domain/popularity.js';

export function createSearchController({state,travelService,setStep}){
  const results=createResultsUI(state);
  let pendingExpand=null,placeLoadTimer=null,placeLoadValue=0,nearbyTimer=null,nearbyProgress=0;

  function renderPlaceLoad({stateName='idle',value=0,title='PLACE SEARCH',text=''}={}){
    placeLoadValue=Math.max(0,Math.min(100,Number(value)||0));const wrap=$('#placeLoadStatus'),bar=$('#placeLoadBar'),pct=$('#placeLoadPercent');
    if(wrap){wrap.hidden=false;wrap.dataset.state=stateName}if(bar)bar.style.width=placeLoadValue+'%';if(pct)pct.textContent=Math.round(placeLoadValue)+'%';setText('#placeLoadTitle',title);setText('#placeLoadText',text);
  }
  function stopPlaceLoad(){if(placeLoadTimer){clearInterval(placeLoadTimer);placeLoadTimer=null}}
  function startPlaceLoad(scopeName,expanded=false){
    stopPlaceLoad();placeLoadValue=6;const title=expanded?'RANGE SEARCH':'PLACE SEARCH';renderPlaceLoad({stateName:'loading',value:placeLoadValue,title,text:scopeName+' 공식 플레이스를 조회하고 있습니다.'});
    placeLoadTimer=setInterval(()=>{if(placeLoadValue>=91)return;placeLoadValue=Math.min(91,placeLoadValue+(placeLoadValue<35?8:placeLoadValue<70?5:2));renderPlaceLoad({stateName:'loading',value:placeLoadValue,title,text:scopeName+' 공식 플레이스를 조회하고 있습니다.'})},140);
  }
  function finishPlaceLoad(scopeName,count){stopPlaceLoad();renderPlaceLoad({stateName:'done',value:100,title:'SEARCH COMPLETE',text:count?scopeName+'에서 '+count+'곳을 찾았습니다.':scopeName+' 검색을 완료했지만 조건에 맞는 장소가 없습니다.'})}
  function failPlaceLoad(message){stopPlaceLoad();renderPlaceLoad({stateName:'error',value:0,title:'SEARCH ERROR',text:message})}

  function renderNearbyProgress(stateName='idle',value=0,text=''){
    nearbyProgress=Math.max(0,Math.min(100,value));const box=$('#nearbyLoadStatus'),bar=$('#nearbyLoadBar'),pct=$('#nearbyLoadPercent');
    if(box){box.hidden=false;box.dataset.state=stateName}if(bar)bar.style.width=nearbyProgress+'%';if(pct)pct.textContent=Math.round(nearbyProgress)+'%';setText('#nearbyLoadText',text);
  }
  function startNearbyProgress(){
    if(nearbyTimer)clearInterval(nearbyTimer);nearbyProgress=8;renderNearbyProgress('loading',8,'목적지 주변의 갈 만한 곳을 찾고 있습니다.');
    nearbyTimer=setInterval(()=>{if(nearbyProgress>=90)return;nearbyProgress=Math.min(90,nearbyProgress+(nearbyProgress<50?7:3));renderNearbyProgress('loading',nearbyProgress,'공식 데이터와 주변 장소를 비교하고 있습니다.')},130);
  }
  function finishNearbyProgress(count){if(nearbyTimer)clearInterval(nearbyTimer);nearbyTimer=null;renderNearbyProgress('done',100,count?count+'곳을 추천했습니다. 원하는 장소를 직접 선택하세요.':'설정한 거리 안에서 추천 장소를 찾지 못했습니다.')}
  function hideExpandModal(){const modal=$('#rangeExpandModal');if(modal)modal.hidden=true;pendingExpand=null}
  function showExpandModal({fromName,toName,request}){
    const modal=$('#rangeExpandModal');if(!modal)return false;const categoryText=(state.categories||[]).join(' · ')||'선택 장소';
    setText('#rangeExpandFrom',fromName);setText('#rangeExpandTo',toName);setText('#rangeExpandText',fromName+'에서 '+categoryText+' 조건에 맞는 장소를 찾지 못했습니다. '+toName+' 전체로 범위를 넓혀서 찾아볼까요?');pendingExpand=request;modal.hidden=false;return true;
  }
  function offerExpandedSearch(scopeIndex){
    const boundaries=state.regionBoundaries||[],path=state.regionPath||[];if(scopeIndex<=0||!boundaries[scopeIndex-1])return false;const targetIndex=scopeIndex-1;
    return showExpandModal({fromName:path[scopeIndex]||boundaries[scopeIndex]?.name||'현재 지역',toName:path[targetIndex]||boundaries[targetIndex]?.name||'상위 지역',request:{regionBoundary:boundaries[targetIndex],regionPath:path.slice(0,targetIndex+1),scopeIndex:targetIndex,expanded:true}});
  }
  function sortRecommendations(mode=state.resultSort,rerender=true){
    state.resultSort=mode||'recommend';
    const cmp=state.resultSort==='name'?(a,b)=>a.name.localeCompare(b.name,'ko'):state.resultSort==='category'?(a,b)=>(a.category||'').localeCompare(b.category||'','ko')||((b.score||0)-(a.score||0)):(a,b)=>(b.score||0)-(a.score||0);
    state.recommendations.sort(cmp);all('.result-sort button').forEach(b=>b.classList.toggle('active',b.dataset.sort===state.resultSort));if(rerender)results.renderRanking()
  }
  function presentRecommendations(items=[]){state.recommendations=Array.isArray(items)?items:[];state.selected=null;sortRecommendations('recommend',false);results.renderRanking();return state.recommendations}
  function currentPayload(){return {origin:state.origin,regionBoundary:state.regionBoundary,regionPath:state.regionPath,categories:state.categories,facilities:[],gasPrice:1858}}

  async function recommend(extra={}){
    state.lastSearchMode='selection';state.activeDistanceBand=null;if(!state.regionBoundary){toast('지역을 먼저 선택하세요.');setStep(1);return}if(!state.categories.length){toast('플레이스를 한 개 이상 선택하세요.');setStep(2);return}
    hideExpandModal();const payload={...currentPayload(),...extra},scopePath=payload.regionPath||state.regionPath||[],scopeIndex=Number.isInteger(extra.scopeIndex)?extra.scopeIndex:Math.max(0,(state.regionBoundaries||[]).length-1),scopeName=scopePath.at(-1)||'선택 지역';
    loading(true);setStep(3);startPlaceLoad(scopeName,!!extra.expanded);$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='선택한 지역의 플레이스를 불러오고 있습니다…';$('#noMatchActions').hidden=true;
    try{
      const j=await travelService.selectionSearch(payload);presentRecommendations(j.items||[]);finishPlaceLoad(scopeName,state.recommendations.length);setText('#resultCaption',scopePath.join(' › ')+' · '+state.categories.join(' · ')+' · '+state.recommendations.length+'곳 · '+(j.source||'장소 데이터'));
      if(!state.recommendations.length){const offered=offerExpandedSearch(scopeIndex);if(!offered){$('#noMatchActions').hidden=false;setText('#resultCaption',scopePath.join(' › ')+' · 조건에 맞는 장소 없음')}}else if(extra.expanded)toast((scopePath.at(-1)||'확대 지역')+' 범위에서 다시 찾았습니다.');
    }catch(e){
      failPlaceLoad(e.message||'플레이스 검색에 실패했습니다.');
      $('#ranking').className='ranking empty-state';
      $('#ranking').innerHTML='<div><span class="error">'+esc(e.message)+'</span><br><br><button id="retryPlaceSearchBtn" class="btn primary" type="button">검색 다시 시도</button></div>';
      $('#retryPlaceSearchBtn')?.addEventListener('click',()=>recommend(extra));
    }finally{loading(false);setStep(3)}
  }

  function selectedNearby(){const ids=new Set(state.selectedNearbyIds||[]);return (state.nearbyCandidates||[]).filter(x=>ids.has(x.id))}
  function renderNearby(){
    const list=$('#nearbyChoiceList');if(!list)return;
    const selected=new Set(state.selectedNearbyIds||[]);
    if(!state.nearbyCandidates.length){
      list.className='nearby-choice-list empty-state';
      list.innerHTML='현재 반경에서는 추천할 장소가 없습니다. 반경을 넓혀 다시 찾아보세요.';
      return;
    }

    const popular=pickPopularRecommendations(state.nearbyCandidates);
    const topRank=new Map(popular.map((x,i)=>[x.place.id,i+1]));
    const topIds=new Set(popular.map(x=>x.place.id));
    const regular=state.nearbyCandidates.filter(x=>!topIds.has(x.id));
    const basis=popularBasis(state.nearbyCandidates);
    const basisText=basis==='foot-traffic'?'유동인구 데이터 기준':'여행지 인기도 기준';

    function card(p,i,rank=0){
      const on=selected.has(p.id),stay=Number(state.courseStayById?.[p.id]||60);
      return '<article class="nearby-choice-card'+(on?' selected':'')+(rank?' nearby-popular-card nearby-popular-rank-'+rank:'')+'" data-id="'+esc(p.id)+'">'+
        (rank?'<span class="nearby-popular-badge">TOP '+rank+'</span>':'')+
        '<button class="nearby-pick" type="button" aria-pressed="'+on+'"><span class="nearby-index">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(p.name)+'</b><small>'+esc(p.category||'장소')+' · '+Number(p.distanceKm||0).toFixed(1)+'km</small><em>'+esc(p.address||'')+'</em></div><strong>'+(on?'선택 ✓':'추가 +')+'</strong></button>'+
        (on?'<label class="stay-control">머무는 시간 <select data-stay="'+esc(p.id)+'"><option value="30"'+(stay===30?' selected':'')+'>30분</option><option value="60"'+(stay===60?' selected':'')+'>60분</option><option value="90"'+(stay===90?' selected':'')+'>90분</option><option value="120"'+(stay===120?' selected':'')+'>120분</option></select></label>':'')+
        '</article>';
    }

    const topHtml='<section class="nearby-popular-section"><div class="nearby-popular-head"><div><span>POPULAR PICKS</span><strong>이 주변 인기 추천</strong><small>'+basisText+'</small></div><b>'+popular.length+'곳</b></div><div class="nearby-popular-grid">'+popular.map((x,i)=>card(x.place,i,topRank.get(x.place.id))).join('')+'</div></section>';
    const regularHtml=regular.length?'<section class="nearby-regular-section"><div class="nearby-regular-head"><span>전체 추천</span><small>'+state.nearbyCandidates.length+'곳</small></div><div class="nearby-regular-grid">'+regular.map((p,i)=>card(p,popular.length+i)).join('')+'</div></section>':'';

    list.className='nearby-choice-list nearby-choice-grouped';
    list.innerHTML=topHtml+regularHtml;
    setText('#selectedNearbyCount',selected.size+'곳 선택');
    $('#buildSelectedCourseBtn').disabled=selected.size===0;
  }
  async function refreshNearby(){
    if(!state.selected)return;const radius=Number(state.courseRadiusKm||5);startNearbyProgress();$('#nearbyChoiceList').className='nearby-choice-list empty-state';$('#nearbyChoiceList').innerHTML='주변 추천 장소를 준비하고 있습니다…';
    try{const j=await travelService.nearbyCandidates({destination:state.selected,radiusKm:radius});state.nearbyCandidates=j.items||[];state.selectedNearbyIds=[];state.courseStayById={[state.selected.id]:Number($('#destinationStayMin')?.value||60)};renderNearby();finishNearbyProgress(state.nearbyCandidates.length);setText('#nearbySource',(j.source||'장소 데이터')+' · 목적지 기준 '+radius.toFixed(1)+'km')}
    catch(e){finishNearbyProgress(0);$('#nearbyChoiceList').innerHTML='<span class="error">'+esc(e.message)+'</span>'}
  }
  function defaultDeparture(){
    const d=new Date(Date.now()+30*60*1000);d.setMinutes(Math.ceil(d.getMinutes()/10)*10,0,0);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }
  async function buildCourse(){
    const chosen=selectedNearby();if(!chosen.length){toast('코스에 넣을 장소를 한 곳 이상 선택하세요.');return}
    const depart=$('#courseDepartTime').value||defaultDeparture();const stay={...(state.courseStayById||{}),[state.selected.id]:Number($('#destinationStayMin').value||60)};
    loading(true);$('#courseTimeline').className='course-timeline empty-state';$('#courseTimeline').innerHTML='선택한 장소의 최적 순서를 계산하고 있습니다…';
    try{
      const course=await travelService.buildCourse({destination:state.selected,selectedStops:chosen,departureTime:depart,stayById:stay});state.selectedCourse='SELECTED';state.selectedCourseData=course;
      $('#courseTimeline').className='course-timeline';
      const endLabel=course.endDayOffset?('다음날 '+course.endTime):course.endTime;
      $('#courseTimeline').innerHTML='<div class="course-total"><div><span>출발</span><strong>'+esc(course.departureTime)+'</strong></div><div><span>이동</span><strong>'+course.travelMin+'분</strong></div><div><span>체류</span><strong>'+course.stayMin+'분</strong></div><div><span>예상 종료</span><strong>'+esc(endLabel)+'</strong></div></div><ol class="timeline-stops">'+course.legs.map((x,i)=>'<li><b>'+String(i+1).padStart(2,'0')+' · '+esc(x.stop.name)+'</b><span>'+esc(x.arrival.time)+(x.arrival.dayOffset?' (+1일)':'')+' 도착 · '+x.stayMin+'분 체류 · '+esc(x.leave.time)+' 출발</span></li>').join('')+'</ol><div class="course-rule">도보 예상 '+course.route.distanceKm.toFixed(1)+'km · 선택한 장소만 사용 · 거리 최적화 순서</div>';
      setText('#actionHint','코스 계산 완료 · 예상 종료 '+endLabel);toast('선택한 장소로 최적 코스를 만들었습니다.');
    }catch(e){$('#courseTimeline').innerHTML='<span class="error">'+esc(e.message)+'</span>'}finally{loading(false)}
  }

  async function selectPlace(i,goCourse=false){
    state.selected=state.recommendations[i];state.nearbyCandidates=[];state.selectedNearbyIds=[];state.courseStayById={[state.selected.id]:60};state.selectedCourse=null;state.selectedCourseData=null;
    setText('#selectedPlaceName',state.selected.name);setText('#selectedPlaceMeta',(state.selected.category||'여행지')+' · '+(state.selected.address||'주소 정보 없음'));setText('#selectedNearbyCount','0곳 선택');$('#courseTimeline').className='course-timeline empty-state';$('#courseTimeline').innerHTML='주변 장소를 선택한 뒤 코스를 계산하세요.';
    if($('#courseDepartTime'))$('#courseDepartTime').value=defaultDeparture();if($('#nearbyRadiusRange')){$('#nearbyRadiusRange').value=String(state.courseRadiusKm||5);setText('#nearbyRadiusValue',Number(state.courseRadiusKm||5).toFixed(1)+'km')}if(goCourse)setStep(4);await refreshNearby();
  }
  function bindCourseBuilder(){
    if(typeof document==='undefined')return;
    $('#nearbyRadiusRange')?.addEventListener('input',e=>{state.courseRadiusKm=Number(e.target.value);setText('#nearbyRadiusValue',state.courseRadiusKm.toFixed(1)+'km')});
    $('#nearbyRadiusRange')?.addEventListener('change',refreshNearby);$('#nearbyRefreshBtn')?.addEventListener('click',refreshNearby);
    $('#destinationStayMin')?.addEventListener('change',e=>{if(state.selected)state.courseStayById={...(state.courseStayById||{}),[state.selected.id]:Number(e.target.value)}});
    $('#nearbyChoiceList')?.addEventListener('click',e=>{
      if(e.target.closest('select'))return;const card=e.target.closest('.nearby-choice-card');if(!card)return;const id=card.dataset.id,ids=new Set(state.selectedNearbyIds||[]);
      if(ids.has(id))ids.delete(id);else{if(ids.size>=6){toast('한 코스에는 주변 장소를 최대 6곳까지 선택할 수 있습니다.');return}ids.add(id)}
      state.selectedNearbyIds=[...ids];if(ids.has(id)&&!state.courseStayById?.[id])state.courseStayById={...(state.courseStayById||{}),[id]:60};renderNearby();
    });
    $('#nearbyChoiceList')?.addEventListener('change',e=>{const id=e.target?.dataset?.stay;if(!id)return;state.courseStayById={...(state.courseStayById||{}),[id]:Number(e.target.value)}});
    $('#buildSelectedCourseBtn')?.addEventListener('click',buildCourse);
    const expandConfirm=$('#rangeExpandConfirm');if(expandConfirm)expandConfirm.onclick=async()=>{const req=pendingExpand;hideExpandModal();if(req)await recommend(req)};
    $('#rangeExpandCancel')?.addEventListener('click',()=>{hideExpandModal();setStep(1)});$('#rangeExpandModal')?.addEventListener('click',e=>{if(e.target===$('#rangeExpandModal'))hideExpandModal()});
  }
  function openKeptCourse(id){const item=keepService.get(id);if(!item){toast('저장한 코스를 찾지 못했습니다.');return false}toast('이전 KEEP 코스는 새 선택형 코스에서 목적지를 다시 선택해 사용해주세요.');return false}

  results.setSelectPlaceHandler(selectPlace);bindCourseBuilder();
  return {sortRecommendations,currentPayload,recommend,selectPlace,renderRanking:results.renderRanking,presentRecommendations,openKeptCourse,refreshNearby,buildCourse};
}
