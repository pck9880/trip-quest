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

function refreshResultPager(){
  const host=$('#ranking');if(!host)return;
  // Search results are the deliberate no-scroll exception: one continuous internal list.
  $$('.rank-card',host).forEach(el=>{el.hidden=false});
  const pager=host.parentElement?.querySelector(':scope > .tq-page-controls[data-pager="results"]');
  if(pager)pager.remove();
  pagerState.delete('results');
}

function refreshNearbyPager(){
  const host=$('#nearbyChoiceList');if(!host)return;
  // Nearby search results also use one continuous internal scroll list.
  $$('.nearby-choice-card',host).forEach(el=>{el.hidden=false});
  const pager=host.parentElement?.querySelector(':scope > .tq-page-controls[data-pager="nearby"]');
  if(pager)pager.remove();
  pagerState.delete('nearby');
}

function refreshTimelinePager(){
  const host=$('#courseTimeline .timeline-stops');
  if(!host)return;
  // One-screen course view: all selected stops share the same timeline.
  $$('li',host).forEach(el=>{el.hidden=false});
  const old=host.parentElement?.querySelector(':scope > .tq-page-controls[data-pager="timeline"]');
  if(old)old.remove();
  pagerState.delete('timeline');
}

function buildCoursePages(){
  const panel=$('.course-builder-panel');
  if(!panel||panel.dataset.courseSinglePage)return;
  panel.dataset.courseSinglePage='1';
  // Preserve source DOM order: heading → nearby choices → schedule → result.
  // Retain the existing event for backward compatibility with selection modal.
  document.addEventListener('tq:course-page',()=>{
    $('#courseDepartTime')?.focus({preventScroll:true});
  });
  document.addEventListener('tq:course-built-next',()=>{
    refreshTimelinePager();
  });
}

function observe(host,callback){
  if(!host)return;
  new MutationObserver(()=>requestAnimationFrame(callback)).observe(host,{childList:true,subtree:false});
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
        refreshNearbyPager(false);
        refreshTimelinePager(false);
      }
    }).observe(wizard,{subtree:true,attributes:true,attributeFilter:['class']});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
