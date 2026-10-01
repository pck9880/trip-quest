const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const state={step:1,origin:null,targetKm:100,direction:'전체',categories:['관광지'],recommendations:[],selected:null,selectedCourse:null,selectedCourseData:null,config:null,map:null,markers:[],routeLine:null,courseMap:null,courseMarkers:[],courseRouteLine:null,aiBusy:false,installPrompt:null,sharedTrip:null,sharedPending:false,resultSort:'popular',lastSearchMode:'ai',lastAIMessage:'',activeDistanceBand:null};
const stepMeta={
  1:['STEP 1 / 5','어디에서 출발하나요?','현재 위치를 사용하거나 출발지를 직접 검색하세요.'],
  2:['STEP 2 / 5','어떤 여행을 원하나요?','거리, 방향, 취향을 선택하세요. 여러 취향을 함께 선택할 수 있습니다.'],
  3:['STEP 3 / 5','여행 가능한 시간을 알려주세요.','출발과 귀가 시간을 기준으로 현실적인 후보를 계산합니다.'],
  4:['STEP 4 / 5','추천지를 비교해보세요.','추천 이유와 이동시간을 보고 원하는 여행지를 선택하세요.'],
  5:['STEP 5 / 5','날씨에 맞는 코스를 골라보세요.','선택한 여행지의 경로·비용·날씨를 바탕으로 A/B/C 코스를 만듭니다.']
};
const categoryLabels=['카페','관광지','바다','산','뮤지엄','체험마을','소품샵','공원','맛집','전통시장','온천','캠핑'];
const POPULARITY_HINTS={
  '부산 해운대해수욕장':100,'경주 불국사':98,'전주 한옥마을':96,'순천만국가정원':95,'여수 오동도':94,
  '통영 동피랑벽화마을':92,'남해 독일마을':91,'포항 호미곶':90,'강릉 경포해변':90,'보령 대천해수욕장':88,
  '울산 대왕암공원':87,'담양 죽녹원':86,'안동 하회마을':85,'거제 바람의언덕':84,'부산 감천문화마을':83,
  '부산 다대포해수욕장':80,'울산 슬도':77,'사천 비토섬':72,'통영 달아공원':73,'순천 와온해변':74,
  '광양 배알도수변공원':70,'하동 평사리공원':71,'부산 회동수원지':72,'인천 소래습지생태공원':76
};
function placePopularity(p){
  const base=POPULARITY_HINTS[p.name];
  if(base!=null)return base;
  const byCategory={바다:72,공원:68,산:67,뮤지엄:66,관광지:65,체험마을:62,전통시장:61,캠핑:58,온천:58,카페:56,맛집:56,소품샵:54};
  return byCategory[p.category]||55;
}
function sortRecommendations(mode=state.resultSort,rerender=true){
  state.resultSort=mode||'popular';
  const cmp=state.resultSort==='far'
    ?(a,b)=>b.distanceKm-a.distanceKm
    :state.resultSort==='near'
      ?(a,b)=>a.distanceKm-b.distanceKm
      :(a,b)=>((placePopularity(b)*.55)+(b.score||0)*.45)-((placePopularity(a)*.55)+(a.score||0)*.45);
  state.recommendations.sort(cmp);
  $$('.result-sort button').forEach(b=>b.classList.toggle('active',b.dataset.sort===state.resultSort));
  if(rerender){renderRanking();drawMap()}
}


function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtWon(n){return `${Math.round(n||0).toLocaleString('ko-KR')}원`}
function fmtMin(m){const h=Math.floor((m||0)/60),min=Math.round((m||0)%60);return h?`${h}시간 ${min}분`:`${min}분`}
function fmtKm(k){return `${(k||0).toFixed(1)} km`}
function setText(sel,t){const el=$(sel);if(el)el.textContent=t}
function loading(on){document.body.classList.toggle('loading',on)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
const RAW_PLACES=[
['진주성','관광지',35.1896,128.0780],['경상남도수목원','공원',35.1628,128.3050],['사천바다케이블카','관광지',34.9308,128.0437],['남해 독일마을','관광지',34.7996,128.0390],['상주은모래비치','바다',34.7238,127.9878],['통영 동피랑벽화마을','관광지',34.8448,128.4241],['통영 미륵산','산',34.8278,128.4163],['거제 바람의언덕','바다',34.7446,128.6639],['거제 포로수용소유적공원','뮤지엄',34.8917,128.6218],['순천만국가정원','공원',34.9280,127.5090],['순천만습지','관광지',34.8854,127.5095],['여수 오동도','바다',34.7441,127.7655],['여수 아쿠아플라넷','뮤지엄',34.7458,127.7482],['광양 매화마을','관광지',35.0880,127.7060],['하동 최참판댁','관광지',35.1570,127.6942],['합천 해인사','관광지',35.8012,128.0980],['합천 영상테마파크','체험마을',35.5698,128.1675],['산청 동의보감촌','체험마을',35.4158,127.8303],['지리산 천왕봉권역','산',35.3371,127.7308],['함양 상림공원','공원',35.5214,127.7242],['거창 수승대','관광지',35.7383,127.8338],['창원 주남저수지','관광지',35.3075,128.6773],['창원 진해루','바다',35.1478,128.6986],['김해 클레이아크미술관','뮤지엄',35.2500,128.7458],['부산 해운대해수욕장','바다',35.1587,129.1604],['부산 국립해양박물관','뮤지엄',35.0786,129.0803],['부산 감천문화마을','체험마을',35.0975,129.0106],['울산 대왕암공원','바다',35.4926,129.4393],['경주 불국사','관광지',35.7900,129.3318],['경주 국립경주박물관','뮤지엄',35.8292,129.2285],['대구 수성못','공원',35.8297,128.6179],['대구미술관','뮤지엄',35.8274,128.6746],['전주 한옥마을','관광지',35.8150,127.1530],['전주 남부시장','전통시장',35.8120,127.1470],['담양 죽녹원','공원',35.3254,126.9860],['광주 국립아시아문화전당','뮤지엄',35.1468,126.9200],['대전 국립중앙과학관','뮤지엄',36.3742,127.3779],['대전 한밭수목원','공원',36.3680,127.3880],['공주 공산성','관광지',36.4624,127.1278],['보령 대천해수욕장','바다',36.3054,126.5084],['군산 근대역사박물관','뮤지엄',35.9884,126.7115],['변산반도 채석강','바다',35.6251,126.4695],['제천 의림지','관광지',37.1723,128.2106],['안동 하회마을','체험마을',36.5394,128.5180],['포항 호미곶','바다',36.0760,129.5685],['강릉 경포해변','바다',37.8058,128.9071],['속초 영금정','바다',38.2071,128.5992],['춘천 제이드가든','공원',37.8458,127.5364],['서울 국립중앙박물관','뮤지엄',37.5239,126.9803],['인천 을왕리해수욕장','바다',37.4475,126.3720],
['부산 다대포해수욕장','바다',35.0467,128.9664],['부산 오륙도해맞이공원','공원',35.1035,129.1220],['부산 회동수원지','공원',35.2385,129.1218],
['울산 슬도','바다',35.4817,129.4307],['울산 간절곶','바다',35.3590,129.3606],['경주 주상절리전망대','바다',35.6764,129.4750],
['포항 이가리닻전망대','바다',36.2057,129.3947],['창원 저도연육교','바다',35.1026,128.5607],['사천 비토섬','바다',34.9745,127.9786],
['남해 설리해수욕장','바다',34.7134,128.0267],['남해 섬이정원','공원',34.7654,127.8886],['거제 구조라해수욕장','바다',34.8094,128.6907],
['통영 달아공원','공원',34.7688,128.3948],['고성 상족암군립공원','공원',34.9082,128.1465],['순천 와온해변','바다',34.8455,127.5088],
['여수 무슬목해변','바다',34.6358,127.7762],['광양 배알도수변공원','공원',34.9377,127.7295],['하동 평사리공원','공원',35.1451,127.7042],
['대구 사문진나루터','공원',35.8060,128.4810],['세종 금강보행교','공원',36.4802,127.2898],['청주 청남대','공원',36.4624,127.4902],
['보령 무창포해수욕장','바다',36.2480,126.5360],['군산 선유도해수욕장','바다',35.8150,126.4112],['서천 마량리동백나무숲','공원',36.1354,126.5051],
['고창 구시포해수욕장','바다',35.4450,126.4364],['담양 메타세쿼이아길','공원',35.3224,126.9871],['전주 덕진공원','공원',35.8473,127.1245],
['강릉 안목해변','바다',37.7716,128.9474],['양양 남애항','바다',37.9454,128.7890],['춘천 의암호스카이워크','공원',37.8578,127.6894],
['인천 소래습지생태공원','공원',37.4112,126.7473],['서울 북서울꿈의숲','공원',37.6207,127.0410]
].map((p,i)=>({id:'local-'+i,name:p[0],category:p[1],lat:p[2],lng:p[3],address:'',url:'',source:'local'}));
const DIR_DEG={북:0,'북동':45,동:90,'남동':135,남:180,'남서':225,서:270,'북서':315};
const rad=d=>d*Math.PI/180;
function geoKm(a,b){const R=6371,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function geoBearing(a,b){const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lng-a.lng),y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function degDiff(a,b){return Math.abs(((a-b+540)%360)-180)}
function approxRoute(a,b){const distanceKm=geoKm(a,b)*1.23,avg=distanceKm<20?38:distanceKm<80?52:68;return {distanceKm,timeMin:distanceKm/avg*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'estimate'}}
function weatherText(code){if(code===0)return '맑음';if([1,2].includes(code))return '대체로 맑음';if(code===3)return '흐림';if([45,48].includes(code))return '안개';if([51,53,55,56,57].includes(code))return '이슬비';if([61,63,65,66,67,80,81,82].includes(code))return '비';if([71,73,75,77,85,86].includes(code))return '눈';if([95,96,99].includes(code))return '뇌우';return '변동'}
async function clientWeather(lat,lng){try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=Asia%2FSeoul&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability,weather_code,temperature_2m,wind_speed_10m&forecast_days=3`;const r=await fetch(u);if(!r.ok)throw 0;const j=await r.json();const c=j.current||{};return {current:{temperature_2m:c.temperature_2m,apparent_temperature:c.apparent_temperature,weather_code:c.weather_code,condition:weatherText(c.weather_code),wind_speed_10m:c.wind_speed_10m,precipitation_probability:j.hourly?.precipitation_probability?.[0]||0,source:'open-meteo'},hourly:(j.hourly?.time||[]).map((t,i)=>({time:t,temperature_2m:j.hourly.temperature_2m[i],precipitation_probability:j.hourly.precipitation_probability[i],weather_code:j.hourly.weather_code[i],condition:weatherText(j.hourly.weather_code[i]),wind_speed_10m:j.hourly.wind_speed_10m[i],source:'open-meteo'}))}}catch{return {current:{source:'fallback',condition:'날씨 확인 필요',temperature_2m:null,apparent_temperature:null,wind_speed_10m:null,precipitation_probability:null},hourly:[]}}}
function scheduleWindow(dep,ret){const a=new Date(dep),b=new Date(ret);return !isNaN(a)&&!isNaN(b)&&b>a?(b-a)/60000:null}
function recommendationRegion(name=''){
  const regions=['서울','부산','대구','인천','광주','대전','울산','진주','사천','통영','거제','남해','여수','순천','광양','하동','합천','산청','함양','거창','창원','김해','경주','전주','담양','공주','보령','군산','제천','안동','포항','강릉','속초','춘천','제주'];
  return regions.find(r=>name.startsWith(r)||name.includes(r))||name.split(/\s+/)[0]||'기타';
}
function diversifyRecommendations(items,limit=10){
  const picked=[],regions=new Map(),cats=new Map();
  for(const p of items){
    const region=recommendationRegion(p.name),rc=regions.get(region)||0,cc=cats.get(p.category)||0;
    if(rc>=2||cc>=4)continue;
    picked.push(p);regions.set(region,rc+1);cats.set(p.category,cc+1);
    if(picked.length>=limit)break;
  }
  if(picked.length<Math.min(limit,items.length)){
    for(const p of items){if(!picked.includes(p)){picked.push(p);if(picked.length>=limit)break}}
  }
  return picked;
}
function localRecommend(body){
  const o=body.origin,rawTarget=Number(body.targetKm),target=Number.isFinite(rawTarget)?Math.max(0,Math.min(400,rawTarget)):100,radiusKm=target===0?10:target,cats=body.categories||[],dir=body.direction||'전체',
    avail=scheduleWindow(body.departure,body.returnTime),focus=(body.focusQuery||'').trim().toLowerCase(),
    profile=body.semanticProfile||null;

  const all=RAW_PLACES.map(p=>({...p,distanceKm:geoKm(o,p),bearing:geoBearing(o,p)}));
  let arr=[...all];

  const hardCats=profile?.hardCategories||[];
  const preferredCats=profile?.preferredCategories||[];
  const band=body.distanceBand&&Number.isFinite(Number(body.distanceBand.min))&&Number.isFinite(Number(body.distanceBand.max))
    ?{min:Math.max(0,Number(body.distanceBand.min)),max:Math.min(400,Number(body.distanceBand.max))}
    :null;
  const distanceRule={km:radiusKm,mode:'max',fromSlider:true};

  if(focus){
    const tokens=focus.split(/\s+/).filter(Boolean);
    const direct=arr.filter(p=>tokens.some(t=>p.name.toLowerCase().includes(t)));
    if(direct.length){const centers=direct;arr=arr.filter(p=>centers.some(c=>geoKm(c,p)<=40)||direct.includes(p))}
  } else {
    arr=band?arr.filter(p=>p.distanceKm>=band.min&&p.distanceKm<=band.max):arr.filter(p=>p.distanceKm<=radiusKm);

    if(dir!=='전체'&&DIR_DEG[dir]!=null)arr=arr.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=55);

    if(hardCats.length){
      arr=arr.filter(p=>hardCats.includes(p.category));
    }else if(profile&&preferredCats.length){
      const preferred=arr.filter(p=>preferredCats.includes(p.category));
      arr=preferred.length>=3?preferred:[...preferred,...arr.filter(p=>!preferredCats.includes(p.category))];
    }else if(!profile&&cats.length){
      arr=arr.filter(p=>cats.includes(p.category));
    }
  }

  // AI 검색은 조건이 너무 좁아 0건이 되면, 의도는 유지한 채 가장 가까운 대안을 보충한다.
  let relaxed=false;
  if(profile&&arr.length<4&&!focus){
    let fallback=band?all.filter(p=>p.distanceKm>=band.min&&p.distanceKm<=band.max):all.filter(p=>p.distanceKm<=radiusKm);
    if(hardCats.length)fallback=fallback.filter(p=>hardCats.includes(p.category));
    else if(preferredCats.length)fallback=fallback.filter(p=>preferredCats.includes(p.category));
    if(dir!=='전체'&&DIR_DEG[dir]!=null){
      const sameDir=fallback.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=75);
      if(sameDir.length)fallback=sameDir;
    }
    fallback.sort((a,b)=>{
      const da=a.distanceKm;
      const db=b.distanceKm;
      return da-db;
    });
    for(const p of fallback){
      if(!arr.some(x=>x.id===p.id)){arr.push({...p,relaxed:true});relaxed=true}
      if(arr.length>=8)break;
    }
  }

  const matched=profile?.matches||[];
  const ranked=arr.map(p=>{
    const route=approxRoute(o,p),round=route.timeMin*2;
    const semanticHits=matched.filter(x=>(x.categories||[]).includes(p.category)&&x.kind!=='amenity'&&x.kind!=='condition');
    const hardFit=hardCats.includes(p.category)?42:0;
    const preferredFit=preferredCats.includes(p.category)?18:0;
    const semantic=Math.min(42,semanticHits.reduce((sum,x)=>sum+(x.weight||8),0));
    const cat=(!cats.length||cats.includes(p.category))?8:0;
    const dist=Math.max(0,24-(p.distanceKm/Math.max(10,radiusKm))*16);
    const time=avail==null?8:(round<=avail?18:Math.max(0,18-(round-avail)/15));
    const focusBonus=focus?24:0;
    const quietPenalty=profile?.flags?.quiet&&['관광지','전통시장','체험마을'].includes(p.category)?-14:0;
    const genericPenalty=profile&&matched.length&&!semanticHits.length&&!hardFit&&!preferredFit?-18:0;
    const relaxedPenalty=p.relaxed?-16:0;
    const feasible=avail==null?true:round<=avail;
    const outsideMax=false;
    const why=[];

    if(hardFit&&semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+'을 우선 반영');
    else if(semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+' 조건과 잘 맞음');
    if(profile?.flags?.quiet&&['바다','산','공원','캠핑'].includes(p.category))why.push('한적한 분위기 선호를 자연형 장소에 반영');
    if(profile?.flags?.wantsCafe)why.push('목적지 선택 후 4km 이내 카페 검색으로 연결');
    why.push(band?`선택 거리 ${target}km 기준 ${Math.round(band.min)}~${Math.round(band.max)}km 범위`:target===0?'현재 위치 주변 10km 범위':'내 위치 기준 '+radiusKm+'km 이내');
    if(feasible&&avail!=null)why.push('설정한 귀가시간 안에 이동 가능');
    if(!why.length)why.push(`${p.category||'여행지'} 유형과 이동거리를 함께 고려`);

    return {...p,routePreview:route,roundTripDriveMin:round,availableMin:avail,feasible,
      aiReason:why.slice(0,3).join(' · '),relaxedResult:!!p.relaxed,
      semanticIntent:(profile?.keywords||[]).join(','),
      score:Math.min(99,Math.max(1,Math.round(18+hardFit+preferredFit+semantic+cat+dist+time+focusBonus+quietPenalty+genericPenalty+relaxedPenalty)))}
  }).sort((a,b)=>b.score-a.score);

  return diversifyRecommendations(ranked,10);
}
async function localGeocode(q){const x=q.trim().toLowerCase();const local=RAW_PLACES.filter(p=>p.name.toLowerCase().includes(x)||x.includes(p.name.split(' ')[0].toLowerCase())).slice(0,5).map(p=>({name:p.name,address:'내장 여행지 데이터',lat:p.lat,lng:p.lng}));try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&countrycodes=kr&accept-language=ko`);if(r.ok){const j=await r.json();const rem=(j||[]).map(d=>({name:String(d.display_name||'').split(',')[0],address:d.display_name||'',lat:Number(d.lat),lng:Number(d.lon)}));if(rem.length)return rem}}catch{}return local}
function selectWeatherAt(w,iso){if(!w?.hourly?.length)return w.current;const t=new Date(iso).getTime();if(!Number.isFinite(t))return w.current;let best=w.hourly[0],d=Infinity;for(const x of w.hourly){const dd=Math.abs(new Date(x.time).getTime()-t);if(dd<d){best=x;d=dd}}return best}
function localCandidates(anchor,cats,maxLegKm){
  let pool=RAW_PLACES
    .filter(p=>p.id!==anchor.id)
    .map(p=>({...p,fromAnchorKm:approxRoute(anchor,p).distanceKm}))
    .filter(p=>p.fromAnchorKm<=maxLegKm);
  if(cats?.length){
    const preferred=pool.filter(p=>cats.includes(p.category));
    pool=[...preferred,...pool.filter(p=>!preferred.includes(p))];
  }
  return pool.sort((a,b)=>a.fromAnchorKm-b.fromAnchorKm);
}
function buildLocalChain(start,pool,maxLegKm,limit=2){
  const chosen=[],used=new Set(),remaining=[...pool];
  let current=start;
  while(chosen.length<limit){
    const options=remaining
      .filter(p=>!used.has(p.id))
      .map(p=>({p,leg:approxRoute(current,p).distanceKm}))
      .filter(x=>x.leg<=maxLegKm)
      .sort((a,b)=>a.leg-b.leg);
    if(!options.length)break;
    const next=options[0].p;
    chosen.push(next);used.add(next.id);current=next;
  }
  return chosen;
}
function coursePack(body,w){
  const d=body.destination,cats=body.categories||[];
  const rain=Number(w.precipitation_probability)>=55||['비','눈','뇌우','이슬비'].includes(w.condition);

  const walkPool=localCandidates(d,cats,1.5);
  const drivePool=localCandidates(d,cats,4);
  const indoorPool=drivePool.filter(p=>['뮤지엄','관광지','전통시장','체험마을','카페'].includes(p.category));
  const outdoorPool=drivePool.filter(p=>['바다','산','공원','관광지'].includes(p.category));

  const walkStops=buildLocalChain(d,walkPool,1.5,2);
  const nearStops=buildLocalChain(d,drivePool,4,2);
  const themedBase=rain?(indoorPool.length?indoorPool:drivePool):(outdoorPool.length?outdoorPool:drivePool);
  const themedStops=buildLocalChain(d,themedBase,4,2);

  const sets=[
    {
      id:'A',title:'WALK · 도보 코스',mode:'walk',maxLegKm:1.5,
      reason:walkStops.length?'목적지 주변을 걸어서 이어갈 수 있도록 지점 간 약 1.5km 이내로 묶었습니다.':'현재 내장 데이터에서 도보권 추가 장소가 부족해 목적지 중심으로 구성했습니다.',
      stops:[d,...walkStops]
    },
    {
      id:'B',title:'NEAR DRIVE · 근거리 차량',mode:'drive',maxLegKm:4,
      reason:nearStops.length?'차량 이동은 유지하되 각 경유 구간을 약 4km 이내로 제한했습니다.':'4km 이내 추가 장소가 부족해 먼 장소를 억지로 포함하지 않았습니다.',
      stops:[d,...nearStops]
    },
    {
      id:'C',title:rain?'RAIN · 근거리 실내':'TASTE · 근거리 취향',mode:'drive',maxLegKm:4,
      reason:themedStops.length?(rain?'비를 고려한 실내·관광 장소를 4km 이내에서 우선 연결했습니다.':'풍경·취향 장소를 4km 이내에서 우선 연결했습니다.'):'4km 이내에서 조건에 맞는 추가 장소가 부족해 목적지 중심으로 구성했습니다.',
      stops:[d,...themedStops]
    }
  ];

  return sets.map(c=>{
    let km=0,min=0,maxLocalLeg=0;
    const pts=[body.origin,...c.stops,body.origin];
    for(let i=1;i<pts.length;i++){
      const r=approxRoute(pts[i-1],pts[i]);km+=r.distanceKm;min+=r.timeMin;
    }
    for(let i=1;i<c.stops.length;i++)maxLocalLeg=Math.max(maxLocalLeg,approxRoute(c.stops[i-1],c.stops[i]).distanceKm);
    const fuel=km/11,cost=Math.round(fuel*Number(body.gasPrice||1700));
    return {...c,
      weatherFit:rain?(c.id==='C'?'높음':c.id==='A'?'낮음':'보통'):'높음',
      localRule:c.mode==='walk'?'도보 구간 약 1.5km 이내':'차량 구간 약 4km 이내',
      maxLocalLegKm:maxLocalLeg,
      route:{distanceKm:km,timeMin:min,toll:0,source:'estimate'},
      estimatedCost:{fuelCost:cost,toll:0,total:cost}
    }
  })
}
function localAI(message,context){
  const m=message.trim(),compact=m.replace(/\s+/g,''),patch={};let focus='';

  const sliderKm=Math.max(0,Math.min(400,Math.round(Number(context.targetKm??100)/10)*10));
  const distance={km:sliderKm===0?10:sliderKm,mode:'max',fromSlider:true};
  const dir=['북동','남동','남서','북서','북','동','남','서'].find(d=>m.includes(d));if(dir)patch.direction=dir;

  const semanticRules=[
    {id:'wave',label:'파도·해안',kind:'hard',weight:24,re:/파도|거친바다|바닷소리|해안|바다보고|바다보러|물멍/,categories:['바다'],reason:'파도·해안 풍경'},
    {id:'stargazing',label:'별·밤하늘',kind:'hard',weight:22,re:/별.*(보|잘)|별보기|별구경|은하수|천체|밤하늘|별사진/,categories:['산','캠핑','바다','공원'],reason:'별·밤하늘 감상'},
    {id:'sunset',label:'노을·일몰',kind:'hard',weight:18,re:/노을|일몰|석양|해질녘|선셋/,categories:['바다','산','공원'],reason:'노을·일몰 감상'},
    {id:'sunrise',label:'일출·해돋이',kind:'hard',weight:18,re:/일출|해돋이|해뜨는|선라이즈/,categories:['바다','산'],reason:'일출·해돋이 감상'},
    {id:'hiking',label:'등산·트레킹',kind:'hard',weight:22,re:/등산|산타|정상|등반|트레킹/,categories:['산'],reason:'등산·트레킹'},
    {id:'museum',label:'전시·뮤지엄',kind:'hard',weight:22,re:/박물관|미술관|뮤지엄|전시|갤러리|과학관/,categories:['뮤지엄'],reason:'전시·문화 관람'},
    {id:'market',label:'시장·로컬',kind:'hard',weight:18,re:/전통시장|야시장|시장구경/,categories:['전통시장'],reason:'로컬 시장·골목'},
    {id:'experience',label:'체험',kind:'hard',weight:18,re:/체험|만들기|공방|농촌|마을체험|직접해/,categories:['체험마을'],reason:'직접 하는 체험'},
    {id:'history',label:'역사·문화',kind:'hard',weight:16,re:/역사|문화재|고궁|성곽|사찰|절|한옥|유적/,categories:['관광지','뮤지엄','체험마을'],reason:'역사·문화 체험'},

    {id:'quiet',label:'조용·한적',kind:'mood',weight:13,re:/조용|한적|사람이?(많지않|적|없는)|사람적은|북적이지|붐비지|여유로운|한산|복잡하지/,categories:['바다','산','공원','캠핑'],reason:'조용하고 한적한 분위기'},
    {id:'relax',label:'휴식·힐링',kind:'mood',weight:12,re:/쉬고|쉬고싶|휴식|힐링|멍때리|느긋|머리식히|답답|기분전환/,categories:['바다','공원','산'],reason:'휴식·기분전환'},
    {id:'romantic',label:'감성·분위기',kind:'mood',weight:10,re:/감성|분위기좋|낭만|포근|아늑/,categories:['바다','공원','관광지'],reason:'감성적인 분위기'},
    {id:'active',label:'활동적',kind:'mood',weight:10,re:/활동적|움직이고|신나게|액티비티/,categories:['산','체험마을','공원'],reason:'활동적인 일정'},

    {id:'scenic',label:'풍경·전망',kind:'soft',weight:12,re:/전망|풍경|뷰좋|경치|절경|사진|포토|인생샷|전망대/,categories:['바다','산','공원','관광지'],reason:'풍경·전망'},
    {id:'drive',label:'드라이브',kind:'soft',weight:10,re:/드라이브|차타고|차로가|운전하며|해안도로/,categories:['바다','산','관광지'],reason:'드라이브하기 좋은 동선'},
    {id:'walk',label:'산책·걷기',kind:'soft',weight:10,re:/산책|걷고|걷기|둘레길|데크길/,categories:['공원','바다','산','관광지'],reason:'걷기·산책'},
    {id:'forest',label:'숲·자연',kind:'soft',weight:14,re:/숲|수목원|나무|자연|계곡|피톤치드/,categories:['산','공원'],reason:'숲·자연 휴식'},
    {id:'flower',label:'꽃·정원',kind:'soft',weight:12,re:/꽃|정원|수국|벚꽃|매화|단풍|억새|코스모스/,categories:['공원','관광지'],reason:'꽃·정원 풍경'},
    {id:'night',label:'야경·밤',kind:'soft',weight:11,re:/야경|밤에|밤풍경|불빛|조명/,categories:['바다','공원','관광지'],reason:'야경·밤 풍경'},
    {id:'date',label:'데이트',kind:'soft',weight:8,re:/데이트|커플|연인|둘이서/,categories:['바다','공원','관광지'],reason:'데이트 분위기'},
    {id:'family',label:'가족·아이',kind:'soft',weight:8,re:/아이랑|아이와|가족|애기|아기|어린이|부모님/,categories:['체험마을','공원','뮤지엄','관광지'],reason:'가족 동반'},
    {id:'solo',label:'혼자 여행',kind:'soft',weight:8,re:/혼자|혼여|혼자서|혼자여행/,categories:['뮤지엄','공원','바다'],reason:'혼자 머물기 좋은 여행'},
    {id:'pet',label:'반려동물',kind:'soft',weight:8,re:/강아지|반려견|반려동물|애견|댕댕/,categories:['공원','캠핑','바다'],reason:'반려동물 동반'},

    {id:'rain',label:'비 오는 날',kind:'condition',weight:0,re:/비오|비오는|비가오|비내|우천|장마|빗소리|비인데/,categories:[],reason:'비 오는 상황'},
    {id:'cold',label:'추운 날',kind:'condition',weight:0,re:/추워|추운|쌀쌀|한파|기온낮/,categories:[],reason:'추운 날씨'},
    {id:'hotweather',label:'더운 날',kind:'condition',weight:0,re:/더워|더운|폭염|무더위/,categories:[],reason:'더운 날씨'},
    {id:'indoor',label:'실내',kind:'hard',weight:18,re:/실내|비피할|춥지않|덥지않|에어컨/,categories:['뮤지엄','전통시장','체험마을','관광지'],reason:'실내 중심 일정'},

    {id:'cafe',label:'카페·커피',kind:'amenity',weight:0,re:/카페|커피|라떼|아메리카노|에스프레소|브런치|디저트|베이커리|빵집/,categories:[],reason:'카페·커피 취향'},
    {id:'warmdrink',label:'따뜻한 음료',kind:'amenity',weight:0,re:/따뜻한(라떼|커피|차|음료)|뜨거운(커피|차)|핫초코/,categories:[],reason:'따뜻한 음료'},
    {id:'food',label:'맛집·먹거리',kind:'amenity',weight:0,re:/맛집|먹거리|밥|식사|국밥|회|해산물|고기|면|분식|맛있는/,categories:[],reason:'먹거리·맛집'},
    {id:'souvenir',label:'소품·쇼핑',kind:'amenity',weight:0,re:/소품|기념품|쇼핑|편집샵|문구|굿즈/,categories:[],reason:'소품·기념품 쇼핑'}
  ];

  const matches=semanticRules.filter(r=>r.re.test(compact));
  const hardCategories=[...new Set(matches.filter(x=>x.kind==='hard').flatMap(x=>x.categories))];
  const preferredCategories=[...new Set(matches.filter(x=>['hard','mood','soft'].includes(x.kind)).flatMap(x=>x.categories))];

  // 직접 명시한 목적지 유형은 가장 강한 조건으로 취급한다. 카페/맛집은 코스 주변 편의시설로 분리한다.
  const explicitDestination=[];
  if(/바다|해변|해수욕장|바닷가|해안/.test(m))explicitDestination.push('바다');
  if(/\b산\b|산으로|산에/.test(m))explicitDestination.push('산');
  if(/공원/.test(m))explicitDestination.push('공원');
  if(/관광지/.test(m))explicitDestination.push('관광지');
  if(/박물관|미술관|뮤지엄/.test(m))explicitDestination.push('뮤지엄');
  if(/체험마을/.test(m))explicitDestination.push('체험마을');
  if(/전통시장/.test(m))explicitDestination.push('전통시장');
  for(const c of explicitDestination)if(!hardCategories.includes(c))hardCategories.push(c);

  const destinationCats=hardCategories.length?hardCategories:preferredCategories;
  if(destinationCats.length)patch.categories=destinationCats;
  if(/카페.*(빼|제외)|카페는.*(빼|제외)/.test(m))patch.categories=(patch.categories||context.categories||[]).filter(x=>x!=='카페');

  const regions=['서울','부산','대구','인천','광주','대전','울산','진주','사천','통영','거제','남해','여수','순천','하동','합천','산청','함양','거창','창원','김해','경주','전주','담양','공주','보령','군산','강릉','속초','춘천','안동','포항','제주','제천'];
  for(const r of regions)if(m.includes(r)){focus=r;break}

  const profile={
    keywords:matches.map(x=>x.label),
    matches:matches.map(x=>({id:x.id,label:x.label,kind:x.kind,weight:x.weight,categories:x.categories,reason:x.reason})),
    hardCategories,preferredCategories,distance,
    flags:{
      wantsCafe:matches.some(x=>x.id==='cafe'||x.id==='warmdrink'),
      wantsFood:matches.some(x=>x.id==='food'),
      quiet:matches.some(x=>x.id==='quiet'),
      rain:matches.some(x=>x.id==='rain'),
      wave:matches.some(x=>x.id==='wave')
    }
  };

  const travel=/여행|관광|여행지|코스|드라이브|바다|해변|산|카페|커피|라떼|맛집|뮤지엄|미술관|박물관|공원|시장|온천|캠핑|체험|데이트|당일치기|주차|날씨|교통|귀가|출발지|가고\s*싶|어디\s*갈|별|은하수|천체|밤하늘|노을|일몰|일출|해돋이|풍경|전망|경치|힐링|한적|실내|가족|아이|파도|비오|산책|걷기|숲|꽃|야경|쇼핑|소품|혼자|강아지|반려|기분전환|쉬고싶|답답|감성|낭만|역사|문화재|고궁|성곽|사찰|한옥|유적|추천|찾아줘|갈만|나들이|바람쐬|바람쐬고|바람쐬러|떠나고|가고\s*싶|보고\s*싶|걷고\s*싶|먹고\s*싶|마시고\s*싶/;
  const appIntent=/TRIP\s*QUEST|트립\s*퀘스트|설정|사용법|버튼|연비|휘발유|거리\s*바꿔|카테고리/i;

  if(/사용법|어떻게\s*써|기능\s*설명/.test(m))return {mode:'local',intent:'help',message:'출발지 → 취향 → 시간 → 추천 → 코스 순서로 진행합니다. 기분, 상황, 원하는 거리를 한 문장에 같이 적어도 분석합니다.',patch,focusQuery:focus,analysisKeywords:['사용법'],choices:[{label:'조건 직접 설정하기',action:'goto',step:2},{label:'다시 입력하기',action:'focus'}]};
  if(!travel.test(compact)&&!appIntent.test(m))return {mode:'local',intent:'clarify',message:'여행 조건으로 이해할 정보가 조금 부족합니다. 기분, 현재 상황, 원하는 거리 중 한 가지만 더 적어주세요.',patch:{},focusQuery:'',analysisKeywords:[],choices:[{label:'AI 입력으로 돌아가기',action:'focus'},{label:'직접 조건 선택하기',action:'goto',step:2}]};

  const settings=/바꿔|변경|설정|빼|제외/.test(m)&&Object.keys(patch).length;
  const keywords=[...profile.keywords];
  keywords.push(sliderKm===0?'내 주변':sliderKm+'km 이내');
  if(!keywords.length)keywords.push('국내여행');
  const msg=settings?'요청한 여행 조건을 반영했습니다.':`기분·상황·거리에서 ${keywords.join(' · ')} 조건을 분석했습니다. 장소 유형과 직접 관련 없는 카페·날씨 조건은 추천지를 왜곡하지 않고 코스 조건으로 따로 반영합니다.`;
  return {mode:'local',intent:settings?'settings':'travel_search',message:msg,patch,focusQuery:focus,
    semanticProfile:profile,analysisKeywords:keywords,
    choices:settings?[{label:'이 조건으로 검색',action:'search',patch,focusQuery:focus},{label:'조건 직접 확인',action:'goto',step:2}]:[{label:'조건 직접 수정',action:'goto',step:2},{label:'다른 조건 말하기',action:'focus'}]}
}
async function api(url,opts={}){const u=new URL(url,location.href),method=(opts.method||'GET').toUpperCase(),body=opts.body?JSON.parse(opts.body):{};
  if(u.pathname.endsWith('/api/config'))return {providers:{kakao:false,tmap:false,openai:false,weather:true},defaultGasPrice:1700,fuelEconomyKmL:11,publicBaseUrl:''};
  if(u.pathname.endsWith('/api/geocode'))return {items:await localGeocode(u.searchParams.get('q')||'')};
  if(u.pathname.endsWith('/api/bootstrap')){const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng')),weather=await clientWeather(lat,lng);return {weather,traffic:{label:'경로 선택 후 계산',avgSpeed:0,source:'정적 배포판'},updatedAt:new Date().toISOString()}}
  if(u.pathname.endsWith('/api/recommend'))return {items:localRecommend(body),source:'모바일 내장 데이터'};
  if(u.pathname.endsWith('/api/trip-summary')){const a=approxRoute(body.origin,body.destination),b=approxRoute(body.destination,body.origin),distanceKm=a.distanceKm+b.distanceKm,drivingMin=a.timeMin+b.timeMin,fuelLiters=distanceKm/11,fuelCost=Math.round(fuelLiters*Number(body.gasPrice||1700));return {outbound:a,inbound:b,total:{distanceKm,drivingMin,toll:0,fuelLiters,fuelCost,tripCost:fuelCost},fuelEconomyKmL:11}}
  if(u.pathname.endsWith('/api/courses')){const ww=await clientWeather(body.destination.lat,body.destination.lng),w=selectWeatherAt(ww,body.departure);return {weather:w,courses:coursePack(body,w),provider:{ai:false,tmap:false,kakao:false}}}
  if(u.pathname.endsWith('/api/ai-search')){const r=localAI(body.message||'',body.context||{});if(r.intent==='travel_search'&&body.context?.origin){const merged={...body.context,...r.patch,focusQuery:r.focusQuery,semanticProfile:r.semanticProfile};r.items=localRecommend(merged)}return r}
  throw new Error('지원하지 않는 요청입니다.');
}


function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone===true}
function encodeShare(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeShare(str){try{let s=str.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}}
function appBaseUrl(){return state.config?.publicBaseUrl || `${location.origin}${location.pathname}`}
function buildShareUrl(){
  if(!state.selected)return appBaseUrl();
  const payload={v:1,destination:{name:state.selected.name,category:state.selected.category,lat:state.selected.lat,lng:state.selected.lng,address:state.selected.address||''},course:state.selectedCourse||'',targetKm:state.targetKm,direction:state.direction,categories:state.categories};
  const u=new URL(appBaseUrl(),location.href);u.searchParams.set('trip',encodeShare(payload));return u.toString();
}
async function shareTrip(){
  const hasTrip=!!state.selected;const url=buildShareUrl();
  const title=hasTrip?`TRIP QUEST · ${state.selected.name}`:'TRIP QUEST · 국내여행 AI 플래너';
  const text=hasTrip?`${state.selected.name}${state.selectedCourse?` · ${state.selectedCourse}코스`:''}\nTRIP QUEST에서 여행 정보를 확인해보세요.`:'국내여행 AI 플래너 TRIP QUEST';
  try{if(navigator.share){await navigator.share({title,text,url});return}await navigator.clipboard.writeText(url);toast('공유 링크를 복사했습니다.')}catch(e){if(e?.name!=='AbortError')toast('공유를 완료하지 못했습니다.')}
}
function hydrateSharedTrip(){
  const q=new URL(location.href).searchParams.get('trip');if(!q)return;
  const data=decodeShare(q);if(!data?.destination?.name)return;state.sharedTrip=data;
  $('#sharedTripBanner').hidden=false;setText('#sharedTripTitle',data.destination.name);setText('#sharedTripMeta',`${data.destination.category||'여행지'}${data.course?` · ${data.course}코스`:''} · 공유 링크`);
}
async function useSharedTrip(){
  const d=state.sharedTrip;if(!d)return;
  if(Number.isFinite(Number(d.targetKm))){state.targetKm=Number(d.targetKm);$('#distanceRange').value=state.targetKm;syncDistanceUI()}
  if(d.direction&&['전체','북','북동','동','남동','남','남서','서','북서'].includes(d.direction)){state.direction=d.direction;syncDirectionUI()}
  if(Array.isArray(d.categories)&&d.categories.length){state.categories=d.categories.filter(x=>categoryLabels.includes(x));syncCategoriesUI()}
  if(!state.origin){state.sharedPending=true;setStep(1);toast('출발지를 설정하면 공유 받은 여행지를 기준으로 다시 계산합니다.');return}
  await recommend({focusQuery:d.destination.name});
}
function initPWA(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
  hydrateSharedTrip();
  const btn=$('#installBtn');
  if(isStandalone()){btn.hidden=true}else if(isIOS()){btn.hidden=false;btn.textContent='홈 화면 추가'}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;btn.hidden=false;btn.textContent='앱 설치'});
  window.addEventListener('appinstalled',()=>{state.installPrompt=null;btn.hidden=true;toast('TRIP QUEST가 설치되었습니다.')});
  btn.onclick=async()=>{if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;btn.hidden=true}else if(isIOS()){$('#iosInstallTip').hidden=false}else toast('브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.')};
  $('#closeInstallTip').onclick=()=>$('#iosInstallTip').hidden=true;
  $('#iosInstallTip').onclick=e=>{if(e.target===$('#iosInstallTip'))$('#iosInstallTip').hidden=true};
  $('#topShareBtn').onclick=shareTrip;$('#shareTripBtn').onclick=shareTrip;$('#sharedTripUseBtn').onclick=useSharedTrip;
}

function initTimes(){
  const now=new Date(); const d=new Date(now); d.setMinutes(Math.ceil(d.getMinutes()/30)*30,0,0); const ret=new Date(d); ret.setHours(ret.getHours()+8);
  const local=x=>{const z=new Date(x.getTime()-x.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)};
  $('#departTime').value=local(d); $('#returnTime').value=local(ret); updateSchedulePreview();
}
function updateSchedulePreview(){
  const dep=new Date($('#departTime').value),ret=new Date($('#returnTime').value);let html='';
  if(!Number.isNaN(dep.valueOf())&&!Number.isNaN(ret.valueOf())&&ret>dep){const mins=(ret-dep)/60000;html=`<span>사용 가능 ${fmtMin(mins)}</span><span>출발 ${dep.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span><span>귀가 ${ret.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>`}
  $('#schedulePreview').innerHTML=html;
}

function initMap(){
  if(typeof L==='undefined'){$('#map').innerHTML='<div class="empty-state">지도를 불러오지 못했습니다.<br>인터넷 연결을 확인하세요.</div>';return}
  state.map=L.map('map',{zoomControl:true}).setView([35.6,128.0],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors',className:'dark-map-tiles'}).addTo(state.map);
}
function clearMarkers(){if(!state.map)return;state.markers.forEach(m=>m.remove());state.markers=[];if(state.routeLine){state.routeLine.remove();state.routeLine=null}}
function addMarker(lat,lng,label,rank){if(!state.map)return;const isOrigin=rank===0;const icon=L.divIcon({className:'',html:`<div style="background:${isOrigin?'#c9ff45':'#f4f7fa'};color:#10150b;border:2px solid #0b1016;width:${isOrigin?19:28}px;height:${isOrigin?19:28}px;border-radius:50%;display:grid;place-items:center;font:bold 11px system-ui;box-shadow:0 3px 12px #0008">${isOrigin?'':rank}</div>`,iconSize:[28,28],iconAnchor:[14,14]});const m=L.marker([lat,lng],{icon}).addTo(state.map).bindPopup(esc(label));state.markers.push(m)}
function drawMap(){if(!state.map)return;clearMarkers();const pts=[];if(state.origin){addMarker(state.origin.lat,state.origin.lng,'출발지',0);pts.push([state.origin.lat,state.origin.lng])}state.recommendations.forEach((p,i)=>{addMarker(p.lat,p.lng,`${i+1}. ${p.name}`,i+1);pts.push([p.lat,p.lng])});if(pts.length>1)state.map.fitBounds(pts,{padding:[28,28]});else if(pts.length===1)state.map.setView(pts[0],10);setTimeout(()=>state.map.invalidateSize(),80)}
function drawRoute(coords){if(!state.map)return;if(state.routeLine)state.routeLine.remove();if(coords?.length>1){state.routeLine=L.polyline(coords,{weight:5,opacity:.78,color:'#c9ff45'}).addTo(state.map);state.map.fitBounds(state.routeLine.getBounds(),{padding:[28,28]})}}

function initCourseMap(){
  if(state.courseMap||typeof L==='undefined')return;
  const el=$('#courseMap');if(!el)return;
  state.courseMap=L.map('courseMap',{zoomControl:true,attributionControl:true}).setView([35.6,128.0],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors',className:'dark-map-tiles'}).addTo(state.courseMap);
}
function clearCourseMap(){
  if(!state.courseMap)return;
  state.courseMarkers.forEach(m=>m.remove());state.courseMarkers=[];
  if(state.courseRouteLine){state.courseRouteLine.remove();state.courseRouteLine=null}
}
function addCourseMarker(point,label,rank,isOrigin=false){
  if(!state.courseMap)return;
  const icon=L.divIcon({className:'',html:`<div class="course-map-pin ${isOrigin?'origin':''}">${isOrigin?'S':rank}</div>`,iconSize:[32,32],iconAnchor:[16,16]});
  const m=L.marker([point.lat,point.lng],{icon}).addTo(state.courseMap).bindPopup(esc(label));
  state.courseMarkers.push(m);
}
function naverPlaceSearchUrl(placeName,type){
  return `https://map.naver.com/p/search/${encodeURIComponent(`${placeName} ${type}`)}`;
}
function renderNearbyPlaceLinks(course,type='전체'){
  const el=$('#nearbyPlaces');if(!el)return;
  const stops=course?.stops||[];
  const showCafe=type==='전체'||type==='카페';
  const showFood=type==='전체'||type==='맛집';
  el.innerHTML=stops.map((s,i)=>`<article class="nearby-stop-card">
    <div class="nearby-stop-head"><span>${String(i+1).padStart(2,'0')}</span><div><b>${esc(s.name)}</b><small>이 지점 기준 4km 이내 우선 · 네이버 플레이스 검색</small></div></div>
    <div class="nearby-actions">
      ${showCafe?`<a class="nearby-link cafe" href="${naverPlaceSearchUrl(s.name,'카페')}" target="_blank" rel="noopener">☕ 주변 카페 보기</a>`:''}
      ${showFood?`<a class="nearby-link food" href="${naverPlaceSearchUrl(s.name,'맛집')}" target="_blank" rel="noopener">● 주변 음식점 보기</a>`:''}
    </div>
  </article>`).join('');
  el.hidden=false;
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderCourseActionButtons(course){
  if(!course)return;
  let box=document.querySelector('#courseActionButtons');
  if(!box){
    box=document.createElement('div');
    box.id='courseActionButtons';
    box.className='course-action-buttons';
    const panel=document.querySelector('#courseDetailPanel');
    if(panel)panel.insertBefore(box,panel.firstChild);
  }
  box.innerHTML=`
    <button class="btn primary course-nearby-btn" data-type="카페">주변 카페 추천</button>
    <button class="btn primary course-nearby-btn" data-type="맛집">주변 음식점 추천</button>
    <button class="btn secondary course-nearby-btn" data-type="전체">카페 + 음식점 같이 보기</button>
  `;
  box.onclick=e=>{
    const b=e.target.closest('.course-nearby-btn');if(!b)return;
    const type=b.dataset.type;
    renderNearbyPlaceLinks(course,type);
    toast(type==='전체'?'주변 카페와 음식점을 표시했습니다.':type==='맛집'?'주변 음식점을 표시했습니다.':'주변 카페를 표시했습니다.');
  };
}
function drawCourseRoute(course){
  if(!course||!state.origin)return;
  initCourseMap();if(!state.courseMap)return;clearCourseMap();
  const pts=[state.origin,...course.stops,state.origin];
  addCourseMarker(state.origin,'출발지',0,true);
  course.stops.forEach((s,i)=>addCourseMarker(s,`${i+1}. ${s.name}`,i+1,false));
  const coords=pts.map(p=>[p.lat,p.lng]);
  state.courseRouteLine=L.polyline(coords,{weight:6,opacity:.96,color:'#c9ff45',lineCap:'round',lineJoin:'round'}).addTo(state.courseMap);
  state.courseMap.fitBounds(state.courseRouteLine.getBounds(),{padding:[34,34]});
  setTimeout(()=>state.courseMap.invalidateSize(),120);
  setText('#courseMapStatus',`${course.id}코스 · 출발지 포함 ${course.stops.length+1}개 지점`);
  const np=$('#nearbyPlaces');if(np){np.innerHTML='';np.hidden=true}
  $('#courseDetailPanel').hidden=false;
  setTimeout(()=>document.querySelector('#courseDetailPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),140);
}

function showMainLanding(){
  const landing=$('#mainLanding');
  if(!landing)return;
  landing.hidden=false;
  document.body.classList.add('landing-open');
  setText('#mainLocationStatus','내 위치를 확인하면 여행 검색 화면으로 바로 이동합니다.');
  const btn=$('#mainLocateBtn');if(btn){btn.disabled=false;btn.classList.remove('done','error');btn.textContent='내 위치 검색하기'}
}
function hideMainLanding(){
  const landing=$('#mainLanding');if(!landing)return;
  landing.classList.add('leaving');
  setTimeout(()=>{landing.hidden=true;landing.classList.remove('leaving');document.body.classList.remove('landing-open')},260);
}
async function startFromMainLocation(){
  const btn=$('#mainLocateBtn'),status=$('#mainLocationStatus');
  if(!navigator.geolocation){
    btn?.classList.add('error');if(btn)btn.textContent='위치 기능을 사용할 수 없음';
    if(status)status.textContent='출발지를 직접 입력해주세요.';return;
  }
  if(btn){btn.disabled=true;btn.textContent='내 위치 찾는 중…';btn.classList.remove('done','error')}
  if(status)status.textContent='현재 위치 권한을 확인하고 있습니다…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});
      if(btn){btn.classList.add('done');btn.textContent='위치 확인 완료 ✓'}
      if(status)status.textContent='현재 위치를 찾았습니다. 여행 취향 검색 화면으로 이동합니다.';
      setTimeout(()=>{
        hideMainLanding();
        setStep(2);
        const manual=$('#manualOptions');if(manual)manual.hidden=true;
        const toggle=$('#manualToggle');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.textContent='직접 선택으로 찾기 ↓'}
        setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},180);
      },520);
    }catch(e){
      if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='다시 시도'}
      if(status)status.textContent='위치를 설정하지 못했습니다. 다시 시도해주세요.';
    }
  },()=>{
    if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='위치 권한 다시 확인'}
    if(status)status.textContent='위치 권한이 꺼져 있습니다. 권한을 허용하거나 출발지를 직접 입력해주세요.';
  },{enableHighAccuracy:true,timeout:9000});
}
async function loadConfig(){
  state.config=await api('/api/config');$('#gasPrice').value=state.config.defaultGasPrice;const p=state.config.providers;
  setText('#providerNow','모바일 즉시실행');setText('#updatedAt','v0.18 · 날씨 LIVE · 정렬 오류 수정');
}
async function useLocation(goNext=false){
  if(!navigator.geolocation){toast('브라우저 위치 기능을 사용할 수 없습니다. 출발지를 검색해주세요.');return}
  $('#originLabel').textContent='현재 위치를 확인하고 있습니다…';
  navigator.geolocation.getCurrentPosition(async pos=>{await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});toast('현재 위치를 설정했습니다.');if(goNext)setStep(2)},()=>{setText('#originLabel','위치 권한이 꺼져 있습니다. 출발지를 직접 검색하세요.');toast('위치 권한을 허용하거나 출발지를 검색해주세요.')},{enableHighAccuracy:true,timeout:8000});
}
async function setOrigin(o){state.origin=o;setText('#originLabel',`${o.name||'출발지'} · ${Number(o.lat).toFixed(5)}, ${Number(o.lng).toFixed(5)}`);if(state.map){state.map.setView([o.lat,o.lng],10);drawMap()}await refreshLive();if(state.sharedPending&&state.sharedTrip){state.sharedPending=false;setTimeout(()=>recommend({focusQuery:state.sharedTrip.destination.name}),120)}}
async function refreshLive(){if(!state.origin)return;try{const b=await api(`/api/bootstrap?lat=${state.origin.lat}&lng=${state.origin.lng}`);const w=b.weather.current;if(w.source==='fallback'){setText('#weatherNow','날씨 확인 필요');setText('#weatherMeta','날씨 API 연결 대기')}else{setText('#weatherNow',`${w.condition} ${Math.round(w.temperature_2m)}°`);setText('#weatherMeta',`체감 ${Math.round(w.apparent_temperature)}° · 바람 ${Math.round(w.wind_speed_10m)}km/h`)}setText('#trafficNow',b.traffic.label);setText('#trafficMeta',b.traffic.source);setText('#updatedAt',new Date(b.updatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 갱신')}catch{setText('#weatherNow','업데이트 실패');setText('#trafficNow','업데이트 실패')}}

function setStep(n){
  n=Math.max(1,Math.min(5,n));state.step=n;$$('.step-view').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepView)===n));
  $$('.progress-step').forEach(x=>{const s=Number(x.dataset.step);x.classList.toggle('active',s===n);x.classList.toggle('done',s<n)});
  const m=stepMeta[n];setText('#stepEyebrow',m[0]);setText('#stepTitle',m[1]);setText('#stepDescription',m[2]);
  $('#backBtn').disabled=n===1;let label='다음 →',disabled=false,hint='';
  if(n===1){label='위치 확인하고 다음 →';disabled=false;hint=state.origin?'출발지 설정 완료':'현재 위치 또는 출발지를 설정하세요.'}
  if(n===2){label='시간 설정으로 →';disabled=state.categories.length===0;hint=`${state.targetKm}km · ${state.direction==='전체'?'방향 상관없음':state.direction} · 취향 ${state.categories.length}개`}
  if(n===3){label='추천지 찾기 →';hint='날씨·교통·거리 조건을 함께 계산합니다.'}
  if(n===4){label=state.selected?'선택 여행지 코스 보기 →':'추천지에서 하나를 선택하세요';disabled=!state.selected;hint=state.selected?`${state.selected.name} 선택됨`:'각 카드의 “이 여행지 선택” 버튼을 누르세요.'}
  if(n===5){label='새 여행 시작';hint=state.selectedCourse?`${state.selectedCourse}코스를 선택했습니다.`:'A/B/C 중 원하는 코스를 선택할 수 있습니다.'}
  $('#nextBtn').textContent=label;$('#nextBtn').disabled=disabled;setText('#actionHint',hint);window.scrollTo({top:Math.max(0,$('.wizard').offsetTop-18),behavior:'smooth'});if(n===4&&state.map)setTimeout(()=>state.map.invalidateSize(),120)
}
function resetTrip(){state.targetKm=100;state.resultSort='popular';state.activeDistanceBand=null;state.lastSearchMode='ai';state.lastAIMessage='';state.direction='전체';state.categories=['관광지'];state.recommendations=[];state.selected=null;state.selectedCourse=null;state.selectedCourseData=null;state.sharedPending=false;syncDistanceUI();$$('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value==='전체'));syncCategoriesUI();$('#ranking').innerHTML='조건을 설정한 뒤 추천지를 찾아보세요.';$('#ranking').className='ranking empty-state';initTimes();setStep(1);showMainLanding();toast('새 여행을 시작합니다.')}

let lastDistanceHaptic=state.targetKm;
function syncDistanceUI(){
  const v=Math.max(0,Math.min(400,Math.round(Number(state.targetKm||0)/10)*10));
  state.targetKm=v;
  setText('#distanceValue',v);
  setText('#distanceHint',v===0?'현재 위치 주변 10km':'내 위치 기준 최대 '+v+'km');
  const range=$('#distanceRange');if(range){range.value=v;range.style.setProperty('--distance-fill',(v/400*100)+'%')}
}
function setDistanceFromSlider(value,haptic=true){
  const v=Math.max(0,Math.min(400,Math.round(Number(value)/10)*10));
  state.targetKm=v;state.activeDistanceBand=null;syncDistanceUI();
  if(haptic&&v!==lastDistanceHaptic){
    lastDistanceHaptic=v;
    try{if(navigator.vibrate)navigator.vibrate(8)}catch{}
  }
}
function syncCategoriesUI(){$$('#categoryChoices button').forEach(b=>b.classList.toggle('selected',state.categories.includes(b.dataset.value)));setText('#categoryCount',`${state.categories.length}개 선택`)}
function syncDirectionUI(){$$('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value===state.direction));setText('#directionValue',state.direction==='전체'?'상관없음':state.direction)}
function bindChoices(){
  const distanceRange=$('#distanceRange');if(distanceRange)distanceRange.addEventListener('input',e=>setDistanceFromSlider(e.target.value,true));
  $('#directionChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.direction=b.dataset.value;syncDirectionUI()});
  $('#categoryChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;b.classList.toggle('selected');state.categories=$$('#categoryChoices button.selected').map(x=>x.dataset.value);syncCategoriesUI();setStep(2)});
}
async function searchOrigin(){const q=$('#originSearch').value.trim();if(!q)return;$('#originResults').innerHTML='<div class="empty-state">출발지를 찾고 있습니다…</div>';try{const j=await api(`/api/geocode?q=${encodeURIComponent(q)}`);if(!j.items.length){$('#originResults').innerHTML='<div class="error">검색 결과가 없습니다.</div>';return}$('#originResults').innerHTML=j.items.map((x,i)=>`<button data-i="${i}"><span><b>${esc(x.name)}</b><br><small>${esc(x.address||'')}</small></span><span>선택 →</span></button>`).join('');$('#originResults').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const x=j.items[Number(b.dataset.i)];await setOrigin({...x,name:x.name});$('#originResults').innerHTML='';$('#originSearch').value='';toast('출발지를 설정했습니다.');setStep(2);const manual=$('#manualOptions');if(manual)manual.hidden=true;setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},160)};}catch(e){$('#originResults').innerHTML=`<span class="error">${esc(e.message)}</span>`}}

function currentPayload(){return {origin:state.origin,targetKm:state.targetKm,direction:state.direction,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value,gasPrice:Number($('#gasPrice').value||1700)}}
async function recommend(extra={}){state.lastSearchMode='manual';state.activeDistanceBand=extra.distanceBand||null;if(!state.origin){toast('출발지를 먼저 설정하세요.');setStep(1);return}loading(true);setStep(4);$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='여행 후보를 계산하고 있습니다…';$('#noMatchActions').hidden=true;try{const j=await api('/api/recommend',{method:'POST',body:JSON.stringify({...currentPayload(),...extra,distanceBand:state.activeDistanceBand})});state.recommendations=j.items||[];state.selected=null;sortRecommendations('popular',false);renderRanking();drawMap();setText('#resultCaption',state.activeDistanceBand?`비슷한 거리 ${Math.round(state.activeDistanceBand.min)}~${Math.round(state.activeDistanceBand.max)}km · ${state.direction==='전체'?'전체 방향':state.direction}`:`${state.targetKm===0?'내 주변':state.targetKm+'km 이내'} · ${state.direction==='전체'?'전체 방향':state.direction} · ${state.categories.join(' · ')||'전체 취향'}`);setText('#mapStatus',`후보 ${state.recommendations.length}곳 · ${j.source||'데이터 검색'}`)}catch(e){$('#ranking').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);setStep(4)}}
function renderRanking(){
  if(!state.recommendations.length){$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='선택한 거리와 조건에 맞는 장소를 찾지 못했습니다.<br>비슷한 거리 범위에서 다시 찾아볼 수 있습니다.';$('#noMatchActions').hidden=false;return}
  $('#ranking').className='ranking';$('#noMatchActions').hidden=true;
  $('#ranking').innerHTML=state.recommendations.map((p,i)=>{const free=p.availableMin!=null?Math.round(p.availableMin-p.roundTripDriveMin):null;const reason=p.aiReason||[Math.abs(p.distanceKm-state.targetKm)<state.targetKm*.25?'원하는 거리와 가까움':'거리 조건 범위',p.feasible===false?'귀가시간이 빠듯함':free!=null?`귀가 전 여유 약 ${fmtMin(Math.max(0,free))}`:'이동시간 확인',p.category||'여행지'].join(' · ');return `<article class="rank-card" data-i="${i}"><div class="rank-number">${String(i+1).padStart(2,'0')}</div><div><h3>${esc(p.name)}</h3><div class="rank-tags"><span class="tag good">적합도 ${Math.round(p.score)}</span><span class="tag">${esc(p.category||'장소')}</span>${p.feasible===false?'<span class="tag warn">시간 빠듯</span>':''}</div><div class="rank-meta"><span>직선 ${p.distanceKm.toFixed(1)}km</span>${p.routePreview?`<span>편도 ${fmtMin(p.routePreview.timeMin)}</span><span>도로 ${p.routePreview.distanceKm.toFixed(1)}km</span>`:''}</div><div class="rank-reason">${esc(reason)}</div></div><div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button>${p.url?`<button class="btn secondary open-place">장소 정보</button>`:'<button class="btn secondary map-focus">지도에서 보기</button>'}</div></article>`}).join('');
  $('#ranking').onclick=e=>{const card=e.target.closest('.rank-card');if(!card)return;const i=Number(card.dataset.i);if(e.target.closest('.select-place'))selectPlace(i,true);else if(e.target.closest('.open-place'))window.open(state.recommendations[i].url,'_blank','noopener');else{const p=state.recommendations[i];if(state.map)state.map.setView([p.lat,p.lng],13)}};
}
async function selectPlace(i,goCourse=false){
  state.selected=state.recommendations[i];setText('#selectedPlaceName',state.selected.name);setText('#selectedPlaceMeta',`${state.selected.category||'여행지'} · ${state.selected.address||'주소 정보 없음'}`);$('#tripSummary').className='summary-box empty-state';$('#tripSummary').innerHTML='왕복 경로와 비용을 계산하고 있습니다…';$('#courseList').className='course-list empty-state';$('#courseList').innerHTML='목적지 날씨와 주변 장소를 분석해 코스를 만들고 있습니다…';$('#nextBtn').disabled=false;loading(true);if(goCourse)setStep(5);
  const base={origin:state.origin,destination:state.selected,gasPrice:Number($('#gasPrice').value||1700)};
  try{const [sum,c]=await Promise.all([api('/api/trip-summary',{method:'POST',body:JSON.stringify(base)}),api('/api/courses',{method:'POST',body:JSON.stringify({...base,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value})})]);renderSummary(sum);renderCourses(c);drawRoute(sum.outbound.coords);setText('#mapStatus',`${state.selected.name} · 왕복 ${sum.total.distanceKm.toFixed(1)}km`)}catch(e){$('#tripSummary').innerHTML=`<span class="error">${esc(e.message)}</span>`;$('#courseList').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);if(goCourse)setStep(5)}
}
function renderSummary(s){const src=s.outbound.source==='tmap'?'실시간 경로 데이터':'근사 경로';$('#tripSummary').className='summary-box';$('#tripSummary').innerHTML=`<div class="metric-grid"><div class="metric"><span>왕복 거리</span><strong>${fmtKm(s.total.distanceKm)}</strong></div><div class="metric"><span>운전 시간</span><strong>${fmtMin(s.total.drivingMin)}</strong></div><div class="metric"><span>통행료</span><strong>${fmtWon(s.total.toll)}</strong></div><div class="metric"><span>예상 연료</span><strong>${s.total.fuelLiters.toFixed(1)}L</strong></div><div class="metric"><span>기름값</span><strong>${fmtWon(s.total.fuelCost)}</strong></div><div class="metric"><span>교통비 합계</span><strong>${fmtWon(s.total.tripCost)}</strong></div></div><div class="source-note">${src} · 캐스퍼 연비 11km/L 기준 · 식비/주차비/입장료 제외</div>`}
function renderCourses(j){
  const w=j.weather;
  const courses=Array.isArray(j.courses)?j.courses:[];
  if(w.source==='fallback')setText('#courseWeather','날씨 API 연결이 되면 방문 예정시간 기준으로 코스를 다시 판단합니다.');
  else setText('#courseWeather',`예상 ${w.condition} · ${Math.round(w.temperature_2m)}°C · 강수 ${w.precipitation_probability||0}% · 바람 ${Math.round(w.wind_speed_10m)}km/h`);
  $('#courseDetailPanel').hidden=true;
  $('#courseList').className='course-list';
  $('#courseList').innerHTML=courses.map(c=>`<article class="course-card" data-course="${c.id}"><div class="course-top"><span class="course-id">${c.id}</span><span class="badge">날씨 적합 ${esc(c.weatherFit)}</span></div><h4>${esc(c.title)}</h4><p>${esc(c.reason)}</p><ol class="stops">${c.stops.map((s,i)=>`<li>${i+1}. ${esc(s.name)}</li>`).join('')}</ol><div class="course-rule">${esc(c.localRule||"근거리 코스")}${c.maxLocalLegKm?` · 최대 구간 ${c.maxLocalLegKm.toFixed(1)}km`:""}</div><div class="course-stats"><span>${fmtKm(c.route.distanceKm)}</span><span>${fmtMin(c.route.timeMin)}</span><span>약 ${fmtWon(c.estimatedCost.total)}</span></div><button class="btn secondary choose-course" type="button">${c.id}코스 선택</button></article>`).join('');

  $('#courseList').onclick=e=>{
    const button=e.target.closest('.choose-course');
    const card=e.target.closest('.course-card');
    if(!button||!card)return;

    const id=card.dataset.course;
    const course=courses.find(c=>c.id===id);
    if(!course){toast('코스 정보를 다시 불러와주세요.');return}

    state.selectedCourse=id;
    state.selectedCourseData=course;

    $$('.course-card').forEach(x=>x.classList.toggle('selected',x===card));
    $$('.choose-course').forEach(x=>x.textContent=`${x.closest('.course-card').dataset.course}코스 선택`);
    button.textContent='선택 완료 ✓';

    const panel=$('#courseDetailPanel');
    if(panel)panel.hidden=false;
    renderCourseActionButtons(course);

    try{
      drawCourseRoute(course);
    }catch(err){
      console.error('course route error',err);
      setText('#courseMapStatus','지도 표시 중 오류가 있어도 카페·음식점 추천은 사용할 수 있습니다.');
    }

    setText('#actionHint',`${id}코스를 선택했습니다. 아래에서 주변 카페·음식점을 확인할 수 있습니다.`);
    toast(`${id}코스를 선택했습니다.`);
    setTimeout(()=>document.querySelector('#courseDetailPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  };
}
function applyPatch(patch={}){
  if(Number.isFinite(Number(patch.targetKm)))setDistanceFromSlider(Math.max(0,Math.min(400,Number(patch.targetKm))),false)
  if(patch.direction&&['전체','북','북동','동','남동','남','남서','서','북서'].includes(patch.direction)){state.direction=patch.direction;syncDirectionUI()}
  if(Array.isArray(patch.categories)){state.categories=[...new Set(patch.categories.filter(x=>categoryLabels.includes(x)))];if(!state.categories.length&&patch.keepEmpty!==true)state.categories=['관광지'];syncCategoriesUI()}
  if(patch.departure)$('#departTime').value=patch.departure;if(patch.returnTime)$('#returnTime').value=patch.returnTime;if(patch.gasPrice)$('#gasPrice').value=patch.gasPrice;updateSchedulePreview();
}
function startAIProgressGauge(){
  const wrap=$('#aiProgress'),fill=$('#aiProgressFill'),label=$('#aiProgressText'),eta=$('#aiEta');
  if(!wrap||!fill)return ()=>{};
  wrap.hidden=false;fill.style.width='4%';if(label)label.textContent='4%';if(eta)eta.textContent='예상 1~3초';
  const started=performance.now();
  const timer=setInterval(()=>{
    const elapsed=(performance.now()-started)/1000;
    const pct=Math.min(88,Math.round(8+elapsed*38));
    fill.style.width=pct+'%';if(label)label.textContent=pct+'%';
    if(eta)eta.textContent=elapsed<1?'약 2초 남음':elapsed<2?'약 1초 남음':'마무리 중';
  },90);
  return (ok=true)=>{
    clearInterval(timer);
    const elapsed=(performance.now()-started)/1000;
    fill.style.width=ok?'100%':'100%';if(label)label.textContent=ok?'100%':'중단';
    if(eta)eta.textContent=ok?`완료 · ${elapsed.toFixed(1)}초`:'검색 실패';
    wrap.classList.toggle('error',!ok);wrap.classList.toggle('done',ok);
    setTimeout(()=>{wrap.hidden=true;wrap.classList.remove('done','error');fill.style.width='0%'},1700);
  };
}
function showAI(result){
  $('#aiConversation').hidden=false;
  setText('#aiMode','여행 전용 AI 가이드');
  setText('#aiReply',result.message||'요청을 처리했습니다.');
  const tags=$('#aiAnalysisTags');
  if(tags){
    const kws=result.analysisKeywords||[];
    tags.innerHTML=kws.map(x=>`<span>${esc(x)}</span>`).join('');
    tags.hidden=!kws.length;
  }
  const choices=result.choices||[];
  $('#aiChoices').innerHTML=choices.map((c,i)=>`<button data-i="${i}">${esc(c.label)}</button>`).join('');
  $('#aiChoices').onclick=e=>{const b=e.target.closest('button');if(!b)return;handleAIChoice(choices[Number(b.dataset.i)])};
  if(result.patch)applyPatch(result.patch);
  if(Array.isArray(result.items)){
    state.recommendations=result.items;state.selected=null;sortRecommendations('popular',false);renderRanking();drawMap();
    setText('#resultCaption',`AI 요청 반영 · ${state.targetKm===0?'내 주변':state.targetKm+'km 이내'}`);
    setStep(4);
    setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
  }
}
function ensureAIOrigin(){
  if(state.origin)return Promise.resolve(state.origin);
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('현재 위치를 사용할 수 없습니다. 출발지를 먼저 설정해주세요.'));return}
    setText('#resultCaption','AI 추천 · 현재 위치 확인 중');
    $('#ranking').className='ranking empty-state';
    $('#ranking').innerHTML='추천지를 계산하기 위해 현재 위치를 확인하고 있습니다…';
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});
        resolve(state.origin);
      }catch(e){reject(e)}
    },()=>reject(new Error('위치 권한이 필요합니다. 위치를 허용하거나 출발지를 직접 설정해주세요.')),{enableHighAccuracy:true,timeout:8000});
  });
}

async function askAI(message,options={}){
  if(!message.trim()||state.aiBusy)return;
  state.lastSearchMode='ai';state.lastAIMessage=message.trim();state.activeDistanceBand=options.distanceBand||null;
  state.aiBusy=true;
  const btn=$('#aiSend'),status=$('#aiSearchStatus'),finishGauge=startAIProgressGauge();
  $('#aiConversation').hidden=false;$('#aiChoices').innerHTML='';
  setText('#aiMode','요청 분석 중');setText('#aiReply','문장에서 여행 취향과 조건을 찾고 있습니다…');
  if(status){status.hidden=false;status.className='ai-search-status working';status.textContent='1/2 · 키워드와 여행 의도 분석 중…'}
  btn.disabled=true;btn.classList.remove('ai-done','ai-error');btn.textContent='분석 중…';

  // AI 검색은 즉시 추천지 페이지로 전환한다.
  state.selected=null;
  setStep(4);
  $('#ranking').className='ranking empty-state';
  $('#ranking').innerHTML='AI가 요청을 분석하고 추천지를 찾고 있습니다…';
  setText('#resultCaption','AI 분석 중 · 잠시만 기다려주세요');
  setText('#mapStatus','AI 추천 준비 중');
  setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),80);

  try{
    await ensureAIOrigin();
    await new Promise(r=>setTimeout(r,520));
    btn.textContent='추천지 찾는 중…';
    if(status)status.textContent='2/2 · 분석한 취향과 조건으로 추천지 계산 중…';

    const result=await api('/api/ai-search',{method:'POST',body:JSON.stringify({message:message.trim(),context:{...currentPayload(),distanceBand:state.activeDistanceBand}})});
    await new Promise(r=>setTimeout(r,520));

    showAI(result);
    const count=Array.isArray(result.items)?result.items.length:0;
    const keys=(result.analysisKeywords||[]).join(' · ');
    if(Array.isArray(result.items)){
      setText('#resultCaption',state.activeDistanceBand?`AI 분석 · 비슷한 거리 ${Math.round(state.activeDistanceBand.min)}~${Math.round(state.activeDistanceBand.max)}km · 추천지 ${count}곳`:keys?`AI 분석: ${keys} · ${state.targetKm===0?'내 주변':state.targetKm+'km 이내'} · 추천지 ${count}곳`:`AI 추천지 ${count}곳`);
      setText('#mapStatus',`AI 분석 기반 후보 ${count}곳`);
      setStep(4);
      setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
    } else {
      $('#ranking').className='ranking empty-state';
      const needsMore=result.intent==='clarify'||result.intent==='off_topic';
      $('#ranking').innerHTML=needsMore
        ? '<div><strong>AI 분석 완료</strong><br><br>여행 조건을 조금 더 알려주면 추천 정확도가 올라갑니다.<br><small>예: “오늘 답답해서 60km 안에서 조용히 바람 쐬고 싶어”</small><br><br><button id="aiRefineBtn" class="btn primary" type="button">AI 검색 다시 입력</button></div>'
        : '<div><strong>AI 분석 완료</strong><br><br>현재 조건으로 추천 가능한 장소가 부족합니다.<br>거리나 상황을 조금 넓혀 다시 검색해보세요.<br><br><button id="aiRefineBtn" class="btn primary" type="button">검색 조건 다시 입력</button></div>';
      setText('#resultCaption',needsMore?'AI 분석 완료 · 조건 보완 필요':'AI 분석 완료 · 추천 조건 조정 필요');
      setText('#mapStatus','AI 분석 완료');
      setStep(4);
      setTimeout(()=>{
        const refine=$('#aiRefineBtn');
        if(refine)refine.onclick=()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),180)};
      },0);
    }

    btn.classList.add('ai-done');
    btn.textContent=count?`추천 완료 ✓ · ${count}곳`:'분석 완료 ✓';
    if(status){status.className='ai-search-status done';status.textContent=count?`완료 · AI 분석을 반영한 추천지 ${count}곳입니다.`:'완료 · 입력 내용을 분석했습니다.'}
    finishGauge(true);
    setTimeout(()=>{if(!state.aiBusy){btn.classList.remove('ai-done');btn.textContent='AI로 찾기'}},1800);
  }catch(e){
    btn.classList.add('ai-error');btn.textContent='검색 실패 · 다시 시도';
    if(status){status.className='ai-search-status error';status.textContent=e.message||'검색 중 문제가 생겼습니다.'}
    $('#ranking').className='ranking empty-state';
    $('#ranking').innerHTML=`<span class="error">${esc(e.message||'AI 추천을 진행하지 못했습니다.')}</span>`;
    setText('#resultCaption','AI 추천을 진행하려면 출발지 또는 위치 권한이 필요합니다.');
    finishGauge(false);showAI({mode:'local',message:e.message||'AI 요청을 처리하지 못했습니다.',analysisKeywords:[],choices:[{label:'출발지 설정하기',action:'goto',step:1},{label:'다시 입력하기',action:'focus'}]});
  }finally{
    state.aiBusy=false;btn.disabled=false;
  }
}
function similarDistanceBand(){
  const base=Math.max(0,Math.min(400,Number(state.targetKm)||0));
  const min=Math.max(0,base-20),max=Math.min(400,base+20);
  return {min,max};
}
async function searchSimilarDistance(){
  const band=similarDistanceBand();
  state.activeDistanceBand=band;
  $('#noMatchActions').hidden=true;
  if(state.lastSearchMode==='ai'&&state.lastAIMessage){
    await askAI(state.lastAIMessage,{distanceBand:band});
  }else{
    await recommend({distanceBand:band});
  }
}
function handleAIChoice(c){if(!c)return;if(c.action==='search'){if(c.patch)applyPatch(c.patch);recommend(c.focusQuery?{focusQuery:c.focusQuery}:{})}else if(c.action==='goto'){setStep(c.step||2)}else if(c.action==='ai_prompt'){const m=c.message||'';$('#aiInput').value=m;askAI(m)}else if(c.action==='focus'){$('#aiInput').focus()}else if(c.action==='reset'){resetTrip()}}

function bindActions(){
  const mainLocate=$('#mainLocateBtn');if(mainLocate)mainLocate.onclick=startFromMainLocation;
  const mainManual=$('#mainManualBtn');if(mainManual)mainManual.onclick=()=>{hideMainLanding();setStep(1);setTimeout(()=>$('#originSearch')?.focus(),320)};
  const manualToggle=$('#manualToggle');if(manualToggle)manualToggle.onclick=()=>{const box=$('#manualOptions');if(!box)return;box.hidden=!box.hidden;manualToggle.setAttribute('aria-expanded',String(!box.hidden));manualToggle.textContent=box.hidden?'직접 선택으로 찾기 ↓':'직접 선택 접기 ↑';if(!box.hidden)setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),80)};
  const resultSort=$('#resultSort');if(resultSort)resultSort.onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;sortRecommendations(b.dataset.sort,true)};
  $('#locateBtn').onclick=()=>useLocation(false);$('#searchOriginBtn').onclick=searchOrigin;$('#originSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchOrigin()});
  $('#departTime').addEventListener('change',updateSchedulePreview);$('#returnTime').addEventListener('change',updateSchedulePreview);$('#resetBtn').onclick=resetTrip;$('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn').onclick=()=>setStep(state.step-1);$('#nextBtn').onclick=async()=>{if(state.step===1){if(state.origin)setStep(2);else await useLocation(true)}else if(state.step===2)setStep(3);else if(state.step===3)await recommend();else if(state.step===4){if(state.selected)setStep(5)}else resetTrip()};
  $$('.progress-step').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(n<=state.step||n<=3)setStep(n)});$('#editConditionsBtn').onclick=()=>setStep(2);$('#changePlaceBtn').onclick=()=>setStep(4);
  $('#noMatchActions').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='similar')searchSimilarDistance();else if(b.dataset.noMatch==='refine'){document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),180)}};
  $('#aiSend').onclick=()=>askAI($('#aiInput').value);$('#aiInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')askAI($('#aiInput').value)});
}

async function boot(){initTimes();initMap();bindChoices();bindActions();initPWA();syncDistanceUI();syncDirectionUI();syncCategoriesUI();setStep(1);showMainLanding();try{await loadConfig()}catch{setText('#providerNow','설정 확인 필요')}setInterval(refreshLive,10*60*1000)}
globalThis.__TQ_TEST__={localAI,localRecommend,coursePack,approxRoute};
if(typeof document!=='undefined')boot();
