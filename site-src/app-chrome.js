(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const el=(tag,cls,html='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(html)n.innerHTML=html;return n};
  const ICON_PATHS={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
    ai:'<path d="M12 3l1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z"/><path d="m18.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/><path d="m5 14 .7 1.8 1.8.7-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z"/>',
    route:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M7.8 17.1c2.6-1.1 1.8-4.3 4.4-5.4 1.5-.7 2.9-.2 4.1-1.8"/><path d="M7.7 6.3h4.7"/><path d="m10.5 4.2 2.1 2.1-2.1 2.1"/>',
    settings:'<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h8"/><path d="M16 18h4"/><circle cx="14" cy="18" r="2"/>',
    location:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    car:'<path d="M5 17h14"/><path d="m6 17-1-4 2-5h10l2 5-1 4"/><path d="M7 12h10"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
    fuel:'<path d="M6 21V4h9v17"/><path d="M5 21h11"/><path d="M8.5 7h4"/><path d="M15 8h2.2l2.3 2.5V17a1.5 1.5 0 0 0 3 0v-5.5l-2.2-2.2"/><path d="M19.5 7.5 21 6"/>',
    time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'
  };
  function iconSvg(name,cls='tq-icon'){
    const body=ICON_PATHS[name]||ICON_PATHS.location;
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  const VEHICLE_KEY='tq_vehicle_settings_v1';
  const VEHICLES={
    compact:{label:'경차',fuel:'gasoline',eff:14.0}, small:{label:'소형차',fuel:'gasoline',eff:13.2},
    midsize:{label:'중형차',fuel:'gasoline',eff:11.5}, suv:{label:'SUV',fuel:'gasoline',eff:10.2},
    van:{label:'승합차',fuel:'diesel',eff:9.0}, ev:{label:'전기차',fuel:'electric',eff:5.0}
  };
  const FUEL_LABEL={gasoline:'휘발유',diesel:'경유',lpg:'LPG',electric:'전기'};
  const ENERGY_DEFAULT={gasoline:1858,diesel:1843,lpg:1050,electric:347};
  let setupWaitingForLocation=false;

  function readVehicle(){try{return JSON.parse(localStorage.getItem(VEHICLE_KEY)||'null')}catch{return null}}
  function writeVehicle(v){localStorage.setItem(VEHICLE_KEY,JSON.stringify(v))}
  function forceVisibleMotion(scene){
    if(!scene)return;
    scene.classList.add('tq-photo-cover-active');
  }
  function addCoverMotion(){
    const bg=$('.main-landing-bg');
    if(!bg)return;
    bg.querySelectorAll('.tq-geo-scene').forEach(n=>n.remove());
    let scene=bg.querySelector('.tq-photo-cover-fx');
    if(!scene){
      scene=el('div','tq-photo-cover-fx');
      scene.setAttribute('aria-hidden','true');
      scene.innerHTML='<i class="tq-cover-light l1"></i><i class="tq-cover-light l2"></i>';
      bg.appendChild(scene);
    }
    forceVisibleMotion(scene);
  }
  function showCover(){const landing=$('#mainLanding');if(!landing)return;landing.hidden=false;landing.classList.remove('leaving');document.body.classList.add('landing-open');addCoverMotion();window.scrollTo({top:0,behavior:'smooth'})}
  function scrollToTarget(s){$(s)?.scrollIntoView({behavior:'smooth',block:'start'})}

  function createVehicleSetup(){
    if($('#tqVehicleSetup'))return;
    const modal=el('div','tq-setup-overlay');
    modal.id='tqVehicleSetup';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="tq-setup-card" role="dialog" aria-modal="true" aria-labelledby="tqSetupTitle">
        <div class="tq-sheet-handle" aria-hidden="true"></div>
        <header class="tq-setup-head">
          <div class="tq-setup-head-icon" aria-hidden="true">${iconSvg('car','tq-icon tq-icon-lg')}</div>
          <div class="tq-setup-head-copy">
            <div class="tq-setup-kicker">TRIP SETTINGS</div>
            <h2 id="tqSetupTitle">내 차 기준으로 계산할게요.</h2>
            <p>차량 종류와 실제 연비를 설정하면 여행 비용을 더 정확하게 계산합니다.</p>
          </div>
          <span class="tq-setup-step">1 / 1</span>
        </header>
        <section class="tq-setup-section">
          <div class="tq-field-title"><span>차량 종류</span><small>가장 가까운 차급을 선택하세요</small></div>
          <div id="tqVehicleTypes" class="tq-choice-grid">
            ${Object.entries(VEHICLES).map(([k,v])=>`<button type="button" data-vehicle="${k}">${iconSvg('car','tq-icon tq-vehicle-card-icon')}<span>${v.label}</span></button>`).join('')}
          </div>
        </section>
        <section class="tq-setup-section tq-setup-details">
          <div class="tq-setup-row">
            <label><span>동력원</span><select id="tqFuel"><option value="gasoline">휘발유</option><option value="diesel">경유</option><option value="lpg">LPG</option><option value="electric">전기</option></select></label>
            <label><span id="tqEffLabel">연비</span><div class="tq-unit-input"><input id="tqEfficiency" type="number" min="1" max="30" step="0.1" inputmode="decimal"><b id="tqEffUnit">km/L</b></div></label>
          </div>
          <div class="tq-setup-info">
            <div class="tq-energy-icon" aria-hidden="true">${iconSvg('fuel','tq-icon tq-icon-md')}</div>
            <div><span>자동 에너지 가격</span><strong id="tqEnergyPrice">전국 평균 확인 중</strong><small>최신 평균 기준값을 비용 계산에 자동 적용합니다.</small></div>
          </div>
          <label class="tq-switch-row">
            <span><b>경차 통행료 할인</b><small>해당 차량이면 예상 통행료에 반영합니다.</small></span>
            <input id="tqTollDiscount" type="checkbox">
            <i class="tq-switch-ui" aria-hidden="true"></i>
          </label>
        </section>
        <div class="tq-setup-actions">
          <button id="tqSetupSave" type="button" class="tq-setup-save">설정 완료</button>
          <small class="tq-setup-foot">이 기기에 저장 · 하단 설정 메뉴에서 언제든 변경</small>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const typeBox=$('#tqVehicleTypes'),fuel=$('#tqFuel'),eff=$('#tqEfficiency'),discount=$('#tqTollDiscount');
    const sync=()=>{const f=fuel.value;$('#tqEffLabel').textContent=f==='electric'?'전비':'연비';$('#tqEffUnit').textContent=f==='electric'?'km/kWh':'km/L';$('#tqEnergyPrice').textContent=f==='electric'?`평균 충전단가 ${ENERGY_DEFAULT[f].toLocaleString()}원/kWh`:`평균 ${FUEL_LABEL[f]} ${ENERGY_DEFAULT[f].toLocaleString()}원/L`};
    typeBox.onclick=e=>{const b=e.target.closest('[data-vehicle]');if(!b)return;typeBox.classList.remove('error');typeBox.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));const d=VEHICLES[b.dataset.vehicle];fuel.value=d.fuel;eff.value=d.eff;discount.checked=b.dataset.vehicle==='compact';sync()};
    fuel.onchange=()=>{const selected=typeBox.querySelector('.selected')?.dataset.vehicle;const d=VEHICLES[selected]||VEHICLES.midsize;if(fuel.value==='electric')eff.value=5.0;else if(d.fuel===fuel.value)eff.value=d.eff;sync()};
    $('#tqSetupSave').onclick=()=>{const vehicle=typeBox.querySelector('.selected')?.dataset.vehicle;if(!vehicle){typeBox.classList.add('error');return}const efficiency=Number(eff.value);if(!Number.isFinite(efficiency)||efficiency<=0){eff.focus();return}const settings={vehicle,vehicleLabel:VEHICLES[vehicle].label,fuel:fuel.value,fuelLabel:FUEL_LABEL[fuel.value],efficiency,tollDiscount:discount.checked,energyPrice:ENERGY_DEFAULT[fuel.value],savedAt:new Date().toISOString()};writeVehicle(settings);applyVehicleSettings(settings);closeVehicleSetup();window.dispatchEvent(new CustomEvent('tripquest:vehicle-settings',{detail:settings}))};
  }
  function openVehicleSetup(){createVehicleSetup();const modal=$('#tqVehicleSetup'),saved=readVehicle();const key=saved?.vehicle||'compact';const d=VEHICLES[key]||VEHICLES.compact;modal.hidden=false;document.body.classList.add('tq-modal-open');const btn=modal.querySelector(`[data-vehicle="${key}"]`);btn?.click();if(saved){$('#tqFuel').value=saved.fuel||d.fuel;$('#tqEfficiency').value=saved.efficiency||d.eff;$('#tqTollDiscount').checked=!!saved.tollDiscount;$('#tqFuel').dispatchEvent(new Event('change'))}}
  function closeVehicleSetup(){$('#tqVehicleSetup')?.setAttribute('hidden','');document.body.classList.remove('tq-modal-open')}
  function applyVehicleSettings(s=readVehicle()){if(!s)return;const gas=$('#gasPrice');if(gas&&s.fuel!=='electric')gas.value=s.energyPrice||ENERGY_DEFAULT[s.fuel]||1858;document.documentElement.dataset.vehicle=s.vehicle||''}
  function watchFirstLocation(){const label=$('#originLabel');if(!label)return;const ready=()=>{const t=label.textContent.trim();return t&&t!=='위치를 아직 선택하지 않았습니다.'&&!/확인|검색|불러|실패|허용/.test(t)};const check=()=>{if(!setupWaitingForLocation||!ready())return;setupWaitingForLocation=false;if(!readVehicle())setTimeout(openVehicleSetup,180)};new MutationObserver(check).observe(label,{childList:true,subtree:true,characterData:true});$('#mainLocateBtn')?.addEventListener('click',()=>{setupWaitingForLocation=true;setTimeout(check,250)},{capture:true});check()}

  function enhanceLandingSurface(){
    const landing=$('#mainLanding');if(!landing||landing.dataset.polished)return;
    landing.dataset.polished='1';
    const brand=$('.main-cover-brand');
    if(brand&&!brand.querySelector('.tq-brand-sub'))brand.insertAdjacentHTML('beforeend','<small class="tq-brand-sub">AI TRAVEL PLANNER</small>');
    const copy=$('.main-cover-copy');
    if(copy&&!copy.querySelector('.tq-cover-points'))copy.insertAdjacentHTML('beforeend','<div class="tq-cover-points" aria-label="주요 기능"><span>실시간 위치</span><span>AI 추천</span><span>비용 계산</span></div>');
    const action=$('.main-cover-action');
    if(action&&!action.querySelector('.tq-cover-trust'))action.insertAdjacentHTML('beforeend','<div class="tq-cover-trust"><i aria-hidden="true"></i><span>위치는 여행 계산에만 사용합니다.</span></div>');
  }

  function applyUnifiedIcons(){
    const mainLocate=$('#mainLocateBtn');
    if(mainLocate&&!mainLocate.querySelector('svg')){
      mainLocate.querySelector('.loc-dot')?.remove();
      mainLocate.insertAdjacentHTML('afterbegin',iconSvg('location','tq-icon tq-button-icon'));
    }
    const locationIcon=$('.location-card .location-icon');
    if(locationIcon){locationIcon.innerHTML=iconSvg('location','tq-icon tq-location-icon')}

    const timeCards=[...document.querySelectorAll('.time-cards .field-card')];
    timeCards.forEach((card,index)=>{
      const label=card.querySelector(':scope > span');
      if(!label||label.querySelector('svg'))return;
      const iconName=index<2?'time':'fuel';
      label.classList.add('tq-field-label-icon');
      label.insertAdjacentHTML('afterbegin',iconSvg(iconName,'tq-icon tq-field-icon'));
    });
  }

  function addBottomNav(){if($('.tq-bottom-nav'))return;const nav=el('nav','tq-bottom-nav');nav.setAttribute('aria-label','앱 하단 메뉴');nav.innerHTML=`<button type="button" data-tab="home" class="active"><i>${iconSvg('home','tq-icon tq-nav-icon')}</i><span>홈</span></button><button type="button" data-tab="ai"><i>${iconSvg('ai','tq-icon tq-nav-icon')}</i><span>AI 찾기</span></button><button type="button" data-tab="plan"><i>${iconSvg('route','tq-icon tq-nav-icon')}</i><span>여행</span></button><button type="button" data-tab="settings"><i>${iconSvg('settings','tq-icon tq-nav-icon')}</i><span>설정</span></button>`;document.body.appendChild(nav);const setActive=tab=>nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));nav.onclick=e=>{const b=e.target.closest('button');if(!b)return;const tab=b.dataset.tab;if(tab==='home'){setActive('home');showCover()}else if(tab==='ai'){setActive('ai');scrollToTarget('.ai-hero');$('#aiInput')?.focus({preventScroll:true})}else if(tab==='plan'){setActive('plan');scrollToTarget('#progress')}else if(tab==='settings'){setActive('settings');openVehicleSetup()}}}
  function enhanceTopbar(){const top=$('.topbar');if(!top||top.querySelector('.tq-top-label'))return;top.classList.add('tq-appbar');const label=el('div','tq-top-label','<small>TRIP QUEST</small><strong>여행 플래너</strong>');$('.brand')?.after(label);const share=$('#topShareBtn');if(share){share.setAttribute('aria-label','여행 공유');share.textContent='↗';share.classList.add('tq-icon-btn')}}
  function observeLanding(){const landing=$('#mainLanding'),nav=$('.tq-bottom-nav');if(!landing)return;const sync=()=>nav?.classList.toggle('cover-open',!landing.hidden);new MutationObserver(sync).observe(landing,{attributes:true,attributeFilter:['hidden','class']});sync()}
  function enforceCourseDetailOrder(){const panel=$('#courseDetailPanel'),map=panel?.querySelector('.course-route-map-card'),actions=panel?.querySelector('#courseActionButtons');if(panel&&map&&actions&&map.nextElementSibling!==actions)map.insertAdjacentElement('afterend',actions)}
  function observeCourseDetailOrder(){const panel=$('#courseDetailPanel');if(!panel)return;enforceCourseDetailOrder();new MutationObserver(()=>requestAnimationFrame(enforceCourseDetailOrder)).observe(panel,{childList:true,subtree:false})}
  function selectedManualCount(){return document.querySelectorAll('#categoryChoices button.selected').length}
  function addManualSearchButton(){const options=$('#manualOptions');if(!options||$('#manualSearchNow'))return;const wrap=el('div','manual-search-now');wrap.style.cssText='margin-top:18px;display:grid;gap:8px';wrap.innerHTML='<button id="manualSearchNow" class="btn primary" type="button" style="width:100%;min-height:56px">선택한 조건으로 검색하기 →</button><small id="manualSearchHint" style="color:#8e99a8;text-align:center"></small>';options.appendChild(wrap);const btn=$('#manualSearchNow'),hint=$('#manualSearchHint');const sync=()=>{const count=selectedManualCount();btn.disabled=count===0;hint.textContent=count?`취향 ${count}개 선택 · 현재 거리/방향 조건으로 검색`:'여행 취향을 1개 이상 선택하세요.'};options.addEventListener('click',()=>setTimeout(sync,0));sync();btn.onclick=async()=>{if(btn.disabled)return;const next=$('#nextBtn');if(!next)return;btn.disabled=true;btn.textContent='추천 조건 준비 중…';try{next.click();await new Promise(r=>setTimeout(r,120));btn.textContent='추천지 검색 중…';$('#nextBtn')?.click()}finally{setTimeout(()=>{btn.disabled=selectedManualCount()===0;btn.textContent='선택한 조건으로 검색하기 →'},900)}}}
  function parseWon(text){const n=Number(String(text||'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}function parseKm(text){const n=Number(String(text||'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:0}function fmtWon(n){return `${Math.round(n||0).toLocaleString('ko-KR')}원`}
  function estimateToll(km){const s=readVehicle();const one=Math.max(0,km/2);if(one<40)return 0;const base=(900+one*44.3)*2;return Math.max(0,Math.round((base*(s?.tollDiscount?.5:1))/100)*100)}
  function enhanceTripSummaryToll(){const summary=$('#tripSummary');if(!summary||!summary.querySelector('.metric-grid'))return;const metrics=[...summary.querySelectorAll('.metric')],find=l=>metrics.find(m=>m.querySelector('span')?.textContent.trim()===l),dm=find('왕복 거리'),tm=find('통행료')||find('예상 통행료'),total=find('교통비 합계'),fuel=find('기름값');if(!dm||!tm)return;const distance=parseKm(dm.querySelector('strong')?.textContent),estimated=estimateToll(distance),label=tm.querySelector('span'),value=tm.querySelector('strong');if(label)label.textContent='예상 통행료';if(value)value.textContent=estimated?`약 ${fmtWon(estimated)}`:'0원';if(total){const f=parseWon(fuel?.querySelector('strong')?.textContent);total.querySelector('strong').textContent=fmtWon(f+estimated)}}
  function observeTripSummary(){const summary=$('#tripSummary');if(!summary)return;new MutationObserver(()=>requestAnimationFrame(enhanceTripSummaryToll)).observe(summary,{childList:true,subtree:true,characterData:true});enhanceTripSummaryToll()}
  function runtimeHealthCheck(){document.querySelectorAll('#categoryChoices button,#directionChoices button,.progress-step').forEach(b=>b.type='button')}
  function bootChrome(){enhanceLandingSurface();applyUnifiedIcons();addCoverMotion();enhanceTopbar();addBottomNav();observeLanding();observeCourseDetailOrder();addManualSearchButton();observeTripSummary();createVehicleSetup();watchFirstLocation();applyVehicleSettings();runtimeHealthCheck();const footer=$('.app-version-footer');if(footer)footer.textContent='TRIP QUEST · v0.36';document.documentElement.classList.add('tq-chrome-ready')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootChrome,{once:true});else bootChrome();
})();