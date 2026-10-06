import { geoKm } from '../domain/geo.js';

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
  });
  return manifestPromise;
}
async function inflateParts(parts){
  const buffers=await Promise.all(parts.map(async p=>{
    const r=await fetch('./data/national/'+p,{cache:'force-cache'});
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
export function preloadNationalDataset(){return loadNationalDataset()}
export function officialCategories(){return new Set(OFFICIAL_CATEGORIES)}

function regionAliases(name=''){
  const s=String(name).trim(),out=new Set([s]);
  const numbered=s.replace(/(?:제)?\d+동$/,'동');
  if(numbered!==s)out.add(numbered);
  return [...out].filter(Boolean);
}
function regionMatch(place,path=[]){
  if(!path.length)return true;
  const [top,...rest]=path.filter(Boolean);
  if(top==='광주광역시'){
    if(place.sido!=='전남광주통합특별시'||!GWANGJU_GU.has(place.sigungu.split(' ').at(-1)))return false;
  }else if(top==='전라남도'){
    if(place.sido!=='전남광주통합특별시'||GWANGJU_GU.has(place.sigungu.split(' ').at(-1)))return false;
  }else if(top&&place.sido!==top){
    if(!(place.sido+' '+place.address).includes(top))return false;
  }
  const hay=[place.sigungu,place.eupmyeondong,place.address].join(' ');
  return rest.every(x=>regionAliases(x).some(alias=>hay.includes(alias)));
}
function facilityMatch(place,filters=[]){
  if(!filters.length)return true;
  return filters.every(k=>place.facilities?.[k]===true);
}
function destinationQuality(place){
  if(place.category==='공원'){
    const type=place.subcategory||'';
    return !BAD_PARK.test(type)&&GOOD_PARK.test(type);
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
  const found=items.filter(x=>wanted.has(x.category)&&destinationQuality(x)&&regionMatch(x,regionPath)&&facilityMatch(x,facilities))
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
