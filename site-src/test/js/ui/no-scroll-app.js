// TRIP QUEST · NO-SCROLL APP MODE
// Pagination layer only. It never changes search/category/course business state.

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const pagerState=new Map();

function ensurePager(key,host,label='PAGE'){
  let pager=host?.parentElement?.querySelector(':scope > .tq-page-controls[data-pager="'+key+'"]');
  if(pager)return pager;
  if(!host?.parentElement)return null;
  pager=document.createElement('div');
  pager.className='tq-page-controls';
  pager.dataset.pager=key;
  pager.innerHTML='<button type="button" data-page-dir="-1" aria-label="이전 페이지">◀</button><div class="tq-page-label"><span>'+label+'</span> <strong>1 / 1</strong></div><button type="button" data-page-dir="1" aria-label="다음 페이지">▶</button>';
  host.insertAdjacentElement('afterend',pager);
  pager.addEventListener('click',e=>{
    const b=e.target.closest('button[data-page-dir]');if(!b)return;
    const st=pagerState.get(key);if(!st)return;
    st.page=Math.max(0,Math.min(st.pages-1,st.page+Number(b.dataset.pageDir)));
    renderPager(key);
  });
  return pager;
}

function paginate({key,host,itemSelector,pageSize,label='PAGE'}){
  if(!host)return;
  const items=$$(itemSelector,host);
  const prev=pagerState.get(key);
  const pages=Math.max(1,Math.ceil(items.length/pageSize));
  const state={
    key,host,itemSelector,pageSize,label,
    page:Math.min(prev?.page||0,pages-1),
    pages
  };
  pagerState.set(key,state);
  const pager=ensurePager(key,host,label);
  if(pager)state.pager=pager;
  renderPager(key);
}

function renderPager(key){
  const st=pagerState.get(key);if(!st)return;
  const items=$$(st.itemSelector,st.host);
  st.pages=Math.max(1,Math.ceil(items.length/st.pageSize));
  st.page=Math.max(0,Math.min(st.page,st.pages-1));
  items.forEach((el,i)=>{el.hidden=!(i>=st.page*st.pageSize&&i<(st.page+1)*st.pageSize)});
  if(!st.pager)return;
  st.pager.hidden=items.length<=st.pageSize;
  const strong=$('strong',st.pager);
  if(strong)strong.textContent=(st.page+1)+' / '+st.pages;
  const buttons=$$('button',st.pager);
  if(buttons[0])buttons[0].disabled=st.page===0;
  if(buttons[1])buttons[1].disabled=st.page>=st.pages-1;
}

function refreshPlacePager(reset=false){
  if(reset&&pagerState.get('places'))pagerState.get('places').page=0;
  paginate({key:'places',host:$('#placeChoices'),itemSelector:'button[data-value]',pageSize:6,label:'PLACE'});
}

function refreshResultPager(reset=false){
  const host=$('#ranking');if(!host)return;
  if(reset&&pagerState.get('results'))pagerState.get('results').page=0;
  paginate({key:'results',host,itemSelector:'.rank-card',pageSize:3,label:'RESULT'});
}

function refreshNearbyPager(reset=false){
  const host=$('#nearbyChoiceList');if(!host)return;
  if(reset&&pagerState.get('nearby'))pagerState.get('nearby').page=0;
  paginate({key:'nearby',host,itemSelector:'.nearby-choice-card',pageSize:3,label:'NEARBY'});
}

function refreshTimelinePager(reset=false){
  const host=$('#courseTimeline .timeline-stops');if(!host)return;
  if(reset&&pagerState.get('timeline'))pagerState.get('timeline').page=0;
  paginate({key:'timeline',host,itemSelector:'li',pageSize:3,label:'ROUTE'});
}

function buildCoursePages(){
  const panel=$('.course-builder-panel');
  if(!panel||panel.dataset.noScrollPages)return;
  panel.dataset.noScrollPages='1';

  const head=$('.course-builder-head',panel);
  const radius=$('.nearby-radius-box',panel);
  const load=$('#nearbyLoadStatus',panel);
  const source=$('#nearbySource',panel);
  const list=$('#nearbyChoiceList',panel);
  const schedule=$('.schedule-builder',panel);
  const timeline=$('#courseTimeline',panel);
  if(!head||!radius||!list||!schedule||!timeline)return;

  const nearby=document.createElement('div');
  nearby.className='tq-course-page-nearby';
  nearby.dataset.tqCoursePage='nearby';

  const plan=document.createElement('div');
  plan.className='tq-course-page-plan';
  plan.dataset.tqCoursePage='plan';
  plan.hidden=true;

  panel.insertBefore(nearby,head);
  nearby.append(head,radius);
  if(load)nearby.append(load);
  if(source)nearby.append(source);
  nearby.append(list);

  panel.append(plan);
  plan.append(schedule,timeline);

  const controls=document.createElement('div');
  controls.className='tq-page-controls tq-course-switch';
  controls.dataset.pager='course';
  controls.innerHTML='<button type="button" data-course-dir="-1" disabled aria-label="장소 선택 화면">◀</button><div class="tq-page-label"><span>COURSE</span> <strong>1 / 2</strong></div><button type="button" data-course-dir="1" aria-label="코스 설정 화면">▶</button>';
  const step=$('[data-step-view="4"]');
  step?.insertBefore(controls,panel);
  controls.addEventListener('click',e=>{
    const b=e.target.closest('button[data-course-dir]');if(!b)return;
    setCoursePage(Number(b.dataset.courseDir)>0?1:0);
  });
}

function setCoursePage(page){
  const nearby=$('[data-tq-course-page="nearby"]');
  const plan=$('[data-tq-course-page="plan"]');
  const controls=$('.tq-course-switch');
  if(!nearby||!plan||!controls)return;
  const p=page?1:0;
  nearby.hidden=p!==0;
  plan.hidden=p!==1;
  const strong=$('strong',controls);if(strong)strong.textContent=(p+1)+' / 2';
  const buttons=$$('button',controls);
  if(buttons[0])buttons[0].disabled=p===0;
  if(buttons[1])buttons[1].disabled=p===1;
  controls.dataset.page=String(p);
  if(p===0)refreshNearbyPager(false);
  else refreshTimelinePager(false);
}

function observe(host,callback){
  if(!host)return;
  new MutationObserver(()=>requestAnimationFrame(callback)).observe(host,{childList:true,subtree:true});
}

function removeLegacyScrollCalls(){
  // CSS owns viewport locking; keep current visual position on every step.
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}

function boot(){
  document.documentElement.classList.add('tq-no-scroll');
  buildCoursePages();
  refreshPlacePager(true);
  refreshResultPager(true);
  refreshNearbyPager(true);
  refreshTimelinePager(true);

  observe($('#placeChoices'),()=>refreshPlacePager(false));
  observe($('#ranking'),()=>refreshResultPager(true));
  observe($('#nearbyChoiceList'),()=>refreshNearbyPager(true));
  observe($('#courseTimeline'),()=>refreshTimelinePager(true));

  const wizard=$('.wizard');
  if(wizard){
    new MutationObserver(()=>{
      const active=$('.wizard>.step-view.active');
      const n=Number(active?.dataset.stepView||0);
      if(n===2)refreshPlacePager(false);
      if(n===3)refreshResultPager(false);
      if(n===4){
        setCoursePage(Number($('.tq-course-switch')?.dataset.page||0));
        refreshNearbyPager(false);
        refreshTimelinePager(false);
      }
      removeLegacyScrollCalls();
    }).observe(wizard,{subtree:true,attributes:true,attributeFilter:['class']});
  }

  window.addEventListener('resize',removeLegacyScrollCalls,{passive:true});
  window.visualViewport?.addEventListener('resize',removeLegacyScrollCalls,{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
