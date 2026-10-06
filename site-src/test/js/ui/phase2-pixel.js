// TRIP QUEST · Pixel Phase 2
// Visual-only enhancement. Does not change search/auth/course logic.
const NS='http://www.w3.org/2000/svg';

const PATTERNS={
  user:[
    '....####....',
    '...######...',
    '...######...',
    '....####....',
    '............',
    '..########..',
    '.##########.',
    '.##########.',
    '.##########.',
    '..########..',
    '............',
    '............'
  ],
  lock:[
    '....####....',
    '...######...',
    '..##....##..',
    '..##....##..',
    '..########..',
    '.##########.',
    '.####..####.',
    '.####..####.',
    '.##########.',
    '.##########.',
    '............',
    '............'
  ],
  mail:[
    '............',
    '.##########.',
    '.#........#.',
    '.##......##.',
    '.#.##..##.#.',
    '.#...##...#.',
    '.#........#.',
    '.#........#.',
    '.##########.',
    '............',
    '............',
    '............'
  ],
  tag:[
    '.######.....',
    '.#....##....',
    '.#..#..##...',
    '.#......##..',
    '.##......##.',
    '..##......#.',
    '...##.....#.',
    '....##....#.',
    '.....######.',
    '............',
    '............',
    '............'
  ],
  pin:[
    '....####....',
    '...######...',
    '..########..',
    '..###..###..',
    '..###..###..',
    '..########..',
    '...######...',
    '....####....',
    '....####....',
    '.....##.....',
    '............',
    '............'
  ],
  play:[
    '..##........',
    '..####......',
    '..######....',
    '..########..',
    '..######....',
    '..####......',
    '..##........',
    '............',
    '............',
    '............',
    '............',
    '............'
  ],
  search:[
    '..######....',
    '.##....##...',
    '.##....##...',
    '.##....##...',
    '..######....',
    '.....##.....',
    '......##....',
    '.......##...',
    '............',
    '............',
    '............',
    '............'
  ],
  star:[
    '.....##.....',
    '.....##.....',
    '.##..##..##.',
    '..########..',
    '...######...',
    '..########..',
    '.###.##.###.',
    '.##......##.',
    '............',
    '............',
    '............',
    '............'
  ],
  gear:[
    '...##..##...',
    '..########..',
    '.###.##.###.',
    '###......###',
    '##...##...##',
    '##..####..##',
    '###..##..###',
    '.###....###.',
    '..########..',
    '...##..##...',
    '............',
    '............'
  ],
  beach:[
    '.....##.....',
    '...######...',
    '..########..',
    '.##########.',
    '.....##.....',
    '.....##.....',
    '##..####..##',
    '.##......##.',
    '..########..',
    '............',
    '............',
    '............'
  ],
  cafe:[
    '.########...',
    '.#......#...',
    '.#......###.',
    '.#......#.#.',
    '.#......###.',
    '.########...',
    '..######....',
    '.########...',
    '............',
    '............',
    '............',
    '............'
  ],
  food:[
    '..##..##....',
    '..##..##....',
    '..##..##....',
    '..######....',
    '....##......',
    '....##..##..',
    '....##..##..',
    '....##..##..',
    '....##..##..',
    '............',
    '............',
    '............'
  ],
  city:[
    '.###...###..',
    '.#.#...#.#..',
    '.###.#####..',
    '.#.#.#.#.#..',
    '.###.#####..',
    '.#.#.#.#.#..',
    '.###.#####..',
    '.#.#.#.#.#..',
    '############',
    '............',
    '............',
    '............'
  ],
  mountain:[
    '.....##.....',
    '....####....',
    '...######...',
    '..###..###..',
    '.###....###.',
    '###..##..###',
    '##..####..##',
    '############',
    '............',
    '............',
    '............',
    '............'
  ],
  museum:[
    '....####....',
    '..########..',
    '.##########.',
    '############',
    '..##.##.##..',
    '..##.##.##..',
    '..##.##.##..',
    '..##.##.##..',
    '.##########.',
    '############',
    '............',
    '............'
  ],
  shop:[
    '.##########.',
    '.#.#.#.#.#..',
    '.##########.',
    '..########..',
    '..#......#..',
    '..#..##..#..',
    '..#..##..#..',
    '..########..',
    '............',
    '............',
    '............',
    '............'
  ],
  route:[
    '.###........',
    '.#.#........',
    '.###........',
    '..#.........',
    '..######....',
    '.......#....',
    '.......#....',
    '....######..',
    '....#.......',
    '....###.....',
    '............',
    '............'
  ],
  clock:[
    '....####....',
    '..########..',
    '.##......##.',
    '.##..##..##.',
    '.##..##..##.',
    '.##..####.#.',
    '.##......##.',
    '..########..',
    '....####....',
    '............',
    '............',
    '............'
  ],
  car:[
    '...######...',
    '..########..',
    '.##.####.##.',
    '############',
    '##........##',
    '############',
    '..##....##..',
    '..##....##..',
    '............',
    '............',
    '............',
    '............'
  ],
  spark:[
    '.....##.....',
    '.....##.....',
    '..##.##.##..',
    '...######...',
    '############',
    '...######...',
    '..##.##.##..',
    '.....##.....',
    '.....##.....',
    '............',
    '............',
    '............'
  ],
  back:[
    '.....##.....',
    '....##......',
    '...##.......',
    '..########..',
    '...##.......',
    '....##......',
    '.....##.....',
    '............',
    '............',
    '............',
    '............',
    '............'
  ]
};

function sprite(name, extra=''){
  const pattern=PATTERNS[name]||PATTERNS.spark;
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 12 12');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  svg.setAttribute('shape-rendering','crispEdges');
  svg.classList.add('p2-sprite');
  if(extra) extra.split(/\s+/).filter(Boolean).forEach(c=>svg.classList.add(c));

  pattern.forEach((row,y)=>{
    let x=0;
    while(x<row.length){
      if(row[x]!=='#'){x++;continue}
      let end=x+1;
      while(end<row.length&&row[end]==='#')end++;
      const r=document.createElementNS(NS,'rect');
      r.setAttribute('x',String(x));
      r.setAttribute('y',String(y));
      r.setAttribute('width',String(end-x));
      r.setAttribute('height','1');
      r.setAttribute('fill','currentColor');
      svg.appendChild(r);
      x=end;
    }
  });
  return svg;
}

function fieldIcon(input,name){
  const label=input?.closest('label');
  const cap=label?.querySelector(':scope > span');
  if(!cap||cap.dataset.p2Icon)return;
  cap.dataset.p2Icon=name;
  cap.prepend(sprite(name,'p2-sprite-sm'));
}

function placeIconName(text=''){
  const t=text.replace(/\s+/g,'');
  if(/해수욕|바다|해변|해양/.test(t))return'beach';
  if(/카페|커피|디저트/.test(t))return'cafe';
  if(/맛집|음식|미식|시장/.test(t))return'food';
  if(/산|숲|자연|공원/.test(t))return'mountain';
  if(/뮤지엄|미술|박물|전시|문화/.test(t))return'museum';
  if(/쇼핑|소품|상점|몰/.test(t))return'shop';
  if(/번화|핫플|거리|도심|야경/.test(t))return'city';
  if(/체험|액티비티/.test(t))return'spark';
  return'pin';
}

function decoratePlaceButton(btn){
  if(!btn||btn.dataset.p2Decorated)return;
  btn.dataset.p2Decorated='1';
  const label=btn.textContent.trim();
  btn.textContent='';
  const iconWrap=document.createElement('span');
  iconWrap.className='p2-icon-wrap';
  iconWrap.appendChild(sprite(placeIconName(label),'p2-sprite-sm'));
  const text=document.createElement('span');
  text.className='p2-chip-label';
  text.textContent=label;
  btn.append(iconWrap,text);
}

function decoratePlaces(){
  document.querySelectorAll('#placeChoices button').forEach(decoratePlaceButton);
}

function replaceMainButtonIcon(btn,name){
  if(!btn||btn.dataset.p2Sprite)return;
  btn.dataset.p2Sprite=name;
  btn.querySelectorAll('svg.tq-icon').forEach(x=>x.classList.add('p2-visually-hidden-svg'));
  btn.prepend(sprite(name,'p2-sprite-lg'));
}

function decorateBottomNav(){
  const nav=document.querySelector('.tq-bottom-nav');
  if(!nav)return;
  const map={explore:'search',keep:'star',settings:'gear'};
  nav.querySelectorAll('button[data-tab]').forEach(btn=>{
    if(btn.dataset.p2Nav)return;
    btn.dataset.p2Nav='1';
    const i=btn.querySelector('i');
    if(!i)return;
    i.querySelectorAll('svg').forEach(x=>x.classList.add('p2-visually-hidden-svg'));
    i.prepend(sprite(map[btn.dataset.tab]||'spark'));
  });
}

function decorateStatic(){
  document.documentElement.classList.add('phase2-pixel-ready');
  document.documentElement.dataset.pixelPhase='2';

  fieldIcon(document.querySelector('#loginId'),'mail');
  fieldIcon(document.querySelector('#loginPassword'),'lock');
  fieldIcon(document.querySelector('#signupNickname'),'tag');
  fieldIcon(document.querySelector('#signupEmail'),'mail');
  fieldIcon(document.querySelector('#signupPassword'),'lock');
  fieldIcon(document.querySelector('#signupPasswordConfirm'),'lock');

  replaceMainButtonIcon(document.querySelector('#mainLocateBtn'),'play');
  replaceMainButtonIcon(document.querySelector('#mainManualBtn'),'pin');

  const sectionStrong=document.querySelector('.selector-section-head strong');
  if(sectionStrong&&!sectionStrong.dataset.p2Icon){
    sectionStrong.dataset.p2Icon='1';
    sectionStrong.prepend(sprite('pin','p2-sprite-sm'));
  }
  decoratePlaces();
  decorateBottomNav();
}

let scheduled=false;
function scheduleDecorate(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    decorateStatic();
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',decorateStatic,{once:true});
}else{
  decorateStatic();
}

const observer=new MutationObserver(scheduleDecorate);
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('tripquest:phase2-refresh',scheduleDecorate);
