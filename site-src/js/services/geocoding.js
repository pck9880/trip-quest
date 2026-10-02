import { RAW_PLACES } from '../data/places.js';

const PLACE_ALIASES=[
  {re:/^(?:부산\s*)?가야공원$/i,query:'가야공원 부산광역시 부산진구',label:'가야공원',type:'park'},
  {re:/^(?:부산\s*)?사상(?:역)?\s*(?:번화가|번화가거리|젊음의거리|상권)$/i,query:'사상역 부산광역시 사상구',label:'사상역 번화가',type:'commercial_area'},
  {re:/^서면\s*(?:번화가|젊음의거리|상권)$/i,query:'서면역 부산광역시 부산진구',label:'서면 번화가',type:'commercial_area'},
  {re:/^전포\s*(?:카페거리|상권|핫플)$/i,query:'전포카페거리 부산광역시 부산진구',label:'전포카페거리',type:'commercial_area'}
];

const TYPE_LABELS={
  park:'공원',garden:'공원',theme_park:'놀이공원',attraction:'관광시설',museum:'뮤지엄',
  arts_centre:'문화시설',mall:'쇼핑몰',department_store:'백화점',supermarket:'쇼핑',
  marketplace:'시장',market:'시장',station:'교통시설',beach:'해변',viewpoint:'전망대',
  retail:'상업시설',outlet:'아울렛',commercial:'상권',pedestrian:'거리',square:'광장'
};

function clean(value){return String(value||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()}
function aliasFor(query){const q=clean(query);return PLACE_ALIASES.find(x=>x.re.test(q))||null}
function classify(row={}){
  const type=String(row.type||row.addresstype||'').toLowerCase();
  const cls=String(row.class||row.category||'').toLowerCase();
  const display=clean(row.display_name||row.name||'');
  if(/아울렛|outlet/i.test(display))return {type:'outlet',label:'아울렛'};
  if(/백화점/.test(display))return {type:'department_store',label:'백화점'};
  if(/놀이공원|테마파크/.test(display))return {type:'theme_park',label:'놀이공원'};
  if(type==='theme_park'||/theme.?park/.test(type))return {type:'theme_park',label:'놀이공원'};
  if(type==='department_store')return {type:'department_store',label:'백화점'};
  if(type==='mall'||type==='retail'||cls==='shop')return {type:type||'retail',label:TYPE_LABELS[type]||'쇼핑시설'};
  if(type==='park'||type==='garden')return {type,label:'공원'};
  if(type==='museum'||type==='arts_centre')return {type,label:TYPE_LABELS[type]};
  if(type==='marketplace'||type==='market')return {type,label:'시장'};
  if(type==='beach')return {type,label:'해변'};
  if(type==='viewpoint')return {type,label:'전망대'};
  if(type==='station'||/station/.test(type))return {type:'station',label:'교통시설'};
  if(cls==='place')return {type:type||'place',label:'지역'};
  if(cls==='boundary')return {type:type||'boundary',label:'지역'};
  if(cls==='highway'&&type==='pedestrian')return {type:'pedestrian',label:'거리'};
  return {type:type||cls||'place',label:TYPE_LABELS[type]||'장소'};
}
function normalizeRemote(row,index=0){
  const lat=Number(row.lat),lng=Number(row.lon);
  const meta=classify(row);
  return {
    id:'osm-'+String(row.place_id||index),
    provider:'osm',
    name:clean(row.name||String(row.display_name||'').split(',')[0]||'장소'),
    address:clean(row.display_name||''),
    lat,lng,
    placeType:meta.type,
    placeTypeLabel:meta.label,
    importance:Number(row.importance)||0
  };
}
function normalizeLocal(p,index=0){
  return {
    id:'local-'+(p.id||index),
    provider:'local',
    name:p.name,
    address:p.address||'TRIP QUEST 내장 장소',
    lat:Number(p.lat),lng:Number(p.lng),
    placeType:p.category||'travel_place',
    placeTypeLabel:p.category||'여행지',
    importance:.45
  };
}
function dedupe(items=[]){
  const seen=new Set();
  return items.filter(item=>{
    if(!Number.isFinite(item.lat)||!Number.isFinite(item.lng))return false;
    const key=(item.name||'').toLowerCase()+'|'+item.lat.toFixed(4)+'|'+item.lng.toFixed(4);
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}
function localMatches(query){
  const x=clean(query).toLowerCase();
  return RAW_PLACES
    .filter(p=>p.name.toLowerCase().includes(x)||x.includes(p.name.toLowerCase())||x.includes(String(p.name).split(' ')[0].toLowerCase()))
    .slice(0,8).map(normalizeLocal);
}

async function nominatimSearch(query,limit=8){
  try{
    const params=new URLSearchParams({
      q:query,format:'jsonv2',limit:String(limit),countrycodes:'kr','accept-language':'ko',
      addressdetails:'1',namedetails:'1'
    });
    const r=await fetch('https://nominatim.openstreetmap.org/search?'+params.toString(),{headers:{Accept:'application/json'}});
    if(!r.ok)return [];
    const rows=await r.json();
    return (rows||[]).map(normalizeRemote);
  }catch{return []}
}

export async function localGeocode(query){
  const q=clean(query);
  if(!q)return [];
  const alias=aliasFor(q);
  const searchQuery=alias?.query||q;
  const [remote,local]=await Promise.all([nominatimSearch(searchQuery,8),Promise.resolve(localMatches(q))]);
  const items=dedupe([...remote,...local]);
  if(alias&&items[0]){
    items[0]={...items[0],name:alias.label,placeType:alias.type,placeTypeLabel:TYPE_LABELS[alias.type]||'장소',aliasMatched:true};
  }
  return items.slice(0,8);
}

export async function reverseGeocode(lat,lng){
  const y=Number(lat),x=Number(lng);
  if(!Number.isFinite(y)||!Number.isFinite(x))return null;
  try{
    const params=new URLSearchParams({
      lat:String(y),lon:String(x),format:'jsonv2',zoom:'18',addressdetails:'1','accept-language':'ko'
    });
    const r=await fetch('https://nominatim.openstreetmap.org/reverse?'+params.toString(),{headers:{Accept:'application/json'}});
    if(!r.ok)return null;
    const row=await r.json();
    const a=row?.address||{};
    const regionParts=[
      a.city||a.province||a.state,
      a.borough||a.city_district||a.county,
      a.suburb||a.quarter||a.neighbourhood||a.village||a.town
    ].map(clean).filter(Boolean);
    const unique=[...new Set(regionParts)];
    const regionName=unique.join(' ')||clean(row.display_name).split(',').slice(0,3).join(' ');
    return {
      id:'gps-reverse',
      provider:'osm-reverse',
      name:regionName||'현재 위치',
      address:clean(row.display_name)||regionName||'현재 위치',
      lat:y,lng:x,
      placeType:'current_location',
      placeTypeLabel:'현재 위치'
    };
  }catch{return null}
}
