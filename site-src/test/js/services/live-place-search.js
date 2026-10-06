import { TOP_REGIONS } from '../data/selection-taxonomy.js';

const NOMINATIM='https://nominatim.openstreetmap.org/search';
const OVERPASS='https://overpass-api.de/api/interpreter';
const REGION_CACHE='trip-quest-test-region-selector-v3';
const REGION_CACHE_MS=30*24*60*60*1000;
function readCache(){try{return JSON.parse(localStorage.getItem(REGION_CACHE)||'{}')}catch{return {}}}
function writeCache(v){try{localStorage.setItem(REGION_CACHE,JSON.stringify(v))}catch{}}
function cacheGet(k){const c=readCache(),x=c[k];return x&&Date.now()-x.savedAt<REGION_CACHE_MS?x.value:null}
function cacheSet(k,v){const c=readCache();c[k]={savedAt:Date.now(),value:v};writeCache(c)}
function boundaryFromNominatim(x,fallbackName=''){
  const bbox=(x.boundingbox||[]).map(Number);
  return {name:fallbackName||x.name||String(x.display_name||'').split(',')[0],displayName:x.display_name||fallbackName,osmType:x.osm_type,osmId:Number(x.osm_id),adminLevel:Number(x.extratags?.admin_level||0)||null,lat:Number(x.lat),lng:Number(x.lon),bbox:bbox.length===4?bbox:null};
}
function areaId(boundary){return boundary?.osmType==='relation'&&Number.isFinite(boundary.osmId)?3600000000+Number(boundary.osmId):null}
export function topRegions(){return [...TOP_REGIONS]}
export async function resolveRegion(name){
  const key='resolve:'+name,hit=cacheGet(key);if(hit)return hit;
  const params=new URLSearchParams({q:name+', 대한민국',format:'jsonv2',limit:'6',countrycodes:'kr',addressdetails:'1',extratags:'1','accept-language':'ko'});
  const res=await fetch(NOMINATIM+'?'+params.toString(),{headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error('지역 정보를 불러오지 못했습니다.');
  const list=await res.json(),choice=list.find(x=>x.osm_type==='relation'&&x.class==='boundary')||list.find(x=>x.osm_type==='relation')||list[0];
  if(!choice)throw new Error(name+' 지역을 찾지 못했습니다.');
  const value=boundaryFromNominatim(choice,name);cacheSet(key,value);return value;
}
export async function regionChildren(parent,adminLevel){
  const aid=areaId(parent);if(!aid)return [];
  const levels=adminLevel===6?[6,7]:adminLevel===8?[8,9]:[adminLevel],key='children-v3:'+aid+':'+levels.join('-'),hit=cacheGet(key);if(hit)return hit;
  const query='[out:json][timeout:20];area('+aid+')->.a;relation(area.a)["boundary"~"^(administrative|legal)$"]["admin_level"~"^('+levels.join('|')+')$"];out center tags;';
  const res=await fetch(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query})});
  if(!res.ok)throw new Error('하위 행정구역을 불러오지 못했습니다.');
  const json=await res.json(),seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const name=String(el.tags?.['name:ko']||el.tags?.name||'').trim();
    if(!name||seen.has(name))continue;
    if(adminLevel===8&&!/(동|읍|면|가|리)$/.test(name))continue;
    seen.add(name);items.push({name,displayName:name,osmType:'relation',osmId:Number(el.id),adminLevel:Number(el.tags?.admin_level||adminLevel),boundaryType:String(el.tags?.boundary||'administrative'),lat:Number(el.center?.lat),lng:Number(el.center?.lon),bbox:null});
  }
  items.sort((a,b)=>a.name.localeCompare(b.name,'ko'));cacheSet(key,items);return items;
}
const CATEGORY_SELECTORS={
  '공원':['nwr(area.searchArea)["leisure"="park"]["name"];','nwr(area.searchArea)["leisure"="garden"]["name"];'],
  '대형마트':['nwr(area.searchArea)["shop"="supermarket"]["name"];'],
  '백화점':['nwr(area.searchArea)["shop"="department_store"]["name"];'],
  '전통시장':['nwr(area.searchArea)["amenity"="marketplace"]["name"];'],
  '해수욕장':['nwr(area.searchArea)["natural"="beach"]["name"];'],
  '산':['nwr(area.searchArea)["natural"="peak"]["name"];'],
  '사찰':['nwr(area.searchArea)["amenity"="place_of_worship"]["religion"="buddhist"]["name"];'],
  '산책로':['nwr(area.searchArea)["route"="hiking"]["name"];','nwr(area.searchArea)["highway"="path"]["name"];'],
  '카페거리':['nwr(area.searchArea)["name"~"카페거리|카페 거리|Cafe Street",i];'],
  '쇼핑거리':['nwr(area.searchArea)["name"~"쇼핑거리|패션거리|로데오거리|지하상가|지하도상가|Shopping Street",i];'],
  '문화시설':['nwr(area.searchArea)["amenity"~"arts_centre|theatre|cinema"]["name"];'],
  '관광명소':['nwr(area.searchArea)["tourism"~"attraction|viewpoint"]["name"];','nwr(area.searchArea)["historic"]["name"];'],
  '박물관미술관':['nwr(area.searchArea)["tourism"~"museum|gallery"]["name"];'],
  '체험':['nwr(area.searchArea)["craft"]["name"];'],
  '대형복합시설':['nwr(area.searchArea)["tourism"~"theme_park|zoo|aquarium"]["name"];'],
  '대형도서관':['nwr(area.searchArea)["amenity"="library"]["name"];']
};
function point(el){const lat=Number(el.lat??el.center?.lat),lng=Number(el.lon??el.center?.lon);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null}
function categoryFor(tags={},selected=[]){
  for(const c of selected){
    if(c==='공원'&&['park','garden'].includes(tags.leisure))return c;
    if(c==='대형마트'&&tags.shop==='supermarket')return c;
    if(c==='백화점'&&tags.shop==='department_store')return c;
    if(c==='전통시장'&&tags.amenity==='marketplace')return c;
    if(c==='해수욕장'&&tags.natural==='beach')return c;
    if(c==='산'&&tags.natural==='peak')return c;
    if(c==='사찰'&&tags.amenity==='place_of_worship'&&tags.religion==='buddhist')return c;
    if(c==='산책로'&&(tags.route==='hiking'||tags.highway==='path'))return c;
    if(c==='카페거리'&&/카페거리|카페 거리|Cafe Street/i.test(tags.name||''))return c;
    if(c==='쇼핑거리'&&/쇼핑거리|패션거리|로데오거리|지하상가|지하도상가|Shopping Street/i.test(tags.name||''))return c;
    if(c==='문화시설'&&['arts_centre','theatre','cinema'].includes(tags.amenity))return c;
    if(c==='박물관미술관'&&['museum','gallery'].includes(tags.tourism))return c;
    if(c==='체험'&&tags.craft)return c;
    if(c==='대형복합시설'&&['theme_park','zoo','aquarium'].includes(tags.tourism))return c;
    if(c==='대형도서관'&&tags.amenity==='library')return c;
    if(c==='관광명소'&&(tags.tourism==='attraction'||tags.tourism==='viewpoint'||tags.historic))return c;
  }
  return selected[0]||'관광명소';
}
function environment(category=''){if(['공원','산책로','해수욕장','산'].includes(category))return 'outdoor';if(['대형마트','백화점','대형도서관','박물관미술관','문화시설'].includes(category))return 'indoor';return 'mixed'}
function facilityInfo(tags={},category=''){
  const env=environment(category);
  return {parking:['yes','surface','underground','multi-storey'].includes(tags.parking)||tags['parking:condition']!=null,indoor:env!=='outdoor',outdoor:env!=='indoor',pet:['yes','leashed'].includes(tags.dog)||tags.pets==='yes',wheelchair:tags.wheelchair==='yes',toilets:tags.toilets==='yes'};
}
function passesFacilities(info,filters=[]){return filters.every(x=>info[x]===true)}
function address(tags={},region=''){return [tags['addr:province'],tags['addr:city']||tags['addr:county'],tags['addr:district'],tags['addr:town'],tags['addr:neighbourhood'],tags['addr:street']].filter(Boolean).join(' ')||region}
export async function searchRegionPlaces({boundary,categories=[],facilities=[]}){
  const aid=areaId(boundary);if(!aid)throw new Error('선택한 지역 경계를 확인하지 못했습니다.');
  const selected=[...new Set(categories)].filter(c=>CATEGORY_SELECTORS[c]);if(!selected.length)return {items:[],source:'지도 보조'};
  const query='[out:json][timeout:22];area('+aid+')->.searchArea;('+[...new Set(selected.flatMap(c=>CATEGORY_SELECTORS[c]))].join('')+');out center tags 160;';
  const res=await fetch(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query})});
  if(!res.ok)throw new Error('지도 보조 데이터를 불러오지 못했습니다.');
  const json=await res.json(),seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const p=point(el),tags=el.tags||{},name=String(tags['name:ko']||tags.name||'').trim();if(!p||!name)continue;
    const cat=categoryFor(tags,selected),fac=facilityInfo(tags,cat);if(!passesFacilities(fac,facilities))continue;
    const key=name+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);if(seen.has(key))continue;seen.add(key);
    items.push({id:'osm-'+el.type+'-'+el.id,name,category:cat,lat:p.lat,lng:p.lng,address:address(tags,boundary.name),score:68,facilities:fac,liveRegion:boundary.name,liveSource:'OpenStreetMap 보조',aiReason:'공식 DB 미구축 카테고리 · 지도 보조 데이터'});
  }
  return {items:items.slice(0,80),source:'OpenStreetMap 보조',boundary};
}
export async function searchNearbyPlaces(anchor,radius=5000){
  const q='[out:json][timeout:18];('+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["leisure"="park"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["tourism"~"attraction|viewpoint|museum|gallery|theme_park|zoo|aquarium"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["amenity"="marketplace"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["shop"="department_store"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["amenity"="library"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["amenity"="place_of_worship"]["religion"="buddhist"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["natural"="beach"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["natural"="peak"]["name"];'+
  ');out center tags 80;';
  const res=await fetch(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:q})});
  if(!res.ok)return [];
  const json=await res.json(),seen=new Set(),items=[],nearCats=['관광명소','공원','박물관미술관','전통시장','백화점','사찰','해수욕장','산','대형복합시설','대형도서관'];
  for(const el of json.elements||[]){
    const p=point(el),tags=el.tags||{},name=String(tags['name:ko']||tags.name||'').trim();if(!p||!name||name===anchor.name)continue;
    const key=name+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);if(seen.has(key))continue;seen.add(key);
    items.push({id:'osm-'+el.type+'-'+el.id,name,category:categoryFor(tags,nearCats),lat:p.lat,lng:p.lng,address:address(tags,''),liveSource:'OpenStreetMap 보조'});
  }
  return items;
}
