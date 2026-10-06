import { TOP_REGIONS } from '../data/selection-taxonomy.js';

const NOMINATIM='https://nominatim.openstreetmap.org/search';
const OVERPASS_ENDPOINTS=[
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const REGION_CACHE='trip-quest-test-region-selector-v5';
const REGION_CACHE_MS=30*24*60*60*1000;
const LIVE_CACHE_MS=15*60*1000;
const liveCache=new Map();

function readCache(){try{return JSON.parse(localStorage.getItem(REGION_CACHE)||'{}')}catch{return {}}}
function writeCache(v){try{localStorage.setItem(REGION_CACHE,JSON.stringify(v))}catch{}}
function cacheGet(k){const c=readCache(),x=c[k];return x&&Date.now()-x.savedAt<REGION_CACHE_MS?x.value:null}
function cacheSet(k,v){const c=readCache();c[k]={savedAt:Date.now(),value:v};writeCache(c)}
function liveCacheGet(k){const x=liveCache.get(k);if(!x||Date.now()-x.at>LIVE_CACHE_MS){liveCache.delete(k);return null}return x.value}
function liveCacheSet(k,v){liveCache.set(k,{at:Date.now(),value:v});return v}

async function overpassJson(query,{timeoutMs=2200,label='지도 데이터'}={}){
  const cached=liveCacheGet(query);if(cached)return cached;
  const errors=[];
  for(const endpoint of OVERPASS_ENDPOINTS){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const res=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},
        body:new URLSearchParams({data:query}),signal:controller.signal
      });
      clearTimeout(timer);
      if(!res.ok){errors.push(endpoint+' HTTP '+res.status);continue}
      return liveCacheSet(query,await res.json());
    }catch(e){
      clearTimeout(timer);
      errors.push(endpoint+' '+(e?.name==='AbortError'?'timeout':(e?.message||'network error')));
    }
  }
  console.warn('Overpass all endpoints failed',label,errors);
  throw new Error(label+' 응답 지연');
}

function boundaryFromNominatim(x,fallbackName=''){
  const bbox=(x.boundingbox||[]).map(Number);
  return {name:fallbackName||x.name||String(x.display_name||'').split(',')[0],displayName:x.display_name||fallbackName,osmType:x.osm_type,osmId:Number(x.osm_id),adminLevel:Number(x.extratags?.admin_level||0)||null,lat:Number(x.lat),lng:Number(x.lon),bbox:bbox.length===4?bbox:null};
}
function areaId(boundary){return boundary?.osmType==='relation'&&Number.isFinite(boundary.osmId)?3600000000+Number(boundary.osmId):null}
export function topRegions(){return [...TOP_REGIONS]}
export function overpassEndpoints(){return [...OVERPASS_ENDPOINTS]}

export async function resolveRegion(name){
  const key='resolve:'+name,hit=cacheGet(key);if(hit)return hit;
  const params=new URLSearchParams({q:name+', 대한민국',format:'jsonv2',limit:'6',countrycodes:'kr',addressdetails:'1',extratags:'1','accept-language':'ko'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const res=await fetch(NOMINATIM+'?'+params.toString(),{headers:{Accept:'application/json'},signal:controller.signal});
    if(!res.ok)throw new Error('지역 정보를 불러오지 못했습니다.');
    const list=await res.json(),choice=list.find(x=>x.osm_type==='relation'&&x.class==='boundary')||list.find(x=>x.osm_type==='relation')||list[0];
    if(!choice)throw new Error(name+' 지역을 찾지 못했습니다.');
    const value=boundaryFromNominatim(choice,name);cacheSet(key,value);return value;
  }finally{clearTimeout(timer)}
}
export async function regionChildren(parent,adminLevel){
  const aid=areaId(parent);if(!aid)return [];
  const levels=adminLevel===6?[6,7]:adminLevel===8?[8,9]:[adminLevel],key='children-v5:'+aid+':'+levels.join('-'),hit=cacheGet(key);if(hit)return hit;
  const query='[out:json][timeout:12];area('+aid+')->.a;relation(area.a)["boundary"~"^(administrative|legal)$"]["admin_level"~"^('+levels.join('|')+')$"];out center tags qt;';
  const json=await overpassJson(query,{timeoutMs:3500,label:'하위 행정구역'});
  const seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const name=String(el.tags?.['name:ko']||el.tags?.name||'').trim();
    if(!name||seen.has(name))continue;
    if(adminLevel===8&&!/(동|읍|면|가|리)$/.test(name))continue;
    seen.add(name);items.push({name,displayName:name,osmType:'relation',osmId:Number(el.id),adminLevel:Number(el.tags?.admin_level||adminLevel),boundaryType:String(el.tags?.boundary||'administrative'),lat:Number(el.center?.lat),lng:Number(el.center?.lon),bbox:null});
  }
  items.sort((a,b)=>a.name.localeCompare(b.name,'ko'));cacheSet(key,items);return items;
}

const CATEGORY_SELECTORS={
  '공원':['nwr(area.searchArea)["leisure"~"^(park|garden)$"]["name"];'],
  '백화점':['nwr(area.searchArea)["shop"="department_store"]["name"];'],
  '전통시장':['nwr(area.searchArea)["amenity"="marketplace"]["name"];'],
  '해수욕장':['nwr(area.searchArea)["natural"="beach"]["name"~"해수욕장|Beach",i];'],
  '산':['nwr(area.searchArea)["natural"="peak"]["name"];'],
  '사찰':['nwr(area.searchArea)["amenity"="place_of_worship"]["religion"="buddhist"]["name"];'],
  '산책로':['rel(area.searchArea)["route"~"^(hiking|walking)$"]["name"];'],
  '카페거리':['nwr(area.searchArea)["name"~"카페거리|카페 거리|Cafe Street",i];'],
  '쇼핑거리':['nwr(area.searchArea)["name"~"쇼핑거리|패션거리|로데오거리|지하상가|지하도상가|Shopping Street",i];'],
  '관광명소':['nwr(area.searchArea)["tourism"~"^(attraction|viewpoint)$"]["name"];'],
  '박물관미술관':['nwr(area.searchArea)["tourism"~"^(museum|gallery)$"]["name"];'],
  '대형복합시설':['nwr(area.searchArea)["tourism"~"^(theme_park|zoo|aquarium)$"]["name"];'],
  '대형도서관':['nwr(area.searchArea)["amenity"="library"]["name"];']
};

const BAD_NAME=/주차장|화장실|정류장|관리사무소|사무실|창고|입구|출구|게이트|공터|배수지/i;
const DESTINATION_WORD=/전망대|전망|폭포|동굴|계곡|정원|수목원|생태|문화마을|벽화|광장|랜드마크|관광|해안|등대|성곽|성지|호수|공원/i;
function metadataCount(tags={}){return ['wikidata','wikipedia','website','opening_hours','description','heritage','fee'].filter(k=>tags[k]).length}
function visitorWorthy(tags={},category='',name=''){
  if(!name||name.length<2||BAD_NAME.test(name))return false;
  const meta=metadataCount(tags);
  if(category==='해수욕장')return /해수욕장|Beach/i.test(name);
  if(category==='산'){
    const ele=Number.parseFloat(String(tags.ele||'').replace(/[^0-9.-]/g,''));
    return meta>0||(Number.isFinite(ele)&&ele>=150);
  }
  if(category==='사찰')return meta>0||/(사|암|사찰|寺)$/.test(name);
  if(category==='산책로')return ['hiking','walking'].includes(tags.route)&&name.length>=3;
  if(category==='관광명소')return meta>0||DESTINATION_WORD.test(name);
  if(category==='박물관미술관'||category==='대형복합시설'||category==='백화점')return true;
  if(category==='전통시장')return /시장|Market/i.test(name);
  if(category==='대형도서관')return /(도서관|라이브러리)/.test(name);
  if(category==='카페거리')return /카페거리|카페 거리|Cafe Street/i.test(name);
  if(category==='쇼핑거리')return /쇼핑거리|패션거리|로데오거리|지하상가|지하도상가|Shopping Street/i.test(name);
  return true;
}
function categoryFor(tags={},selected=[]){
  for(const c of selected){
    if(c==='공원'&&['park','garden'].includes(tags.leisure))return c;
    if(c==='백화점'&&tags.shop==='department_store')return c;
    if(c==='전통시장'&&tags.amenity==='marketplace')return c;
    if(c==='해수욕장'&&tags.natural==='beach')return c;
    if(c==='산'&&tags.natural==='peak')return c;
    if(c==='사찰'&&tags.amenity==='place_of_worship'&&tags.religion==='buddhist')return c;
    if(c==='산책로'&&['hiking','walking'].includes(tags.route))return c;
    if(c==='카페거리'&&/카페거리|카페 거리|Cafe Street/i.test(tags.name||''))return c;
    if(c==='쇼핑거리'&&/쇼핑거리|패션거리|로데오거리|지하상가|지하도상가|Shopping Street/i.test(tags.name||''))return c;
    if(c==='박물관미술관'&&['museum','gallery'].includes(tags.tourism))return c;
    if(c==='대형복합시설'&&['theme_park','zoo','aquarium'].includes(tags.tourism))return c;
    if(c==='대형도서관'&&tags.amenity==='library')return c;
    if(c==='관광명소'&&['attraction','viewpoint'].includes(tags.tourism))return c;
  }
  return selected[0]||'관광명소';
}
function point(el){const lat=Number(el.lat??el.center?.lat),lng=Number(el.lon??el.center?.lon);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null}
function environment(category=''){if(['공원','산책로','해수욕장','산'].includes(category))return 'outdoor';if(['백화점','대형도서관','박물관미술관'].includes(category))return 'indoor';return 'mixed'}
function facilityInfo(tags={},category=''){
  const env=environment(category);
  return {parking:['yes','surface','underground','multi-storey'].includes(tags.parking)||tags['parking:condition']!=null,indoor:env!=='outdoor',outdoor:env!=='indoor',pet:['yes','leashed'].includes(tags.dog)||tags.pets==='yes',wheelchair:tags.wheelchair==='yes',toilets:tags.toilets==='yes'};
}
function passesFacilities(info,filters=[]){return filters.every(x=>info[x]===true)}
function address(tags={},region=''){return [tags['addr:province'],tags['addr:city']||tags['addr:county'],tags['addr:district'],tags['addr:town'],tags['addr:neighbourhood'],tags['addr:street']].filter(Boolean).join(' ')||region}
function qualityScore(tags={},category=''){
  const base={관광명소:78,박물관미술관:82,대형복합시설:84,백화점:80,산책로:76,산:74,사찰:74,해수욕장:82}[category]||70;
  return Math.min(96,base+metadataCount(tags)*3);
}
function parseElements(json,category,facilities,boundary){
  const seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const p=point(el),tags=el.tags||{},name=String(tags['name:ko']||tags.name||'').trim();if(!p||!name)continue;
    const cat=categoryFor(tags,[category]);if(!visitorWorthy(tags,cat,name))continue;
    const fac=facilityInfo(tags,cat);if(!passesFacilities(fac,facilities))continue;
    const key=name+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);if(seen.has(key))continue;seen.add(key);
    items.push({id:'osm-'+el.type+'-'+el.id,name,category:cat,lat:p.lat,lng:p.lng,address:address(tags,boundary.name),score:qualityScore(tags,cat),facilities:fac,liveRegion:boundary.name,liveSource:'OpenStreetMap 보조',aiReason:'여행 목적지 품질 필터 통과 · 지도 보조'});
  }
  return items;
}
export async function searchRegionPlaces({boundary,categories=[],facilities=[]}){
  const aid=areaId(boundary);if(!aid)throw new Error('선택한 지역 경계를 확인하지 못했습니다.');
  const selected=[...new Set(categories)].filter(c=>CATEGORY_SELECTORS[c]);if(!selected.length)return {items:[],source:'지도 보조'};
  const tasks=selected.map(async category=>{
    const query='[out:json][timeout:10];area('+aid+')->.searchArea;('+CATEGORY_SELECTORS[category].join('')+');out center tags qt 70;';
    const json=await overpassJson(query,{timeoutMs:2100,label:category});
    return {category,items:parseElements(json,category,facilities,boundary)};
  });
  const settled=await Promise.allSettled(tasks),items=[],failed=[];
  for(let i=0;i<settled.length;i++){
    const r=settled[i];
    if(r.status==='fulfilled')items.push(...r.value.items);
    else failed.push({category:selected[i],error:r.reason?.message||'응답 지연'});
  }
  const seen=new Set(),deduped=items.filter(x=>{const k=x.name+'|'+x.lat.toFixed(4)+'|'+x.lng.toFixed(4);if(seen.has(k))return false;seen.add(k);return true});
  deduped.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name,'ko'));
  return {items:deduped.slice(0,90),source:failed.length?'여행지 선별 지도 보조 · 일부 응답 지연':'여행지 선별 지도 보조',boundary,failed};
}

const NEARBY_BATCHES=[
  ['nwr(around:{R},{LAT},{LNG})["leisure"="park"]["name"];','nwr(around:{R},{LAT},{LNG})["amenity"="marketplace"]["name"];','nwr(around:{R},{LAT},{LNG})["shop"="department_store"]["name"];'],
  ['nwr(around:{R},{LAT},{LNG})["tourism"~"^(attraction|viewpoint|museum|gallery|theme_park|zoo|aquarium)$"]["name"];'],
  ['nwr(around:{R},{LAT},{LNG})["amenity"="place_of_worship"]["religion"="buddhist"]["name"];','nwr(around:{R},{LAT},{LNG})["natural"="beach"]["name"~"해수욕장|Beach",i];','nwr(around:{R},{LAT},{LNG})["natural"="peak"]["name"];']
];
export async function searchNearbyPlaces(anchor,radius=5000){
  const replace=s=>s.replaceAll('{R}',String(radius)).replaceAll('{LAT}',String(anchor.lat)).replaceAll('{LNG}',String(anchor.lng));
  const tasks=NEARBY_BATCHES.map(async batch=>{
    const q='[out:json][timeout:9];('+batch.map(replace).join('')+');out center tags qt 60;';
    return overpassJson(q,{timeoutMs:1900,label:'주변 장소'});
  });
  const settled=await Promise.allSettled(tasks),seen=new Set(),items=[];
  const nearCats=['관광명소','공원','박물관미술관','전통시장','백화점','사찰','해수욕장','산','대형복합시설'];
  for(const r of settled){
    if(r.status!=='fulfilled')continue;
    for(const el of r.value.elements||[]){
      const p=point(el),tags=el.tags||{},name=String(tags['name:ko']||tags.name||'').trim();if(!p||!name||name===anchor.name)continue;
      const cat=categoryFor(tags,nearCats);if(!visitorWorthy(tags,cat,name))continue;
      const key=name+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);if(seen.has(key))continue;seen.add(key);
      items.push({id:'osm-'+el.type+'-'+el.id,name,category:cat,lat:p.lat,lng:p.lng,address:address(tags,''),score:qualityScore(tags,cat),liveSource:'OpenStreetMap 보조'});
    }
  }
  items.sort((a,b)=>(b.score||0)-(a.score||0));
  return items.slice(0,60);
}
