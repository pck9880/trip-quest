(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const el=(tag,cls,html='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(html)n.innerHTML=html;return n};

  function addCoverMotion(){
    const bg=$('.main-landing-bg');
    if(!bg||bg.querySelector('.tq-geo-scene'))return;
    const scene=el('div','tq-geo-scene');
    scene.setAttribute('aria-hidden','true');
    scene.innerHTML=`
      <div class="tq-orbit tq-orbit-a"></div><div class="tq-orbit tq-orbit-b"></div><div class="tq-orbit tq-orbit-c"></div>
      <div class="tq-scan"></div>
      <i class="tq-beam b1"></i><i class="tq-beam b2"></i><i class="tq-beam b3"></i><i class="tq-beam b4"></i>
      <i class="tq-node n1"></i><i class="tq-node n2"></i><i class="tq-node n3"></i><i class="tq-node n4"></i><i class="tq-node n5"></i><i class="tq-node n6"></i>
      <div class="tq-core"><span></span><b>AI</b></div>`;
    bg.appendChild(scene);
  }

  function showCover(){
    const landing=$('#mainLanding');
    if(!landing)return;
    landing.hidden=false;
    landing.classList.remove('leaving');
    document.body.classList.add('landing-open');
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

  function bootChrome(){
    addCoverMotion();
    enhanceTopbar();
    addBottomNav();
    observeLanding();
    const footer=$('.app-version-footer');if(footer)footer.textContent='TRIP QUEST · v0.25';
    document.documentElement.classList.add('tq-chrome-ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootChrome,{once:true});
  else bootChrome();
})();