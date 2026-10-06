import { geoKm } from '../domain/geo.js';

const MANIFEST_URL='./data/national/runtime-manifest.json';
let datasetPromise=null;
let manifestPromise=null;

const OFFICIAL_CATEGORIES=new Set(['공원','전통시장','대형도서관','카페거리','쇼핑거리']);
const GWANGJU_GU=new Set(['광산구','남구','동구','북구','서구']);

async function loadManifest(){
  if(!manifestPromise)manifestPromise=fetch(MANIFEST_URL,{cache:'no-store'}).then(r=>{
    if(!r.ok)throw new Error('전국 장소 DB manifest를 불러오지 못했습니다.');
    return r.json();
  });
  return manifestPromise;
}
async function inflateParts(parts){
  const buffers=await Promise.all(parts.map(async p=>{
    const r=await fetch('./data/national/'+p,{cache:'force-cache'});
    if(!r.ok)throw new Error('전국 장소 DB 조각을 불러오지 못했습니다: '+p);
    return new Uint8Array(await r.arrayBuffer());
  }));
  const total=buffers.reduce((n,b)=>n+b.byteLength,0);
  const joined=new Uint8Array(total);
  let offset=0;
  for(const b of buffers){joined.set(b,offset);offset+=b.byteLength}
  if(typeof DecompressionStream==='undefined')throw new Error('이 브라우저는 전국 장소 DB 압축 해제를 지원하지 않습니다.');
  const stream=new Blob([joined]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text=await new Response(stream).text();
  return JSON.parse(text);
}
export async function loadNationalDataset(){
  if(!datasetPromise)datasetPromise=(async()=>{
    const manifest=await loadManifest();
    if(manifest.status!=='ready')throw new Error('전국 공식 DB 런타임 파일 배포 대기');
    const payload=await inflateParts(manifest.parts||[]);
    const items=(payload.items||[]).map(x=>({
      id:x.i,name:x.n,category:x.c,subcategory:x.sc||'',
      sido:x.s||'',sigungu:x.g||'',eupmyeondong:x.d||'',address:x.a||'',
      lat:Number(x.y),lng:Number(x.x),facilities:x.f||{},
      source:x.src||'공식 전국데이터',referenceDate:x.dt||''
    })).filter(x=>x.name&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
    return {manifest,items};
  })();
  return datasetPromise;
}
export function officialCategories(){return new Set(OFFICIAL_CATEGORIES)}

function regionMatch(place,path=[]){
  if(!path.length)return true;
  const [top,...rest]=path.filter(Boolean);
  if(top==='광주광역시'){
    if(place.sido!=='전남광주통합특별시'||!GWANGJU_GU.has(place.sigungu.split(' ').at(-1)))return false;
  }else if(top==='전라남도'){
    if(place.sido!=='전남광주통합특별시'||GWANGJU_GU.has(place.sigungu.split(' ').at(-1)))return false;
  }else if(top&&place.sido!==top){
    const hay=(place.sido+' '+place.address);
    if(!hay.includes(top))return false;
  }
  const hay=[place.sigungu,place.eupmyeondong,place.address].join(' ');
  return rest.every(x=>hay.includes(x));
}
function facilityMatch(place,filters=[]){
  if(!filters.length)return true;
  return filters.every(k=>place.facilities?.[k]===true);
}
function publicPlace(x,reason){
  return {
    id:x.id,name:x.name,category:x.category,subcategory:x.subcategory,
    lat:x.lat,lng:x.lng,address:x.address,
    facilities:x.facilities||{},score:92,
    liveSource:x.source,referenceDate:x.referenceDate,
    aiReason:reason||('공식 전국데이터 · '+x.source)
  };
}
export async function searchOfficialPlaces({regionPath=[],categories=[],facilities=[]}){
  const wanted=new Set(categories.filter(x=>OFFICIAL_CATEGORIES.has(x)));
  if(!wanted.size)return {items:[],coveredCategories:[]};
  const {items,manifest}=await loadNationalDataset();
  const found=items.filter(x=>wanted.has(x.category)&&regionMatch(x,regionPath)&&facilityMatch(x,facilities))
    .map(x=>publicPlace(x,'TRIP QUEST 공식 DB · '+x.category));
  found.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  return {items:found.slice(0,120),coveredCategories:[...wanted],manifest};
}
export async function nearbyOfficialPlaces(anchor,radiusKm=5,limit=60){
  const {items}=await loadNationalDataset();
  const rows=[];
  for(const x of items){
    if(x.id===anchor.id||x.name===anchor.name)continue;
    const distanceKm=geoKm(anchor,x);
    if(distanceKm<0.05||distanceKm>radiusKm)continue;
    rows.push({...publicPlace(x,'목적지 주변 공식 장소'),distanceKm});
  }
  rows.sort((a,b)=>a.distanceKm-b.distanceKm||a.name.localeCompare(b.name,'ko'));
  return rows.slice(0,limit);
}
export async function nationalDatasetStatus(){
  const manifest=await loadManifest();
  return manifest;
}
