import { $, esc, toast } from '../core/dom.js';
import { MOOD_OPTIONS } from '../services/place-search-service.js';

function distanceLabel(km){
  const n=Number(km);
  if(!Number.isFinite(n))return '';
  return n<1?Math.round(n*1000)+'m':n.toFixed(n<10?1:0)+'km';
}

export function initLinkedPlaceSearch({travelService}){
  let current={mode:'cafe',anchor:null,moods:[],radiusKm:3};

  function ensureSheet(){
    let overlay=$('#linkedPlaceOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='linkedPlaceOverlay';
    overlay.className='tq-linked-place-overlay';
    overlay.hidden=true;
    overlay.innerHTML=`
      <section class="tq-linked-place-sheet" role="dialog" aria-modal="true" aria-labelledby="linkedPlaceTitle">
        <div class="tq-sheet-handle" aria-hidden="true"></div>
        <header class="tq-linked-place-head">
          <div><small id="linkedPlaceCode">CAFE ADD</small><h2 id="linkedPlaceTitle">코스 주변 카페 추가</h2><p id="linkedPlaceAnchor">—</p></div>
          <button id="linkedPlaceClose" type="button" aria-label="닫기">×</button>
        </header>
        <div class="tq-linked-place-body">
          <section>
            <div class="tq-linked-section-head"><strong>MOOD</strong><span id="linkedMoodCount">0 / 2</span></div>
            <div id="linkedMoodChoices" class="tq-mood-choices"></div>
          </section>
          <section>
            <div class="tq-linked-section-head"><strong>거리</strong><span>코스 마지막 지점 기준</span></div>
            <div id="linkedRadiusChoices" class="tq-linked-radius">
              <button data-radius="1">1km</button><button data-radius="2">2km</button><button data-radius="3" class="active">3km</button><button data-radius="5">5km</button><button data-radius="10">10km</button>
            </div>
          </section>
          <label class="tq-linked-query"><span id="linkedQueryLabel">카페 키워드</span><input id="linkedPlaceQuery" type="search" placeholder="예: 디저트, 로스터리, 오션뷰" /></label>
          <button id="linkedPlaceSearchBtn" class="btn primary" type="button">주변 CAFE 찾기</button>
          <div id="linkedPlaceResults" class="tq-linked-results"></div>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    $('#linkedPlaceClose').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    $('#linkedMoodChoices').onclick=e=>{
      const button=e.target.closest('[data-mood]');if(!button)return;
      const value=button.dataset.mood;
      if(current.moods.includes(value))current.moods=current.moods.filter(x=>x!==value);
      else if(current.moods.length>=2){toast('무드는 최대 2개까지 선택할 수 있습니다.');return}
      else current.moods=[...current.moods,value];
      renderControls();
    };
    $('#linkedRadiusChoices').onclick=e=>{
      const button=e.target.closest('[data-radius]');if(!button)return;
      current.radiusKm=Number(button.dataset.radius)||3;
      renderControls();
    };
    $('#linkedPlaceSearchBtn').onclick=search;
    return overlay;
  }

  function renderControls(){
    const mode=current.mode;
    const code=mode==='food'?'FOOD':'CAFE';
    const options=MOOD_OPTIONS[mode]||[];
    const choices=$('#linkedMoodChoices');
    if(choices)choices.innerHTML=options.map(value=>'<button type="button" data-mood="'+esc(value)+'" class="'+(current.moods.includes(value)?'active':'')+'">'+esc(value)+'</button>').join('');
    const count=$('#linkedMoodCount');if(count)count.textContent=current.moods.length+' / 2';
    document.querySelectorAll('#linkedRadiusChoices [data-radius]').forEach(b=>b.classList.toggle('active',Number(b.dataset.radius)===current.radiusKm));
    const codeEl=$('#linkedPlaceCode'),title=$('#linkedPlaceTitle'),label=$('#linkedQueryLabel'),input=$('#linkedPlaceQuery'),searchBtn=$('#linkedPlaceSearchBtn');
    if(codeEl)codeEl.textContent=code+' ADD';
    if(title)title.textContent=mode==='food'?'코스 주변 맛집 추가':'코스 주변 카페 추가';
    if(label)label.textContent=mode==='food'?'음식·식당 키워드':'카페 키워드';
    if(input)input.placeholder=mode==='food'?'예: 국밥, 회, 로컬 맛집':'예: 디저트, 로스터리, 오션뷰';
    if(searchBtn)searchBtn.textContent='주변 '+code+' 찾기';
    const anchor=$('#linkedPlaceAnchor');
    if(anchor)anchor.textContent=(current.anchor?.name||'코스 마지막 지점')+' · '+current.radiusKm+'km';
  }

  async function search(){
    if(!current.anchor)return;
    const resultEl=$('#linkedPlaceResults'),button=$('#linkedPlaceSearchBtn');
    if(button){button.disabled=true;button.textContent='검색 중…'}
    if(resultEl)resultEl.innerHTML='<div class="tq-place-loading">코스 주변 실제 장소를 찾고 있습니다…</div>';
    try{
      const query=$('#linkedPlaceQuery')?.value.trim()||'';
      const result=await travelService.searchPlaces({mode:current.mode,query,region:current.anchor,radiusMinKm:0,radiusKm:current.radiusKm,moods:current.moods});
      const items=result.items||[];
      if(!items.length){
        resultEl.innerHTML='<div class="tq-place-empty"><strong>현재 데이터에서 결과가 부족합니다.</strong><p>거리나 키워드를 바꿔 다시 검색해보세요.</p><span>'+esc(result.source||'검색 데이터')+'</span></div>';
      }else{
        resultEl.innerHTML=items.map((item,index)=>'<button type="button" data-result-index="'+index+'" class="tq-linked-result"><b>'+String(index+1).padStart(2,'0')+'</b><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.address||'주소 정보 없음')+'</small><i>'+distanceLabel(item.distanceKm)+' · 검색 적합도 '+Math.round(Number(item.popularityScore)||0)+'</i></span><em>지도</em></button>').join('');
        resultEl.onclick=e=>{
          const row=e.target.closest('[data-result-index]');if(!row)return;
          const item=items[Number(row.dataset.resultIndex)];
          if(item?.detailUrl)window.open(item.detailUrl,'_blank','noopener');
        };
      }
    }catch(error){
      resultEl.innerHTML='<div class="tq-place-empty error"><strong>연계 검색에 실패했습니다.</strong><p>'+esc(error.message||'잠시 후 다시 시도해주세요.')+'</p></div>';
    }finally{
      if(button){button.disabled=false;button.textContent='주변 '+(current.mode==='food'?'FOOD':'CAFE')+' 찾기'}
    }
  }

  function open(detail={}){
    ensureSheet();
    current={mode:detail.mode==='food'?'food':'cafe',anchor:detail.anchor||null,moods:[],radiusKm:3};
    $('#linkedPlaceQuery').value='';
    $('#linkedPlaceResults').innerHTML='';
    renderControls();
    $('#linkedPlaceOverlay').hidden=false;
    document.body.classList.add('tq-modal-open');
  }
  function close(){
    const overlay=$('#linkedPlaceOverlay');if(overlay)overlay.hidden=true;
    document.body.classList.remove('tq-modal-open');
  }

  window.addEventListener('tripquest:linked-place-search',e=>open(e.detail||{}));
  return {open,close};
}
