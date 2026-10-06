// TRIP QUEST · PHASE 5 FINAL POLISH
// Visual-only motion and interaction feedback. Business logic is untouched.

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function addWipe(){
  if($('.p5-screen-wipe'))return $('.p5-screen-wipe');
  const el=document.createElement('div');
  el.className='p5-screen-wipe';
  el.setAttribute('aria-hidden','true');
  document.body.appendChild(el);
  return el;
}

function restartClass(el,name,duration=380){
  if(!el||reduceMotion)return;
  el.classList.remove(name);
  void el.offsetWidth;
  el.classList.add(name);
  setTimeout(()=>el.classList.remove(name),duration);
}

function activeStep(){
  return $('.wizard>.step-view.active');
}

function animateStep(){
  const wipe=addWipe();
  restartClass(wipe,'is-running',430);
  const step=activeStep();
  restartClass(step,'p5-enter',280);
  const title=$('.tq-top-label strong');
  restartClass(title,'p5-title-flash',460);
}

function animateCards(){
  $$('.rank-card,.popular-grid>*').forEach((card,i)=>{
    if(card.dataset.p5Card)return;
    card.dataset.p5Card='1';
    if(reduceMotion)return;
    setTimeout(()=>restartClass(card,'p5-card-in',300),Math.min(i,5)*35);
  });
}

function bindSelections(){
  document.addEventListener('click',e=>{
    const chip=e.target.closest('.selector-chip-grid button');
    if(chip)restartClass(chip,'p5-selected',300);

    const nav=e.target.closest('.tq-bottom-nav button');
    if(nav)restartClass(nav,'p5-pressed',160);
  },{passive:true});

  document.addEventListener('change',e=>{
    const select=e.target.closest('.region-select-grid select');
    if(select)restartClass(select,'p5-changed',340);
  },{passive:true});
}

function watchStep(){
  const body=document.body;
  let last=body.dataset.tripStep||'';
  new MutationObserver(()=>{
    const next=body.dataset.tripStep||'';
    if(next===last)return;
    last=next;
    requestAnimationFrame(()=>{
      animateStep();
      animateCards();
    });
  }).observe(body,{attributes:true,attributeFilter:['data-trip-step']});
}

function watchWizardActive(){
  const wizard=$('.wizard');
  if(!wizard)return;
  let current=activeStep();
  new MutationObserver(()=>{
    const next=activeStep();
    if(next===current)return;
    current=next;
    requestAnimationFrame(animateStep);
  }).observe(wizard,{subtree:true,attributes:true,attributeFilter:['class']});
}

function watchResults(){
  const ranking=$('#ranking');
  if(!ranking)return;
  new MutationObserver(()=>requestAnimationFrame(animateCards))
    .observe(ranking,{childList:true,subtree:true});
}

function watchAuth(){
  const views=$$('.tq-auth-view');
  if(!views.length)return;
  const sync=()=>{
    views.forEach(v=>{
      if(!v.hidden)restartClass(v,'p5-auth-enter',260);
    });
  };
  views.forEach(v=>new MutationObserver(sync).observe(v,{attributes:true,attributeFilter:['hidden']}));
}

function classifyToast(text=''){
  const t=text.trim();
  if(!t)return'';
  if(/실패|오류|없|못|아니|취소|확인해|불가/.test(t))return'p5-error';
  if(/완료|성공|저장|설정|추가|보상|준비됐|선택됐/.test(t))return'p5-success';
  return'';
}

function watchToast(){
  const toast=$('#toast');
  if(!toast)return;
  const sync=()=>{
    const text=toast.textContent||'';
    toast.classList.remove('p5-success','p5-error');
    const kind=classifyToast(text);
    if(kind)toast.classList.add(kind);
    if(text.trim())restartClass(toast,'p5-toast-show',300);
  };
  new MutationObserver(sync).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true});
}

function ensureTouchTargets(){
  $$('.tq-bottom-nav button,.wizard-actions .btn,.selector-chip-grid button,.tq-auth-submit,.tq-auth-switch')
    .forEach(el=>el.dataset.p5Touch='1');
}

function boot(){
  document.documentElement.classList.add('phase5-final-ready');
  document.documentElement.dataset.pixelPhase='5';
  addWipe();
  bindSelections();
  watchStep();
  watchWizardActive();
  watchResults();
  watchAuth();
  watchToast();
  ensureTouchTargets();
  animateCards();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
