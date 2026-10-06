import { $, setText } from '../core/dom.js';

export function showMainLanding(){
  const landing=$('#mainLanding');
  if(!landing)return;
  landing.hidden=false;
  document.body.classList.add('landing-open');
  setText('#mainLocationStatus','내 위치를 확인하면 여행 검색 화면으로 바로 이동합니다.');
  const btn=$('#mainLocateBtn');if(btn){btn.disabled=false;btn.classList.remove('done','error');btn.textContent='내 위치 검색하기'}
}

export function hideMainLanding(){
  const landing=$('#mainLanding');if(!landing)return;
  landing.classList.add('leaving');
  setTimeout(()=>{landing.hidden=true;landing.classList.remove('leaving');document.body.classList.remove('landing-open')},260);
}
