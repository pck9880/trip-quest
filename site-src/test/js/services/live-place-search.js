import { TOP_REGIONS } from '../data/selection-taxonomy.js';

const NOMINATIM='https://nominatim.openstreetmap.org/search';
const OVERPASS='https://overpass-api.de/api/interpreter';
const REGION_CACHE='trip-quest-test-region-selector-v1';
const REGION_CACHE_MS=30*24*60*60*1000;

function readCache(){try{return JSON.parse(localStorage.getItem(REGION_CACHE)||'{}')}catch{return {}}}
function writeCache(v){try{localStorage.setItem(REGION_CACHE,JSON.stringify(v))}catch{}}
function cacheGet(k){const c=readCache(),x=c[k];return x&&Date.now()-x.savedAt<REGION_CACHE_MS?x.value:null}
function cacheSet(k,v){const c=readCache();c[k]={savedAt:Date.now(),value:v};writeCache(c)}

function boundaryFromNominatim(x,fallbackName=''){
  const bbox=(x.boundingbox||[]).map(Number);
  return {
    name:fallbackName||x.name||String(x.display_name||'').split(',')[0],
    displayName:x.display_name||fallbackName,
    osmType:x.osm_type,
    osmId:Number(x.osm_id),
    adminLevel:Number(x.extratags?.admin_level||0)||null,
    lat:Number(x.lat),
    lng:Number(x.lon),
    bbox:bbox.length===4?bbox:null
  };
}
function areaId(boundary){
  return boundary?.osmType==='relation'&&Number.isFinite(boundary.osmId)
    ?3600000000+Number(boundary.osmId)
    :null;
}

export function topRegions(){return [...TOP_REGIONS]}

export async function resolveRegion(name){
  const key='resolve:'+name;
  const hit=cacheGet(key); if(hit)return hit;
  const params=new URLSearchParams({
    q:name+', 대한민국',format:'jsonv2',limit:'6',countrycodes:'kr',
    addressdetails:'1',extratags:'1','accept-language':'ko'
  });
  const res=await fetch(NOMINATIM+'?'+params.toString(),{headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error('지역 정보를 불러오지 못했습니다.');
  const list=await res.json();
  const choice=list.find(x=>x.osm_type==='relation'&&x.class==='boundary')||list.find(x=>x.osm_type==='relation')||list[0];
  if(!choice)throw new Error(name+' 지역을 찾지 못했습니다.');
  const value=boundaryFromNominatim(choice,name);
  cacheSet(key,value); return value;
}

export async function regionChildren(parent,adminLevel){
  const aid=areaId(parent);
  if(!aid)return [];
  const key='children:'+aid+':'+adminLevel;
  const hit=cacheGet(key); if(hit)return hit;
  const query='[out:json][timeout:18];area('+aid+')->.a;relation(area.a)["boundary"="administrative"]["admin_level"="'+adminLevel+'"];out center tags;';
  const body=new URLSearchParams({data:query});
  const res=await fetch(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
  if(!res.ok)throw new Error('하위 행정구역을 불러오지 못했습니다.');
  const json=await res.json();
  const seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const name=String(el.tags?.['name:ko']||el.tags?.name||'').trim();
    if(!name||seen.has(name))continue;
    seen.add(name);
    items.push({
      name,displayName:name,osmType:'relation',osmId:Number(el.id),adminLevel:Number(el.tags?.admin_level||adminLevel),
      lat:Number(el.center?.lat),lng:Number(el.center?.lon),bbox:null
    });
  }
  items.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  cacheSet(key,items); return items;
}

const CATEGORY_SELECTORS={
  '공원':['nwr(area.searchArea)["leisure"="park"]["name"];','nwr(area.searchArea)["leisure"="garden"]["name"];'],
  '사찰':['nwr(area.searchArea)["amenity"="place_of_worship"]["religion"="buddhist"]["name"];'],
  '마트':['nwr(area.searchArea)["shop"="supermarket"]["name"];','nwr(area.searchArea)["shop"="convenience"]["name"];'],
  '문화시설':['nwr(area.searchArea)["amenity"="arts_centre"]["name"];','nwr(area.searchArea)["amenity"="theatre"]["name"];','nwr(area.searchArea)["amenity"="cinema"]["name"];','nwr(area.searchArea)["amenity"="community_centre"]["name"];'],
  '산책로':['nwr(area.searchArea)["highway"="footway"]["name"];','nwr(area.searchArea)["highway"="path"]["name"];'],
  '백화점':['nwr(area.searchArea)["shop"="department_store"]["name"];'],
  '카페':['nwr(area.searchArea)["amenity"="cafe"]["name"];','nwr(area.searchArea)["shop"="bakery"]["name"];'],
  '맛집':['nwr(area.searchArea)["amenity"="restaurant"]["name"];','nwr(area.searchArea)["amenity"="food_court"]["name"];'],
  '관광명소':['nwr(area.searchArea)["tourism"="attraction"]["name"];','nwr(area.searchArea)["tourism"="viewpoint"]["name"];','nwr(area.searchArea)["historic"]["name"];'],
  '박물관미술관':['nwr(area.searchArea)["tourism"="museum"]["name"];','nwr(area.searchArea)["tourism"="gallery"]["name"];'],
  '전통시장':['nwr(area.searchArea)["amenity"="marketplace"]["name"];'],
  '쇼핑몰':['nwr(area.searchArea)["shop"="mall"]["name"];','nwr(area.searchArea)["building"="retail"]["name"];'],
  '해변':['nwr(area.searchArea)["natural"="beach"]["name"];'],
  '산':['nwr(area.searchArea)["natural"="peak"]["name"];'],
  '도서관':['nwr(area.searchArea)["amenity"="library"]["name"];'],
  '숙박':['nwr(area.searchArea)["tourism"~"hotel|motel|guest_house|hostel|resort"]["name"];'],
  '체험':['nwr(area.searchArea)["craft"]["name"];','nwr(area.searchArea)["tourism"="attraction"]["name"];'],
  '테마파크':['nwr(area.searchArea)["tourism"="theme_park"]["name"];','nwr(area.searchArea)["tourism"="zoo"]["name"];','nwr(area.searchArea)["tourism"="aquarium"]["name"];'],
  '온천':['nwr(area.searchArea)["natural"="hot_spring"]["name"];','nwr(area.searchArea)["leisure"="spa"]["name"];'],
  '캠핑':['nwr(area.searchArea)["tourism"="camp_site"]["name"];','nwr(area.searchArea)["tourism"="caravan_site"]["name"];']
};

function point(el){
  const lat=Number(el.lat??el.center?.lat),lng=Number(el.lon??el.center?.lon);
  return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
}
function categoryFor(tags={},selected=[]){
  for(const c of selected){
    if(c==='공원'&&(tags.leisure==='park'||tags.leisure==='garden'))return c;
    if(c==='사찰'&&tags.amenity==='place_of_worship'&&tags.religion==='buddhist')return c;
    if(c==='마트'&&(tags.shop==='supermarket'||tags.shop==='convenience'))return c;
    if(c==='문화시설'&&['arts_centre','theatre','cinema','community_centre'].includes(tags.amenity))return c;
    if(c==='산책로'&&['footway','path'].includes(tags.highway))return c;
    if(c==='백화점'&&tags.shop==='department_store')return c;
    if(c==='카페'&&(tags.amenity==='cafe'||tags.shop==='bakery'))return c;
    if(c==='맛집'&&['restaurant','food_court'].includes(tags.amenity))return c;
    if(c==='박물관미술관'&&['museum','gallery'].includes(tags.tourism))return c;
    if(c==='전통시장'&&tags.amenity==='marketplace')return c;
    if(c==='쇼핑몰'&&(tags.shop==='mall'||tags.building==='retail'))return c;
    if(c==='해변'&&tags.natural==='beach')return c;
    if(c==='산'&&tags.natural==='peak')return c;
    if(c==='도서관'&&tags.amenity==='library')return c;
    if(c==='캠핑'&&['camp_site','caravan_site'].includes(tags.tourism))return c;
    if(c==='온천'&&(tags.natural==='hot_spring'||tags.leisure==='spa'))return c;
    if(c==='테마파크'&&['theme_park','zoo','aquarium'].includes(tags.tourism))return c;
    if(c==='숙박'&&['hotel','motel','guest_house','hostel','resort'].includes(tags.tourism))return c;
    if(c==='체험'&&(tags.craft||tags.tourism==='attraction'))return c;
    if(c==='관광명소'&&(tags.tourism==='attraction'||tags.tourism==='viewpoint'||tags.historic))return c;
  }
  return selected[0]||'장소';
}
function environment(tags={},category=''){
  if(tags.indoor==='yes')return 'indoor';
  if(['공원','산책로','해변','산','캠핑'].includes(category))return 'outdoor';
  if(tags.building||['백화점','마트','카페','맛집','박물관미술관','도서관','쇼핑몰','문화시설'].includes(category))return 'indoor';
  return 'mixed';
}
function facilityInfo(tags={},category=''){
  const env=environment(tags,category);
  return {
    parking:['yes','surface','underground','multi-storey'].includes(tags.parking)||tags['parking:condition']!=null,
    indoor:env==='indoor'||env==='mixed',
    outdoor:env==='outdoor'||env==='mixed',
    pet:['yes','leashed'].includes(tags.dog)||tags.pets==='yes',
    wheelchair:tags.wheelchair==='yes',
    toilets:tags.toilets==='yes'
  };
}
function passesFacilities(info,filters=[]){
  return filters.every(x=>info[x]===true);
}
function address(tags={},region=''){
  return [tags['addr:province'],tags['addr:city']||tags['addr:county'],tags['addr:district'],tags['addr:town'],tags['addr:neighbourhood'],tags['addr:street']].filter(Boolean).join(' ')||region;
}

export async function searchRegionPlaces({boundary,categories=[],facilities=[]}){
  const aid=areaId(boundary);
  if(!aid)throw new Error('선택한 지역 경계를 확인하지 못했습니다.');
  const selected=[...new Set(categories)].filter(c=>CATEGORY_SELECTORS[c]);
  if(!selected.length)throw new Error('플레이스를 한 개 이상 선택해주세요.');
  const selectors=[...new Set(selected.flatMap(c=>CATEGORY_SELECTORS[c]))];
  const query='[out:json][timeout:22];area('+aid+')->.searchArea;('+selectors.join('')+');out center tags 160;';
  const body=new URLSearchParams({data:query});
  const res=await fetch(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
  if(!res.ok)throw new Error('플레이스 데이터를 불러오지 못했습니다.');
  const json=await res.json();
  const seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const p=point(el),tags=el.tags||{},name=String(tags['name:ko']||tags.name||'').trim();
    if(!p||!name)continue;
    const cat=categoryFor(tags,selected),fac=facilityInfo(tags,cat);
    if(!passesFacilities(fac,facilities))continue;
    const key=name+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);
    if(seen.has(key))continue;seen.add(key);
    const metadata=[tags.wikidata,tags.wikipedia,tags.website,tags.opening_hours,tags.phone].filter(Boolean).length;
    items.push({
      id:'osm-'+el.type+'-'+el.id,name,category:cat,lat:p.lat,lng:p.lng,
      address:address(tags,boundary.name),score:Math.min(98,62+metadata*6),
      facilities:fac,liveRegion:boundary.name,liveSource:'OpenStreetMap/Overpass',
      aiReason:[boundary.name,cat,...facilities.map(x=>({parking:'주차',indoor:'실내',outdoor:'실외',pet:'반려동물',wheelchair:'무장애',toilets:'화장실'}[x]))].filter(Boolean).join(' · '),
      osmTags:tags
    });
  }
  items.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko'));
  return {items:items.slice(0,60),source:'행정구역 경계 + OpenStreetMap',boundary};
}

export async function searchNearbyPlaces(anchor,radius=5000){
  const q='[out:json][timeout:18];('+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["tourism"="attraction"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["leisure"="park"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["amenity"="cafe"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["amenity"="restaurant"]["name"];'+
    'nwr(around:'+radius+','+anchor.lat+','+anchor.lng+')["tourism"="museum"]["name"];'+
  ');out center tags 50;';
  const body=new URLSearchParams({data:q});
  const res=await fetch(OVERPASS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
  if(!res.ok)return [];
  const json=await res.json(),seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const p=point(el),tags=el.tags||{},name=String(tags['name:ko']||tags.name||'').trim();
    if(!p||!name||name===anchor.name)continue;
    const key=name+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);if(seen.has(key))continue;seen.add(key);
    items.push({id:'osm-'+el.type+'-'+el.id,name,category:categoryFor(tags,['관광명소','공원','카페','맛집','박물관미술관']),lat:p.lat,lng:p.lng,address:address(tags,'')});
  }
  return items;
}
