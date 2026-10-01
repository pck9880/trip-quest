const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const state={step:1,origin:null,targetKm:100,direction:'전체',categories:['관광지'],recommendations:[],selected:null,selectedCourse:null,selectedCourseData:null,config:null,map:null,markers:[],routeLine:null,courseMap:null,courseMarkers:[],courseRouteLine:null,aiBusy:false,installPrompt:null,sharedTrip:null,sharedPending:false};
const stepMeta={
  1:['STEP 1 / 5','어디에서 출발하나요?','현재 위치를 사용하거나 출발지를 직접 검색하세요.'],
  2:['STEP 2 / 5','어떤 여행을 원하나요?','거리, 방향, 취향을 선택하세요. 여러 취향을 함께 선택할 수 있습니다.'],
  3:['STEP 3 / 5','여행 가능한 시간을 알려주세요.','출발과 귀가 시간을 기준으로 현실적인 후보를 계산합니다.'],
  4:['STEP 4 / 5','추천지를 비교해보세요.','추천 이유와 이동시간을 보고 원하는 여행지를 선택하세요.'],
  5:['STEP 5 / 5','날씨에 맞는 코스를 골라보세요.','선택한 여행지의 경로·비용·날씨를 바탕으로 A/B/C 코스를 만듭니다.']
};
const categoryLabels=['카페','관광지','바다','산','뮤지엄','체험마을','소품샵','공원','맛집','전통시장','온천','캠핑'];

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtWon(n){return `${Math.round(n||0).toLocaleString('ko-KR')}원`}
function fmtMin(m){const h=Math.floor((m||0)/60),min=Math.round((m||0)%60);return h?`${h}시간 ${min}분`:`${min}분`}
function fmtKm(k){return `${(k||0).toFixed(1)} km`}
function setText(sel,t){const el=$(sel);if(el)el.textContent=t}
function loading(on){document.body.classList.toggle('loading',on)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
const RAW_PLACES=[
['진주성','관광지',35.1896,128.0780],['경상남도수목원','공원',35.1628,128.3050],['사천바다케이블카','관광지',34.9308,128.0437],['남해 독일마을','관광지',34.7996,128.0390],['상주은모래비치','바다',34.7238,127.9878],['통영 동피랑벽화마을','관광지',34.8448,128.4241],['통영 미륵산','산',34.8278,128.4163],['거제 바람의언덕','바다',34.7446,128.6639],['거제 포로수용소유적공원','뮤지엄',34.8917,128.6218],['순천만국가정원','공원',34.9280,127.5090],['순천만습지','관광지',34.8854,127.5095],['여수 오동도','바다',34.7441,127.7655],['여수 아쿠아플라넷','뮤지엄',34.7458,127.7482],['광양 매화마을','관광지',35.0880,127.7060],['하동 최참판댁','관광지',35.1570,127.6942],['합천 해인사','관광지',35.8012,128.0980],['합천 영상테마파크','체험마을',35.5698,128.1675],['산청 동의보감촌','체험마을',35.4158,127.8303],['지리산 천왕봉권역','산',35.3371,127.7308],['함양 상림공원','공원',35.5214,127.7242],['거창 수승대','관광지',35.7383,127.8338],['창원 주남저수지','관광지',35.3075,128.6773],['창원 진해루','바다',35.1478,128.6986],['김해 클레이아크미술관','뮤지엄',35.2500,128.7458],['부산 해운대해수욕장','바다',35.1587,129.1604],['부산 국립해양박물관','뮤지엄',35.0786,129.0803],['부산 감천문화마을','체험마을',35.0975,129.0106],['울산 대왕암공원','바다',35.4926,129.4393],['경주 불국사','관광지',35.7900,129.3318],['경주 국립경주박물관','뮤지엄',35.8292,129.2285],['대구 수성못','공원',35.8297,128.6179],['대구미술관','뮤지엄',35.8274,128.6746],['전주 한옥마을','관광지',35.8150,127.1530],['전주 남부시장','전통시장',35.8120,127.1470],['담양 죽녹원','공원',35.3254,126.9860],['광주 국립아시아문화전당','뮤지엄',35.1468,126.9200],['대전 국립중앙과학관','뮤지엄',36.3742,127.3779],['대전 한밭수목원','공원',36.3680,127.3880],['공주 공산성','관광지',36.4624,127.1278],['보령 대천해수욕장','바다',36.3054,126.5084],['군산 근대역사박물관','뮤지엄',35.9884,126.7115],['변산반도 채석강','바다',35.6251,126.4695],['제천 의림지','관광지',37.1723,128.2106],['안동 하회마을','체험마을',36.5394,128.5180],['포항 호미곶','바다',36.0760,129.5685],['강릉 경포해변','바다',37.8058,128.9071],['속초 영금정','바다',38.2071,128.5992],['춘천 제이드가든','공원',37.8458,127.5364],['서울 국립중앙박물관','뮤지엄',37.5239,126.9803],['인천 을왕리해수욕장','바다',37.4475,126.3720]
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
function localRecommend(body){
  const o=body.origin,target=Number(body.targetKm||100),cats=body.categories||[],dir=body.direction||'전체',
    avail=scheduleWindow(body.departure,body.returnTime),focus=(body.focusQuery||'').trim().toLowerCase(),
    profile=body.semanticProfile||null;
  let arr=RAW_PLACES.map(p=>({...p,distanceKm:geoKm(o,p),bearing:geoBearing(o,p)}));
  if(focus){
    const tokens=focus.split(/\s+/).filter(Boolean);
    const direct=arr.filter(p=>tokens.some(t=>p.name.toLowerCase().includes(t)));
    if(direct.length){const centers=direct;arr=arr.filter(p=>centers.some(c=>geoKm(c,p)<=40)||direct.includes(p))}
  } else {
    arr=arr.filter(p=>p.distanceKm>=Math.max(5,target*.35)&&p.distanceKm<=target*1.65);
    if(dir!=='전체'&&DIR_DEG[dir]!=null)arr=arr.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=55);
    if(cats.length)arr=arr.filter(p=>cats.includes(p.category)||p.category==='관광지');
  }
  const matched=profile?.matches||[];
  return arr.map(p=>{
    const route=approxRoute(o,p),round=route.timeMin*2;
    const cat=(!cats.length||cats.includes(p.category))?14:4;
    const semanticHits=matched.filter(x=>(x.categories||[]).includes(p.category));
    const semantic=Math.min(32,semanticHits.length*9);
    const dist=Math.max(0,45-Math.abs(p.distanceKm-target)/Math.max(30,target)*45);
    const time=avail==null?12:(round<=avail?22:Math.max(0,22-(round-avail)/15));
    const focusBonus=focus?24:0;
    const feasible=avail==null?true:round<=avail;
    const why=[];
    if(semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+' 조건 반영');
    if(profile?.flags?.wantsCafe)why.push('코스 선택 후 주변 카페를 네이버 플레이스로 이어서 확인 가능');
    if(profile?.flags?.quiet)why.push('한적함 선호를 반영해 자연·외곽형 장소에 가중치');
    if(Math.abs(p.distanceKm-target)<target*.25)why.push(`원하는 거리 ${target}km 조건에 가까움`);
    if(feasible&&avail!=null)why.push('설정한 귀가시간 안에 이동 가능');
    if(!why.length)why.push(`${p.category||'여행지'} 유형과 이동거리를 함께 고려`);
    return {...p,routePreview:route,roundTripDriveMin:round,availableMin:avail,feasible,
      aiReason:why.slice(0,3).join(' · '),
      semanticIntent:(profile?.keywords||[]).join(','),
      score:Math.min(99,Math.round(25+dist+cat+semantic+time+focusBonus))}
  }).sort((a,b)=>b.score-a.score).slice(0,10)
}
async function localGeocode(q){const x=q.trim().toLowerCase();const local=RAW_PLACES.filter(p=>p.name.toLowerCase().includes(x)||x.includes(p.name.split(' ')[0].toLowerCase())).slice(0,5).map(p=>({name:p.name,address:'내장 여행지 데이터',lat:p.lat,lng:p.lng}));try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&countrycodes=kr&accept-language=ko`);if(r.ok){const j=await r.json();const rem=(j||[]).map(d=>({name:String(d.display_name||'').split(',')[0],address:d.display_name||'',lat:Number(d.lat),lng:Number(d.lon)}));if(rem.length)return rem}}catch{}return local}
function selectWeatherAt(w,iso){if(!w?.hourly?.length)return w.current;const t=new Date(iso).getTime();if(!Number.isFinite(t))return w.current;let best=w.hourly[0],d=Infinity;for(const x of w.hourly){const dd=Math.abs(new Date(x.time).getTime()-t);if(dd<d){best=x;d=dd}}return best}
function nearbyStops(dest,cats){let a=RAW_PLACES.map(p=>({...p,near:geoKm(dest,p)})).filter(p=>p.id!==dest.id&&p.near<45);if(cats.length){const hit=a.filter(p=>cats.includes(p.category));a=[...hit,...a.filter(p=>!hit.includes(p))]}return a.sort((x,y)=>x.near-y.near).slice(0,8)}
function coursePack(body,w){const d=body.destination,near=nearbyStops(d,body.categories||[]),rain=Number(w.precipitation_probability)>=55||['비','눈','뇌우','이슬비'].includes(w.condition),indoor=near.filter(p=>['뮤지엄','관광지','전통시장','체험마을'].includes(p.category)),outdoor=near.filter(p=>['바다','산','공원'].includes(p.category));const take=(pool,n)=>pool.slice(0,n);const sets=[{id:'A',title:'균형 코스',reason:'관광과 휴식을 섞은 기본 코스입니다.',stops:[d,...take(near,2)]},{id:'B',title:rain?'날씨 방어 코스':'문화·실내 코스',reason:rain?'강수 가능성을 고려해 실내 비중을 높였습니다.':'뮤지엄과 문화 장소 중심으로 구성했습니다.',stops:[d,...take(indoor.length?indoor:near,2)]},{id:'C',title:'풍경·드라이브 코스',reason:'바다·산·공원 등 야외 풍경을 우선합니다.',stops:[d,...take(outdoor.length?outdoor:near,2)]}];return sets.map(c=>{let km=0,min=0,pts=[body.origin,...c.stops,body.origin];for(let i=1;i<pts.length;i++){const r=approxRoute(pts[i-1],pts[i]);km+=r.distanceKm;min+=r.timeMin}const fuel=km/11,cost=Math.round(fuel*Number(body.gasPrice||1700));return {...c,weatherFit:rain?(c.id==='B'?'높음':c.id==='A'?'보통':'낮음'):'높음',route:{distanceKm:km,timeMin:min,toll:0,source:'estimate'},estimatedCost:{fuelCost:cost,toll:0,total:cost}}})}
function localAI(message,context){
  const m=message.trim(),compact=m.replace(/\s+/g,''),patch={};let focus='';
  const km=m.match(/(\d{2,3})\s*km/i);if(km)patch.targetKm=Math.max(30,Math.min(250,Number(km[1])));
  const dir=['북동','남동','남서','북서','북','동','남','서'].find(d=>m.includes(d));if(dir)patch.direction=dir;

  const semanticRules=[
    {id:'wave',label:'파도·해안',re:/파도|거친바다|바닷소리|해안|바다보고|바다보러|물멍/,categories:['바다'],reason:'파도·해안 풍경'},
    {id:'cafe',label:'카페·커피',re:/카페|커피|라떼|아메리카노|에스프레소|브런치|디저트|베이커리|빵집/,categories:['카페','관광지'],reason:'카페·커피 취향'},
    {id:'warmdrink',label:'따뜻한 음료',re:/따뜻한(라떼|커피|차|음료)|뜨거운(커피|차)|핫초코/,categories:['카페','관광지'],reason:'따뜻한 음료를 즐기고 싶은 취향'},
    {id:'quiet',label:'조용·한적',re:/조용|한적|사람이?(많지않|적|없는)|사람적은|북적이지|붐비지|여유로운|한산|힐링/,categories:['바다','산','공원','캠핑'],reason:'조용하고 한적한 분위기'},
    {id:'rain',label:'비 오는 날',re:/비오|비오는|비가오|비내|우천|장마|빗소리|비인데/,categories:['뮤지엄','관광지','전통시장','체험마을','바다'],reason:'비 오는 날의 이동·체류 조건'},
    {id:'stargazing',label:'별·밤하늘',re:/별.*(보|잘)|별보기|별구경|은하수|천체|밤하늘|별사진/,categories:['산','캠핑','바다','공원'],reason:'별·밤하늘 감상'},
    {id:'sunset',label:'노을·일몰',re:/노을|일몰|석양|해질녘|선셋/,categories:['바다','산','공원'],reason:'노을·일몰 감상'},
    {id:'sunrise',label:'일출·해돋이',re:/일출|해돋이|해뜨는|선라이즈/,categories:['바다','산'],reason:'일출·해돋이 감상'},
    {id:'scenic',label:'풍경·전망',re:/전망|풍경|뷰좋|경치|절경|사진|포토|인생샷|전망대/,categories:['바다','산','공원','관광지'],reason:'풍경·전망'},
    {id:'drive',label:'드라이브',re:/드라이브|차타고|차로가|운전하며|해안도로/,categories:['바다','산','관광지'],reason:'드라이브하기 좋은 동선'},
    {id:'walk',label:'산책·걷기',re:/산책|걷고|걷기|트레킹|둘레길|데크길/,categories:['공원','바다','산','관광지'],reason:'걷기·산책'},
    {id:'hiking',label:'등산·트레킹',re:/등산|산타|정상|등반|트레킹/,categories:['산'],reason:'등산·트레킹'},
    {id:'forest',label:'숲·자연',re:/숲|수목원|나무|자연|계곡|피톤치드/,categories:['산','공원'],reason:'숲·자연 휴식'},
    {id:'flower',label:'꽃·정원',re:/꽃|정원|수국|벚꽃|매화|단풍|억새|코스모스/,categories:['공원','관광지'],reason:'꽃·정원 풍경'},
    {id:'indoor',label:'실내',re:/실내|비피할|춥지않|덥지않|에어컨|전시/,categories:['뮤지엄','전통시장','관광지','체험마을'],reason:'실내 중심 일정'},
    {id:'museum',label:'전시·뮤지엄',re:/박물관|미술관|뮤지엄|전시|갤러리|과학관/,categories:['뮤지엄'],reason:'전시·문화 관람'},
    {id:'history',label:'역사·문화',re:/역사|문화재|고궁|성곽|사찰|절|한옥|유적/,categories:['관광지','뮤지엄','체험마을'],reason:'역사·문화 체험'},
    {id:'market',label:'시장·로컬',re:/시장|전통시장|로컬|현지|골목|야시장/,categories:['전통시장','관광지'],reason:'로컬 시장·골목'},
    {id:'food',label:'맛집·먹거리',re:/맛집|먹거리|밥|식사|국밥|회|해산물|고기|면|분식|맛있는/,categories:['맛집','전통시장','관광지'],reason:'먹거리·맛집'},
    {id:'family',label:'가족·아이',re:/아이랑|아이와|가족|애기|아기|어린이|부모님/,categories:['체험마을','공원','뮤지엄','관광지'],reason:'가족 동반'},
    {id:'date',label:'데이트',re:/데이트|커플|연인|둘이서/,categories:['카페','바다','공원','소품샵'],reason:'데이트 분위기'},
    {id:'solo',label:'혼자 여행',re:/혼자|혼여|혼자서|혼자여행/,categories:['카페','뮤지엄','공원','바다'],reason:'혼자 머물기 좋은 여행'},
    {id:'pet',label:'반려동물',re:/강아지|반려견|반려동물|애견|댕댕/,categories:['공원','캠핑','바다'],reason:'반려동물 동반'},
    {id:'experience',label:'체험',re:/체험|만들기|공방|농촌|마을체험|직접해/,categories:['체험마을','관광지'],reason:'직접 하는 체험'},
    {id:'souvenir',label:'소품·쇼핑',re:/소품|기념품|쇼핑|편집샵|문구|굿즈/,categories:['소품샵','전통시장','관광지'],reason:'소품·기념품 쇼핑'},
    {id:'hot',label:'온천·따뜻함',re:/온천|스파|찜질|뜨끈|몸녹|따뜻하게쉬/,categories:['온천','관광지'],reason:'따뜻하게 쉬기'},
    {id:'camp',label:'캠핑·차박',re:/캠핑|차박|텐트|오토캠핑/,categories:['캠핑','바다','산'],reason:'캠핑·차박'},
    {id:'night',label:'야경·밤',re:/야경|밤에|밤풍경|불빛|조명/,categories:['바다','공원','관광지'],reason:'야경·밤 풍경'},
    {id:'relax',label:'휴식·힐링',re:/쉬고|쉬고싶|휴식|힐링|멍때리|느긋/,categories:['바다','공원','산','카페'],reason:'휴식·힐링'},
    {id:'short',label:'가볍게',re:/가볍게|잠깐|짧게|반나절|근교/,categories:['공원','카페','관광지'],reason:'짧고 가벼운 일정'}
  ];

  const matches=semanticRules.filter(r=>r.re.test(compact));
  const explicitCats=categoryLabels.filter(c=>m.includes(c)||(c==='뮤지엄'&&/(박물관|미술관)/.test(m))||(c==='바다'&&/(해변|해수욕장|바닷가|해안)/.test(m))||(c==='맛집'&&/(맛있는|식사|먹거리)/.test(m)));
  const semanticCats=[...new Set(matches.flatMap(r=>r.categories).filter(x=>categoryLabels.includes(x)))];
  const combinedCats=[...new Set([...explicitCats,...semanticCats])];
  if(combinedCats.length)patch.categories=combinedCats;
  if(/카페.*(빼|제외)|카페는.*(빼|제외)/.test(m))patch.categories=(patch.categories||context.categories||[]).filter(x=>x!=='카페');

  const regions=['서울','부산','대구','인천','광주','대전','울산','진주','사천','통영','거제','남해','여수','순천','하동','합천','산청','함양','거창','창원','김해','경주','전주','담양','공주','보령','군산','강릉','속초','춘천','안동','포항','제주','제천'];
  for(const r of regions)if(m.includes(r)){focus=r;break}

  const profile={
    keywords:matches.map(x=>x.label),
    matches:matches.map(x=>({id:x.id,label:x.label,categories:x.categories,reason:x.reason})),
    flags:{wantsCafe:matches.some(x=>x.id==='cafe'||x.id==='warmdrink'),quiet:matches.some(x=>x.id==='quiet'),rain:matches.some(x=>x.id==='rain'),wave:matches.some(x=>x.id==='wave')}
  };

  const travel=/여행|관광|여행지|코스|드라이브|바다|해변|산|카페|커피|라떼|맛집|뮤지엄|미술관|박물관|공원|시장|온천|캠핑|체험|데이트|당일치기|주차|날씨|교통|귀가|출발지|가고\s*싶|어디\s*갈|별|은하수|천체|밤하늘|노을|일몰|일출|해돋이|풍경|전망|경치|힐링|한적|실내|가족|아이|파도|비오|산책|걷기|숲|꽃|야경|쇼핑|소품|혼자|강아지|반려/;
  const app=/TRIP\s*QUEST|트립\s*퀘스트|설정|사용법|버튼|연비|휘발유|거리\s*바꿔|카테고리/i;
  if(/사용법|어떻게\s*써|기능\s*설명/.test(m))return {mode:'local',intent:'help',message:'출발지 → 취향 → 시간 → 추천 → 코스 순서로 진행합니다. 자연어로 여러 취향을 한 문장에 함께 말해도 분석합니다.',patch,focusQuery:focus,analysisKeywords:['사용법'],choices:[{label:'AI로 여행지 찾아보기',action:'ai_prompt',message:'가까운 국내 당일치기 여행지 추천해줘'},{label:'조건 직접 설정하기',action:'goto',step:2}]};
  if(!travel.test(m)&&!app.test(m))return {mode:'local',intent:'off_topic',message:'TRIP QUEST는 국내 여행과 프로그램 설정에 집중합니다. 여행과 연결되는 방향을 선택해 주세요.',patch:{},focusQuery:'',analysisKeywords:[],choices:[{label:'오늘 갈 여행지 찾기',action:'ai_prompt',message:'오늘 갈 국내 여행지 추천해줘'},{label:'기존 여행 조건 보기',action:'goto',step:2}]};

  const settings=/바꿔|변경|설정|빼|제외/.test(m)&&Object.keys(patch).length;
  const keywords=profile.keywords.length?profile.keywords:['국내여행'];
  const msg=settings?'요청한 여행 조건을 반영했습니다.':`요청을 ${keywords.join(' · ')} 키워드로 분석했습니다. 서로 다른 취향이 함께 들어와도 겹치는 조건이 많은 여행지를 우선 추천합니다.`;
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
    <div class="nearby-stop-head"><span>${String(i+1).padStart(2,'0')}</span><div><b>${esc(s.name)}</b><small>이 지점 주변 네이버 플레이스 검색</small></div></div>
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

async function loadConfig(){
  state.config=await api('/api/config');$('#gasPrice').value=state.config.defaultGasPrice;const p=state.config.providers;
  setText('#providerNow','모바일 즉시실행');setText('#updatedAt','v0.11 · 날씨 LIVE · 경로 근사');
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
function resetTrip(){state.targetKm=100;state.direction='전체';state.categories=['관광지'];state.recommendations=[];state.selected=null;state.selectedCourse=null;state.sharedPending=false;$('#distanceRange').value=100;syncDistanceUI();$$('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value==='전체'));syncCategoriesUI();$('#ranking').innerHTML='조건을 설정한 뒤 추천지를 찾아보세요.';$('#ranking').className='ranking empty-state';initTimes();setStep(1);toast('새 여행을 시작합니다.')}

function syncDistanceUI(){setText('#distanceValue',state.targetKm);$$('#distanceChoices button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.value)===state.targetKm))}
function syncCategoriesUI(){$$('#categoryChoices button').forEach(b=>b.classList.toggle('selected',state.categories.includes(b.dataset.value)));setText('#categoryCount',`${state.categories.length}개 선택`)}
function syncDirectionUI(){$$('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value===state.direction));setText('#directionValue',state.direction==='전체'?'상관없음':state.direction)}
function bindChoices(){
  $('#distanceRange').addEventListener('input',e=>{state.targetKm=Number(e.target.value);syncDistanceUI()});
  $('#distanceChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.targetKm=Number(b.dataset.value);$('#distanceRange').value=state.targetKm;syncDistanceUI()});
  $('#directionChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.direction=b.dataset.value;syncDirectionUI()});
  $('#categoryChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;b.classList.toggle('selected');state.categories=$$('#categoryChoices button.selected').map(x=>x.dataset.value);syncCategoriesUI();setStep(2)});
}
async function searchOrigin(){const q=$('#originSearch').value.trim();if(!q)return;$('#originResults').innerHTML='<div class="empty-state">출발지를 찾고 있습니다…</div>';try{const j=await api(`/api/geocode?q=${encodeURIComponent(q)}`);if(!j.items.length){$('#originResults').innerHTML='<div class="error">검색 결과가 없습니다.</div>';return}$('#originResults').innerHTML=j.items.map((x,i)=>`<button data-i="${i}"><span><b>${esc(x.name)}</b><br><small>${esc(x.address||'')}</small></span><span>선택 →</span></button>`).join('');$('#originResults').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const x=j.items[Number(b.dataset.i)];await setOrigin({...x,name:x.name});$('#originResults').innerHTML='';$('#originSearch').value='';toast('출발지를 설정했습니다.')};}catch(e){$('#originResults').innerHTML=`<span class="error">${esc(e.message)}</span>`}}

function currentPayload(){return {origin:state.origin,targetKm:state.targetKm,direction:state.direction,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value,gasPrice:Number($('#gasPrice').value||1700)}}
async function recommend(extra={}){if(!state.origin){toast('출발지를 먼저 설정하세요.');setStep(1);return}loading(true);setStep(4);$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='여행 후보를 계산하고 있습니다…';$('#noMatchActions').hidden=true;try{const j=await api('/api/recommend',{method:'POST',body:JSON.stringify({...currentPayload(),...extra})});state.recommendations=j.items||[];state.selected=null;renderRanking();drawMap();setText('#resultCaption',`${state.targetKm}km · ${state.direction==='전체'?'전체 방향':state.direction} · ${state.categories.join(' · ')||'전체 취향'}`);setText('#mapStatus',`후보 ${state.recommendations.length}곳 · ${j.source||'데이터 검색'}`)}catch(e){$('#ranking').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);setStep(4)}}
function renderRanking(){
  if(!state.recommendations.length){$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='조건에 맞는 후보를 찾지 못했습니다.<br>아래 버튼으로 조건을 조금 넓혀보세요.';$('#noMatchActions').hidden=false;return}
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
  $('#courseList').innerHTML=courses.map(c=>`<article class="course-card" data-course="${c.id}"><div class="course-top"><span class="course-id">${c.id}</span><span class="badge">날씨 적합 ${esc(c.weatherFit)}</span></div><h4>${esc(c.title)}</h4><p>${esc(c.reason)}</p><ol class="stops">${c.stops.map((s,i)=>`<li>${i+1}. ${esc(s.name)}</li>`).join('')}</ol><div class="course-stats"><span>${fmtKm(c.route.distanceKm)}</span><span>${fmtMin(c.route.timeMin)}</span><span>약 ${fmtWon(c.estimatedCost.total)}</span></div><button class="btn secondary choose-course" type="button">${c.id}코스 선택</button></article>`).join('');

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
  if(Number.isFinite(Number(patch.targetKm))){state.targetKm=Math.max(30,Math.min(250,Math.round(Number(patch.targetKm)/10)*10));$('#distanceRange').value=state.targetKm;syncDistanceUI()}
  if(patch.direction&&['전체','북','북동','동','남동','남','남서','서','북서'].includes(patch.direction)){state.direction=patch.direction;syncDirectionUI()}
  if(Array.isArray(patch.categories)){state.categories=[...new Set(patch.categories.filter(x=>categoryLabels.includes(x)))];if(!state.categories.length&&patch.keepEmpty!==true)state.categories=['관광지'];syncCategoriesUI()}
  if(patch.departure)$('#departTime').value=patch.departure;if(patch.returnTime)$('#returnTime').value=patch.returnTime;if(patch.gasPrice)$('#gasPrice').value=patch.gasPrice;updateSchedulePreview();
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
    state.recommendations=result.items;state.selected=null;renderRanking();drawMap();
    setText('#resultCaption',`AI 요청 반영 · ${state.targetKm}km · ${state.categories.join(' · ')||'전체 취향'}`);
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

async function askAI(message){
  if(!message.trim()||state.aiBusy)return;
  state.aiBusy=true;
  const btn=$('#aiSend'),status=$('#aiSearchStatus');
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
    await new Promise(r=>setTimeout(r,220));
    btn.textContent='추천지 찾는 중…';
    if(status)status.textContent='2/2 · 분석한 취향과 조건으로 추천지 계산 중…';

    const result=await api('/api/ai-search',{method:'POST',body:JSON.stringify({message:message.trim(),context:currentPayload()})});
    await new Promise(r=>setTimeout(r,220));

    showAI(result);
    const count=Array.isArray(result.items)?result.items.length:0;
    const keys=(result.analysisKeywords||[]).join(' · ');
    if(Array.isArray(result.items)){
      setText('#resultCaption',keys?`AI 분석: ${keys} · 추천지 ${count}곳`:`AI 추천지 ${count}곳`);
      setText('#mapStatus',`AI 분석 기반 후보 ${count}곳`);
      setStep(4);
      setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
    } else if(result.intent==='travel_search'){
      $('#ranking').className='ranking empty-state';
      $('#ranking').innerHTML='조건에 맞는 추천지를 찾지 못했습니다. 거리나 취향을 조금 넓혀보세요.';
      setStep(4);
    }

    btn.classList.add('ai-done');
    btn.textContent=count?`추천 완료 ✓ · ${count}곳`:'분석 완료 ✓';
    if(status){status.className='ai-search-status done';status.textContent=count?`완료 · AI 분석을 반영한 추천지 ${count}곳입니다.`:'완료 · 요청 분석이 끝났습니다.'}
    setTimeout(()=>{if(!state.aiBusy){btn.classList.remove('ai-done');btn.textContent='AI로 찾기'}},1800);
  }catch(e){
    btn.classList.add('ai-error');btn.textContent='검색 실패 · 다시 시도';
    if(status){status.className='ai-search-status error';status.textContent=e.message||'검색 중 문제가 생겼습니다.'}
    $('#ranking').className='ranking empty-state';
    $('#ranking').innerHTML=`<span class="error">${esc(e.message||'AI 추천을 진행하지 못했습니다.')}</span>`;
    setText('#resultCaption','AI 추천을 진행하려면 출발지 또는 위치 권한이 필요합니다.');
    showAI({mode:'local',message:e.message||'AI 요청을 처리하지 못했습니다.',analysisKeywords:[],choices:[{label:'출발지 설정하기',action:'goto',step:1},{label:'다시 입력하기',action:'focus'}]});
  }finally{
    state.aiBusy=false;btn.disabled=false;
  }
}
function handleAIChoice(c){if(!c)return;if(c.action==='search'){if(c.patch)applyPatch(c.patch);recommend(c.focusQuery?{focusQuery:c.focusQuery}:{})}else if(c.action==='goto'){setStep(c.step||2)}else if(c.action==='ai_prompt'){const m=c.message||'';$('#aiInput').value=m;askAI(m)}else if(c.action==='focus'){$('#aiInput').focus()}else if(c.action==='reset'){resetTrip()}}

function bindActions(){
  $('#locateBtn').onclick=()=>useLocation(false);$('#searchOriginBtn').onclick=searchOrigin;$('#originSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchOrigin()});
  $('#departTime').addEventListener('change',updateSchedulePreview);$('#returnTime').addEventListener('change',updateSchedulePreview);$('#resetBtn').onclick=resetTrip;$('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn').onclick=()=>setStep(state.step-1);$('#nextBtn').onclick=async()=>{if(state.step===1){if(state.origin)setStep(2);else await useLocation(true)}else if(state.step===2)setStep(3);else if(state.step===3)await recommend();else if(state.step===4){if(state.selected)setStep(5)}else resetTrip()};
  $$('.progress-step').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(n<=state.step||n<=3)setStep(n)});$('#editConditionsBtn').onclick=()=>setStep(2);$('#changePlaceBtn').onclick=()=>setStep(4);
  $('#noMatchActions').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='distance'){state.targetKm=Math.min(250,state.targetKm+50);$('#distanceRange').value=state.targetKm;syncDistanceUI()}else{state.categories=[];syncCategoriesUI()}recommend()};
  $('#aiSend').onclick=()=>askAI($('#aiInput').value);$('#aiInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')askAI($('#aiInput').value)});$('#quickPrompts').onclick=e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.prompt;$('#aiInput').value=m;askAI(m)};
}

async function boot(){initTimes();initMap();bindChoices();bindActions();initPWA();syncDistanceUI();syncDirectionUI();syncCategoriesUI();setStep(1);try{await loadConfig()}catch{setText('#providerNow','설정 확인 필요')}setInterval(refreshLive,10*60*1000)}
boot();
