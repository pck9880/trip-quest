import { $, setText } from '../core/dom.js';

export function showMainLanding(){
  const landing=$('#mainLanding');
  if(!landing)return;
  landing.hidden=false;
  landing.classList.remove('leaving');
  document.body.classList.add('landing-open');
  setText('#mainLocationStatus','지역 → 플레이스 → 부가조건 순서로 선택합니다.');
  const btn=$('#mainLocateBtn');
  if(btn){btn.disabled=false;btn.classList.remove('done','error');btn.textContent='TRIP QUEST 시작'}
}

export function hideMainLanding(){
  const landing=$('#mainLanding');if(!landing)return;
  landing.classList.add('leaving');
  document.body.classList.remove('landing-open');
  setTimeout(()=>{landing.hidden=true;landing.classList.remove('leaving')},260);
}
