import { esc } from '../core/dom.js';
import { questSessionService } from '../services/quest-session-service.js';

export function initQuestIsland(){
  if(typeof document==='undefined'||document.querySelector('#tqQuestIsland'))return;
  const island=document.createElement('div');
  island.id='tqQuestIsland';
  island.className='tq-quest-island';
  island.hidden=true;
  island.setAttribute('aria-live','polite');
  document.body.appendChild(island);

  let popupTimer=0;
  function snapshotMarkup(){
    const snap=questSessionService.getSnapshot(),session=snap.session,quest=snap.quest,checkpoint=snap.checkpoint;
    if(!session||!quest)return null;
    return {
      courseId:quest.course?.id||'',
      title:quest.destination?.name||quest.title||'설정한 코스',
      target:checkpoint?.name||quest.routeStops?.at?.(-1)?.name||'목적지'
    };
  }
  function render(){
    const item=snapshotMarkup();
    if(!item){island.hidden=true;return}
    island.hidden=false;
    island.innerHTML=`<button type="button" class="tq-quest-island-main" aria-label="현재 QUEST 열기"><span><i></i><small>QUEST</small><strong>${esc(item.courseId)}코스 · ${esc(item.title)}</strong></span><b>${esc(item.target)} <em>›</em></b></button>`;
  }
  function showCoursePopup(){
    const item=snapshotMarkup();if(!item)return;
    let pop=document.querySelector('#tqCourseReadyPopup');
    if(!pop){
      pop=document.createElement('div');
      pop.id='tqCourseReadyPopup';
      pop.className='tq-course-ready-popup';
      document.body.appendChild(pop);
    }
    clearTimeout(popupTimer);
    pop.hidden=false;
    pop.innerHTML=`<div><small>COURSE READY</small><strong>${esc(item.courseId)}코스 설정 완료</strong><p>상단 바에서 현재 코스를 언제든 확인할 수 있어요.<br>최종 목적지 <b>${esc(item.target)}</b>에서 보상받기를 눌러주세요.</p></div>`;
    popupTimer=setTimeout(()=>{pop.hidden=true},2400);
  }

  island.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('tripquest:open-quest')));
  questSessionService.subscribe(event=>{
    if(event.type==='armed'){render();showCoursePopup();return}
    if(event.type==='cancelled'||event.type==='completed'){render();return}
    if(['claim_failed','checkpoint_complete'].includes(event.type))render();
  });
  window.addEventListener('tripquest:quest-change',render);
  render();
}
