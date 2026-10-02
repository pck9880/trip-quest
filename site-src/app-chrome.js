(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const el=(tag,cls,html='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(html)n.innerHTML=html;return n};

  function forceVisibleMotion(scene){
    if(!scene||typeof scene.animate!=='function')return;
    scene.animate([
      {transform:'translate3d(-5px,-8px,0) scale(1.01)',filter:'brightness(.92)'},
      {transform:'translate3d(6px,8px,0) scale(1.025)',filter:'brightness(1.12)'},
      {transform:'translate3d(-5px,-8px,0) scale(1.01)',filter:'brightness(.92)'}
    ],{duration:6200,iterations:Infinity,easing:'ease-in-out'});
    const core=scene.querySelector('.tq-core');
    core?.animate([
      {transform:'translate(-50%,-50%) rotate(45deg) scale(.92)',boxShadow:'0 0 24px rgba(201,255,69,.08)'},
      {transform:'translate(-50%,-50%) rotate(225deg) scale(1.08)',boxShadow:'0 0 72px rgba(201,255,69,.30)'},
      {transform:'translate(-50%,-50%) rotate(405deg) scale(.92)',boxShadow:'0 0 24px rgba(201,255,69,.08)'}
    ],{duration:9000,iterations:Infinity,easing:'linear'});
    scene.querySelectorAll('.tq-node').forEach((node,i)=>node.animate([
      {opacity:.2,transform:'rotate(45deg) scale(.7)'},
      {opacity:1,transform:'rotate(225deg) scale(1.45)'},
      {opacity:.2,transform:'rotate(405deg) scale(.7)'}
    ],{duration:1800+i*180,iterations:Infinity,easing:'ease-in-out',delay:-i*240}));
  }

  function addCoverMotion(){
    const bg=$('.main-landing-bg');
    if(!bg)return;
    const existing=bg.querySelector('.tq-geo-scene');
    if(existing){forceVisibleMotion(existing);return;}
    const scene=el('div','tq-geo-scene');
    scene.setAttribute('aria-hidden','true');
    scene.innerHTML=`
      <div class="tq-orbit tq-orbit-a"></div><div class="tq-orbit tq-orbit-b"></div><div class="tq-orbit tq-orbit-c"></div>
      <div class="tq-scan"></div>
      <i class="tq-beam b1"></i><i class="tq-beam b2"></i><i class="tq-beam b3"></i><i class="tq-beam b4"></i>
      <i class="tq-node n1"></i><i class="tq-node n2"></i><i class="tq-node n3"></i><i class="tq-node n4"></i><i class="tq-node n5"></i><i class="tq-node n6"></i>
      <div class="tq-core"><span></span><b>AI</b></div>`;
    bg.appendChild(scene);
    forceVisibleMotion(scene);
  }

  function showCover(){
    const landing=$('#mainLanding');
    if(!landing)return;
    landing.hidden=false;
    landing.classList.remove('leaving');
    document.body.classList.add('landing-open');
    addCoverMotion();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function scrollToTarget(selector){
    const target=$(selector);
    if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function addBottomNav(){
    if($('.tq-bottom-nav'))return;
    const nav=el('nav','tq-bottom-nav');
    nav.setAttribute('aria-label','앱 하단 메뉴');
    nav.innerHTML=`
      <button type="button" data-tab="home" class="active" aria-label="홈"><i>⌂</i><span>홈</span></button>
      <button type="button" data-tab="ai" aria-label="AI 찾기"><i>✦</i><span>AI 찾기</span></button>
      <button type="button" data-tab="plan" aria-label="여행 계획"><i>⌖</i><span>여행</span></button>
      <button type="button" data-tab="share" aria-label="공유"><i>↗</i><span>공유</span></button>`;
    document.body.appendChild(nav);
    const setActive=tab=>nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    nav.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      const tab=b.dataset.tab;
      if(tab==='home'){setActive('home');showCover();return;}
      if(tab==='ai'){setActive('ai');scrollToTarget('.ai-hero');$('#aiInput')?.focus({preventScroll:true});return;}
      if(tab==='plan'){setActive('plan');scrollToTarget('#progress');return;}
      if(tab==='share'){setActive('share');$('#topShareBtn')?.click();setTimeout(()=>setActive('plan'),650);}
    });
    window.addEventListener('scroll',()=>{
      if(!$('#mainLanding')?.hidden)return;
      const y=window.scrollY;
      const ai=$('.ai-hero');
      if(ai&&y<ai.offsetTop+ai.offsetHeight*.72)setActive('ai');
      else setActive('plan');
    },{passive:true});
  }

  function enhanceTopbar(){
    const top=$('.topbar');
    if(!top||top.querySelector('.tq-top-label'))return;
    top.classList.add('tq-appbar');
    const label=el('div','tq-top-label','<small>TRIP QUEST</small><strong>여행 플래너</strong>');
    const brand=$('.brand');
    if(brand)brand.after(label);
    const share=$('#topShareBtn');
    if(share){share.setAttribute('aria-label','여행 공유');share.textContent='↗';share.classList.add('tq-icon-btn');}
  }

  function observeLanding(){
    const landing=$('#mainLanding');
    if(!landing)return;
    const nav=$('.tq-bottom-nav');
    const sync=()=>nav?.classList.toggle('cover-open',!landing.hidden);
    new MutationObserver(sync).observe(landing,{attributes:true,attributeFilter:['hidden','class']});
    sync();
  }

  function enforceCourseDetailOrder(){
    const panel=$('#courseDetailPanel');
    const map=panel?.querySelector('.course-route-map-card');
    const actions=panel?.querySelector('#courseActionButtons');
    if(!panel||!map||!actions)return;
    if(map.nextElementSibling!==actions)map.insertAdjacentElement('afterend',actions);
  }

  function observeCourseDetailOrder(){
    const panel=$('#courseDetailPanel');
    if(!panel)return;
    enforceCourseDetailOrder();
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;enforceCourseDetailOrder()});
    }).observe(panel,{childList:true,subtree:false});
  }

  function selectedManualCount(){
    return document.querySelectorAll('#categoryChoices button.selected').length;
  }

  function addManualSearchButton(){
    const options=$('#manualOptions');
    if(!options||$('#manualSearchNow'))return;
    const wrap=el('div','manual-search-now');
    wrap.style.cssText='margin-top:18px;display:grid;gap:8px';
    wrap.innerHTML='<button id="manualSearchNow" class="btn primary" type="button" style="width:100%;min-height:56px">선택한 조건으로 검색하기 →</button><small id="manualSearchHint" style="color:#8e99a8;text-align:center">선택 후 바로 추천지를 검색합니다.</small>';
    options.appendChild(wrap);
    const btn=$('#manualSearchNow');
    const hint=$('#manualSearchHint');
    const sync=()=>{
      const count=selectedManualCount();
      btn.disabled=count===0;
      if(hint)hint.textContent=count?`취향 ${count}개 선택 · 현재 거리/방향 조건으로 검색`:'여행 취향을 1개 이상 선택하세요.';
    };
    options.addEventListener('click',()=>setTimeout(sync,0));
    sync();
    btn.onclick=async()=>{
      if(btn.disabled)return;
      const next=$('#nextBtn');
      if(!next)return;
      btn.disabled=true;btn.textContent='추천 조건 준비 중…';
      try{
        /* STEP 2 -> STEP 3 -> 추천 실행. 기존 검색 로직을 그대로 사용해 상태 불일치를 막는다. */
        next.click();
        await new Promise(r=>setTimeout(r,120));
        btn.textContent='추천지 검색 중…';
        $('#nextBtn')?.click();
      }finally{
        setTimeout(()=>{btn.disabled=selectedManualCount()===0;btn.textContent='선택한 조건으로 검색하기 →'},900);
      }
    };
  }

  function parseWon(text){
    const n=Number(String(text||'').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n)?n:0;
  }
  function parseKm(text){
    const n=Number(String(text||'').replace(/[^0-9.]/g,''));
    return Number.isFinite(n)?n:0;
  }
  function fmtWon(n){return `${Math.round(n||0).toLocaleString('ko-KR')}원`}
  function estimateCompactToll(roundTripKm){
    const oneWay=Math.max(0,roundTripKm/2);
    if(oneWay<40)return 0;
    /* 정적 배포판의 OSRM은 유료도로 요금을 주지 않는다. 한국 경차 50% 할인 기준의 보수적 추정치. */
    const oneWayToll=(900+oneWay*44.3)*0.5;
    return Math.max(0,Math.round((oneWayToll*2)/100)*100);
  }
  function enhanceTripSummaryToll(){
    const summary=$('#tripSummary');
    if(!summary||!summary.querySelector('.metric-grid'))return;
    const metrics=[...summary.querySelectorAll('.metric')];
    const findMetric=label=>metrics.find(m=>m.querySelector('span')?.textContent.trim()===label);
    const distanceMetric=findMetric('왕복 거리');
    const tollMetric=findMetric('통행료')||findMetric('예상 통행료');
    const totalMetric=findMetric('교통비 합계');
    const fuelMetric=findMetric('기름값');
    if(!distanceMetric||!tollMetric)return;
    const distance=parseKm(distanceMetric.querySelector('strong')?.textContent);
    const current=parseWon(tollMetric.querySelector('strong')?.textContent);
    if(current>0)return;
    const estimated=estimateCompactToll(distance);
    const label=tollMetric.querySelector('span');
    const value=tollMetric.querySelector('strong');
    if(label)label.textContent='예상 통행료';
    if(value)value.textContent=estimated?`약 ${fmtWon(estimated)}`:'0원';
    if(totalMetric){
      const fuel=parseWon(fuelMetric?.querySelector('strong')?.textContent);
      const total=totalMetric.querySelector('strong');
      if(total)total.textContent=fmtWon(fuel+estimated);
    }
    const note=summary.querySelector('.source-note');
    if(note&&!note.dataset.tollNote){
      note.dataset.tollNote='1';
      note.textContent+=estimated?' · 통행료는 OSRM 미제공으로 경차(50% 할인) 기준 추정':' · 단거리 구간은 예상 통행료 0원';
    }
  }
  function observeTripSummary(){
    const summary=$('#tripSummary');
    if(!summary)return;
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;enhanceTripSummaryToll()});
    }).observe(summary,{childList:true,subtree:true,characterData:true});
    enhanceTripSummaryToll();
  }

  function runtimeHealthCheck(){
    const critical=['#aiSend','#nextBtn','#categoryChoices','#directionChoices','#ranking','#tripSummary','#courseList'];
    const missing=critical.filter(s=>!$(s));
    if(missing.length)console.error('TRIP QUEST UI missing:',missing.join(', '));
    const next=$('#nextBtn');if(next)next.type='button';
    document.querySelectorAll('#categoryChoices button,#directionChoices button,.progress-step').forEach(b=>b.type='button');
  }

  function bootChrome(){
    addCoverMotion();
    enhanceTopbar();
    addBottomNav();
    observeLanding();
    observeCourseDetailOrder();
    addManualSearchButton();
    observeTripSummary();
    runtimeHealthCheck();
    const footer=$('.app-version-footer');if(footer)footer.textContent='TRIP QUEST · v0.29';
    document.documentElement.classList.add('tq-chrome-ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootChrome,{once:true});
  else bootChrome();
})();