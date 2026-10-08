import { geoKm } from '../domain/geo.js';
import { regionMatches } from './search-normalization.js';

const MANIFEST_URL='./data/national/runtime-manifest.json';
let datasetPromise=null;
let manifestPromise=null;

const OFFICIAL_CATEGORIES=new Set(['공원','전통시장','대형도서관','카페거리','쇼핑거리']);
const GWANGJU_GU=new Set(['광산구','남구','동구','북구','서구']);
const BAD_MARKET=/산업용품|공구|기계|자동차|부품|건축자재|철물|공업용품|상협동조합/i;
const GOOD_PARK=/근린공원|문화공원|수변공원|체육공원|역사공원|도시농업공원|산림조경숲|생활환경숲/;
const BAD_PARK=/어린이공원|소공원|묘지공원|가로공원/;

async function loadManifest(){
  if(!manifestPromise)manifestPromise=fetch(MANIFEST_URL,{cache:'no-store'}).then(r=>{
    if(!r.ok)throw new Error('전국 장소 DB manifest를 불러오지 못했습니다.');
    return r.json();
  }).catch(error=>{manifestPromise=null;throw error;});
  return manifestPromise;
}
async function inflateParts(parts){
  const buffers=await Promise.all(parts.map(async p=>{
    let r;
    try{r=await fetch('./data/national/'+p,{cache:'force-cache'});}
    catch(_){r=null}
    // One uncached attempt protects against a stale/offline service-worker entry.
    if(!r?.ok)r=await fetch('./data/national/'+p,{cache:'reload'});
    if(!r.ok)throw new Error('전국 장소 DB 조각을 불러오지 못했습니다: '+p);
    return new Uint8Array(await r.arrayBuffer());
  }));
  const total=buffers.reduce((n,b)=>n+b.byteLength,0),joined=new Uint8Array(total);
  let offset=0;
  for(const b of buffers){joined.set(b,offset);offset+=b.byteLength}
  if(typeof DecompressionStream==='undefined')throw new Error('이 브라우저는 전국 장소 DB 압축 해제를 지원하지 않습니다.');
  const stream=new Blob([joined]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
export async function loadNationalDataset(){
  if(!datasetPromise)datasetPromise=(async()=>{
    const manifest=await loadManifest();
    if(manifest.status!=='ready')throw new Error('전국 공식 DB 런타임 파일 배포 대기');
    if(!Array.isArray(manifest.parts)||!manifest.parts.length)throw new Error('전국 장소 DB 목록이 비어 있습니다.');
    const payload=await inflateParts(manifest.parts);
    const items=(payload.items||[]).map(x=>({
      id:x.i,name:x.n,category:x.c,subcategory:x.sc||'',
      sido:x.s||'',sigungu:x.g||'',eupmyeondong:x.d||'',address:x.a||'',
      lat:Number(x.y),lng:Number(x.x),facilities:x.f||{},
      source:x.src||'공식 전국데이터',referenceDate:x.dt||''
    })).filter(x=>x.name&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
    return {manifest,items};
  })().catch(error=>{datasetPromise=null;throw error;});
  return datasetPromise;
}
export function preloadNationalDataset(){return loadNationalDataset()}
export function officialCategories(){return new Set(OFFICIAL_CATEGORIES)}

function facilityMatch(place,filters=[]){
  if(!filters.length)return true;
  return filters.every(k=>place.facilities?.[k]===true);
}
function destinationQuality(place){
  if(place.category==='공원'){
    const type=place.subcategory||'';
    if(BAD_PARK.test(type)||BAD_PARK.test(place.name||''))return false;
    // Missing subtype metadata must not silently erase valid named parks.
    return GOOD_PARK.test(type)||(!type&&/공원|수목원|정원/.test(place.name||''));
  }
  if(place.category==='전통시장')return !BAD_MARKET.test(place.name||'');
  if(place.category==='대형도서관')return /(도서관|라이브러리)/.test(place.name||'')&&!/북카페/.test(place.name||'');
  return true;
}
function publicPlace(x,reason){
  return {
    id:x.id,name:x.name,category:x.category,subcategory:x.subcategory,
    lat:x.lat,lng:x.lng,address:x.address,
    facilities:x.facilities||{},score:94,
    liveSource:x.source,referenceDate:x.referenceDate,
    aiReason:reason||('공식 전국데이터 · '+x.source)
  };
}
export async function searchOfficialPlaces({regionPath=[],categories=[],facilities=[]}){
  const wanted=new Set(categories.filter(x=>OFFICIAL_CATEGORIES.has(x)));
  if(!wanted.size)return {items:[],coveredCategories:[]};
  const {items,manifest}=await loadNationalDataset();
  const found=items.filter(x=>wanted.has(x.category)&&destinationQuality(x)&&regionMatches(x,regionPath)&&facilityMatch(x,facilities))
    .map(x=>publicPlace(x,'TRIP QUEST 공식 DB · 여행 목적지 선별'));
  found.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  return {items:found.slice(0,120),coveredCategories:[...wanted],manifest};
}
export async function nearbyOfficialPlaces(anchor,radiusKm=5,limit=60){
  const {items}=await loadNationalDataset(),rows=[];
  for(const x of items){
    if(!destinationQuality(x)||x.id===anchor.id||x.name===anchor.name)continue;
    const distanceKm=geoKm(anchor,x);
    if(distanceKm<0.05||distanceKm>radiusKm)continue;
    rows.push({...publicPlace(x,'목적지 주변 공식 장소'),distanceKm});
  }
  rows.sort((a,b)=>a.distanceKm-b.distanceKm||a.name.localeCompare(b.name,'ko'));
  return rows.slice(0,limit);
}
export async function nationalDatasetStatus(){return loadManifest()}


/* Local administrative selector index.
   Built from the already bundled national dataset: no network geocoding/Overpass calls.
   The hierarchy is intentionally data-driven so the selector and place DB use the same region spellings. */
let regionHierarchyPromise=null;
function uiSidoName(place){
  if(place.sido==='전남광주통합특별시'){
    return GWANGJU_GU.has(String(place.sigungu||'').split(' ').at(-1))?'광주광역시':'전라남도';
  }
  return place.sido;
}
function cleanSigungu(sido,value=''){
  let v=String(value||'').trim();
  if(!v)return '';
  if(v.startsWith(sido+' '))v=v.slice(sido.length+1).trim();
  return v;
}
export async function localRegionHierarchy(){
  if(!regionHierarchyPromise)regionHierarchyPromise=(async()=>{
    const {items}=await loadNationalDataset();
    const tree=new Map();
    for(const place of items){
      const sido=uiSidoName(place);
      if(!sido)continue;
      if(!tree.has(sido))tree.set(sido,new Map());
      const sigungu=cleanSigungu(sido,place.sigungu);
      if(!sigungu)continue;
      const gu=tree.get(sido);
      if(!gu.has(sigungu))gu.set(sigungu,new Set());
      const dong=String(place.eupmyeondong||'').trim();
      if(dong)gu.get(sigungu).add(dong);
    }
    return tree;
  })().catch(error=>{regionHierarchyPromise=null;throw error;});
  return regionHierarchyPromise;
}
export async function localRegionChildren(path=[]){
  const tree=await localRegionHierarchy();
  const [sido,sigungu]=path;
  if(!sido)return [];
  if(!sigungu)return [...(tree.get(sido)?.keys()||[])].sort((a,b)=>a.localeCompare(b,'ko'));
  return [...(tree.get(sido)?.get(sigungu)||[])].sort((a,b)=>a.localeCompare(b,'ko'));
}
