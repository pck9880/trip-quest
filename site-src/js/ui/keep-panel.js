import { $, esc, toast } from '../core/dom.js';
import { fmtWon, fmtMin, fmtKm } from '../core/format.js';
import { keepService } from '../services/keep-service.js';

function savedDate(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(d);
}

function modeLabel(mode){return mode==='drive'?'차량':'도보'}
function routeDistanceLabel(course){
  const distance=Number(course?.route?.distanceKm)||0;
  const stops=Array.isArray(course?.stops)?course.stops:[];
  return distance>0.05?fmtKm(distance):(stops.length<=1?'단일 장소':'현지 이동');
}
function routeTimeLabel(course){
  const time=Number(course?.route?.timeMin)||0;
  const stops=Array.isArray(course?.stops)?course.stops:[];
  return time>0.5?fmtMin(time):(stops.length<=1?'체류형':'현지 이동');
}

export function initKeepPanel({onOpenCourse}={}){
  if(typeof document==='undefined'||$('#tqKeepOverlay'))return;

  const overlay=document.createElement('div');
  overlay.id='tqKeepOverlay';
  overlay.className='tq-keep-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`
    <section class="tq-keep-sheet" role="dialog" aria-modal="true" aria-labelledby="tqKeepTitle">
      <div class="tq-sheet-handle" aria-hidden="true"></div>
      <header class="tq-keep-head">
        <div>
          <small>MY KEEP</small>
          <h2 id="tqKeepTitle">저장한 코스</h2>
        </div>
        <button class="tq-keep-close" type="button" aria-label="KEEP 닫기">×</button>
      </header>
      <div id="tqKeepBody" class="tq-keep-body"></div>
    </section>`;
  document.body.appendChild(overlay);

  const body=$('#tqKeepBody');
  const close=()=>{
    overlay.hidden=true;
    document.body.classList.remove('tq-keep-open');
    window.dispatchEvent(new CustomEvent('tripquest:keep-closed'));
  };
  const open=()=>{
    renderList();
    overlay.hidden=false;
    document.body.classList.add('tq-keep-open');
    requestAnimationFrame(()=>overlay.querySelector('.tq-keep-close')?.focus({preventScroll:true}));
  };

  function removeKeep(id,returnToList=true){
    const item=keepService.get(id);
    if(!item)return;
    keepService.remove(id);
    toast('KEEP에서 해제했어요.');
    if(returnToList)renderList();
    else if(!keepService.count())renderList();
  }

  function renderList(){
    const items=keepService.list();
    if(!items.length){
      body.innerHTML=`
        <div class="tq-keep-empty">
          <div class="tq-keep-empty-star" aria-hidden="true">☆</div>
          <strong>아직 저장한 코스가 없어요.</strong>
          <p>코스 카드의 별표를 누르면 여기에 보관됩니다.</p>
        </div>`;
      return;
    }

    body.innerHTML=`
      <div class="tq-keep-summary"><span>저장한 코스</span><strong>${items.length}</strong></div>
      <div class="tq-keep-list">
        ${items.map(item=>{
          const c=item.course||{},route=c.route||{};
          const stops=(c.stops||[]).map(x=>x.name).filter(Boolean);
          return `<article class="tq-keep-item" data-keep-id="${esc(item.id)}">
            <button class="tq-keep-item-main" type="button">
              <span class="tq-keep-course-id">${esc(c.id||'COURSE')}</span>
              <span class="tq-keep-item-copy">
                <strong>${esc(item.destination?.name||'여행지')} · ${esc(c.id||'')}코스</strong>
                <small>${esc(stops.slice(0,3).join(' → ')||c.title||'저장한 코스')}</small>
                <em>${esc(modeLabel(c.mode))} · ${esc(routeDistanceLabel(c))} · ${esc(routeTimeLabel(c))}</em>
              </span>
            </button>
            <button class="tq-keep-remove" type="button" aria-label="KEEP 해제" title="KEEP 해제">★</button>
          </article>`;
        }).join('')}
      </div>`;
  }

  function renderDetail(id){
    const item=keepService.get(id);
    if(!item){renderList();return}
    const c=item.course||{},route=c.route||{},cost=c.estimatedCost||{};
    const stops=Array.isArray(c.stops)?c.stops:[];
    const destination=item.destination||{};
    const tripDistance=Number(destination.distanceKm)||Number(destination.routePreview?.distanceKm)||0;
    const tripTime=Number(destination.routePreview?.timeMin)||0;
    const coord=(Number(destination.lat)&&Number(destination.lng))?`${Number(destination.lat).toFixed(5)}, ${Number(destination.lng).toFixed(5)}`:'';
    const placeMeta=[destination.address,coord].filter(Boolean).join(' · ');
    body.innerHTML=`
      <div class="tq-keep-detail">
        <button class="tq-keep-back" type="button">← KEEP 목록</button>
        <div class="tq-keep-detail-title">
          <div><small>${esc(item.destination?.category||'여행 코스')}</small><h3>${esc(item.destination?.name||'여행지')} · ${esc(c.id||'')}코스</h3></div>
          <button class="tq-keep-detail-star" type="button" data-remove-id="${esc(item.id)}" aria-label="KEEP 해제">★</button>
        </div>
        <p class="tq-keep-detail-reason">${esc(c.reason||c.title||'저장한 여행 코스')}</p>
        <div class="tq-keep-place-info">
          <span>DESTINATION</span>
          <strong>${esc(destination.name||'여행지')}</strong>
          ${placeMeta?`<small>${esc(placeMeta)}</small>`:''}
          ${destination.aiReason?`<p>${esc(destination.aiReason)}</p>`:''}
          ${(tripDistance||tripTime)?`<div class="tq-keep-trip-context">${tripDistance?`<b>출발지 기준 ${fmtKm(tripDistance)}</b>`:''}${tripTime?`<b>편도 ${fmtMin(tripTime)}</b>`:''}</div>`:''}
        </div>
        <div class="tq-keep-detail-metrics">
          <div><span>이동</span><strong>${esc(modeLabel(c.mode))}</strong></div>
          <div><span>코스 거리</span><strong>${esc(routeDistanceLabel(c))}</strong></div>
          <div><span>코스 소요</span><strong>${esc(routeTimeLabel(c))}</strong></div>
          <div><span>예상 비용</span><strong>${fmtWon(cost.total||0)}</strong></div>
        </div>
        <div class="tq-keep-detail-stops">
          <span>COURSE</span>
          <ol>${stops.map((stop,index)=>`<li><i>${index+1}</i><b>${esc(stop.name)}</b><small>${esc(stop.category||'')}</small></li>`).join('')}</ol>
        </div>
        ${c.localRule?`<div class="tq-keep-detail-rule">${esc(c.localRule)}</div>`:''}
        <div class="tq-keep-detail-meta">저장 ${esc(savedDate(item.savedAt))}</div>
        <div class="tq-keep-detail-actions">
          <button class="tq-keep-detail-go" type="button" data-open-course-id="${esc(item.id)}">코스 바로가기 →</button>
          <button class="tq-keep-detail-remove" type="button" data-remove-id="${esc(item.id)}">★ KEEP 해제</button>
        </div>
      </div>`;
  }

  overlay.addEventListener('click',e=>{
    if(e.target===overlay){close();return}
    if(e.target.closest('.tq-keep-close')){close();return}
    if(e.target.closest('.tq-keep-back')){renderList();return}

    const removeButton=e.target.closest('.tq-keep-remove');
    if(removeButton){
      const item=removeButton.closest('.tq-keep-item');
      if(item)removeKeep(item.dataset.keepId,true);
      return;
    }

    const openCourse=e.target.closest('[data-open-course-id]');
    if(openCourse){
      const id=openCourse.dataset.openCourseId;
      const item=keepService.get(id);
      close();
      if(typeof onOpenCourse==='function')onOpenCourse(id,item);
      else window.dispatchEvent(new CustomEvent('tripquest:open-kept-course',{detail:{id,item}}));
      return;
    }

    const detailRemove=e.target.closest('[data-remove-id]');
    if(detailRemove){
      removeKeep(detailRemove.dataset.removeId,false);
      renderList();
      return;
    }

    const main=e.target.closest('.tq-keep-item-main');
    if(main){
      const item=main.closest('.tq-keep-item');
      if(item)renderDetail(item.dataset.keepId);
    }
  });

  window.addEventListener('tripquest:open-keep',open);
  window.addEventListener('tripquest:close-keep',close);
  window.addEventListener('tripquest:keep-request-count',()=>{
    window.dispatchEvent(new CustomEvent('tripquest:keep-count',{detail:{count:keepService.count()}}));
  });
  window.addEventListener('tripquest:keep-change',()=>{
    if(!overlay.hidden)renderList();
  });
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});

  window.dispatchEvent(new CustomEvent('tripquest:keep-count',{detail:{count:keepService.count()}}));
}
