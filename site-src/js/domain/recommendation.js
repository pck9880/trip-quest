import { RAW_PLACES } from '../data/places.js';
import { POPULARITY_HINTS, URBAN_CATEGORIES } from '../data/recommendation-data.js';
import { DIR_DEG, geoKm, geoBearing, degDiff } from './geo.js';
import { scheduleWindow } from './schedule.js';
import { approxRoute } from '../services/routing.js';

export function placePopularity(p){
  const base=POPULARITY_HINTS[p.name];
  if(base!=null)return base;
  if(Number.isFinite(Number(p.urbanScore)))return Math.max(base||0,Number(p.urbanScore));
  const byCategory={번화가:90,카페거리:87,문화거리:84,쇼핑거리:84,바다:72,공원:68,산:67,뮤지엄:66,관광지:65,체험마을:62,전통시장:61,캠핑:58,온천:58,카페:56,맛집:56,소품샵:54};
  return byCategory[p.category]||55;
}

export function recommendationRegion(name=''){
  const regions=['서울','부산','대구','인천','광주','대전','울산','세종','진주','사천','통영','거제','남해','여수','순천','광양','하동','합천','산청','함양','거창','창원','김해','경주','전주','담양','공주','보령','군산','제천','안동','포항','강릉','속초','춘천','제주','수원','양산','밀양','창녕','함안','고성','고흥','목포','임실','충주','괴산','단양','영주','문경','태안','서산','예산','평창','정선','양양','가평','포천','파주'];
  return regions.find(r=>name.startsWith(r)||name.includes(r))||name.split(/\s+/)[0]||'기타';
}

function canonicalRegion(value=''){
  return String(value||'')
    .replace(/특별자치시|특별시|광역시|특별자치도/g,'')
    .replace(/[시군구]$/,'')
    .trim();
}

function matchesRegion(place,region=''){
  const target=canonicalRegion(region);
  if(!target)return true;
  return canonicalRegion(recommendationRegion(place.name))===target||String(place.name||'').includes(target);
}

export function diversifyRecommendations(items,limit=10){
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

export function normalizedDistanceRange(body={}){
  let min=Math.max(0,Math.min(400,Math.round(Number(body.minKm??0)/10)*10));
  let max=Math.max(0,Math.min(400,Math.round(Number(body.targetKm??100)/10)*10));
  if(max<min)[min,max]=[max,min];
  if(max-min<10){
    if(max<400)max=Math.min(400,min+10);
    else min=Math.max(0,max-10);
  }
  return {min,max};
}

function applySemanticFilters(items,{profile,hardCats,preferredCats,dir}){
  let arr=[...items];
  if(dir!=='전체'&&DIR_DEG[dir]!=null)arr=arr.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=55);
  const naturalHard=hardCats.some(c=>['바다','산','공원','캠핑'].includes(c));
  if(profile?.flags?.trendy&&!naturalHard){
    const urban=arr.filter(p=>URBAN_CATEGORIES.includes(p.category));
    if(urban.length)arr=urban;
  }else if(hardCats.length){
    arr=arr.filter(p=>hardCats.includes(p.category));
  }else if(profile&&preferredCats.length){
    const preferred=arr.filter(p=>preferredCats.includes(p.category));
    arr=preferred.length>=3?preferred:[...preferred,...arr.filter(p=>!preferredCats.includes(p.category))];
  }
  return arr;
}

export function localRecommend(body){
  const o=body.origin,{min:minKm,max:maxKm}=normalizedDistanceRange(body),cats=body.categories||[],dir=body.direction||'전체',
    avail=scheduleWindow(body.departure,body.returnTime),focus=(body.focusQuery||'').trim().toLowerCase(),
    profile=body.semanticProfile||null;

  const all=RAW_PLACES.map(p=>({...p,geoDistanceKm:geoKm(o,p),distanceKm:geoKm(o,p),bearing:geoBearing(o,p)}));
  const hardCats=profile?.hardCategories||[];
  const preferredCats=profile?.preferredCategories||[];
  const regionConstraint=profile?.regionConstraint||profile?.queryPlan?.regionConstraint?.name||'';
  const band=body.distanceBand&&Number.isFinite(Number(body.distanceBand.min))&&Number.isFinite(Number(body.distanceBand.max))
    ?{min:Math.max(0,Number(body.distanceBand.min)),max:Math.min(400,Number(body.distanceBand.max))}
    :null;
  const activeMin=band?band.min:minKm,activeMax=band?band.max:maxKm;

  let arr=[];
  if(focus){
    const tokens=focus.split(/\s+/).filter(Boolean);
    const direct=all.filter(p=>p.name.toLowerCase().includes(focus)||tokens.every(t=>p.name.toLowerCase().includes(t)));
    if(direct.length){
      arr=all.filter(p=>direct.includes(p)||direct.some(c=>geoKm(c,p)<=40));
    }else{
      arr=all.filter(p=>p.geoDistanceKm<=activeMax&&p.geoDistanceKm>=Math.max(0,activeMin*.55));
    }
  }else{
    arr=all.filter(p=>p.geoDistanceKm<=activeMax&&p.geoDistanceKm>=Math.max(0,activeMin*.55));
  }

  if(regionConstraint){
    arr=arr.filter(p=>matchesRegion(p,regionConstraint));
  }

  if(profile&&!focus){
    arr=applySemanticFilters(arr,{profile,hardCats,preferredCats,dir});
  }else if(!profile&&!focus){
    if(dir!=='전체'&&DIR_DEG[dir]!=null)arr=arr.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=55);
    if(cats.length)arr=arr.filter(p=>cats.includes(p.category));
  }

  if(profile&&arr.length<6&&!focus){
    let fallback=all.filter(p=>p.geoDistanceKm<=activeMax&&p.geoDistanceKm>=Math.max(0,activeMin*.45));
    if(regionConstraint)fallback=fallback.filter(p=>matchesRegion(p,regionConstraint));
    fallback=applySemanticFilters(fallback,{profile,hardCats,preferredCats,dir});
    fallback.sort((a,b)=>a.geoDistanceKm-b.geoDistanceKm);
    for(const p of fallback){
      if(!arr.some(x=>x.id===p.id))arr.push({...p,relaxed:true});
      if(arr.length>=14)break;
    }
  }

  const matched=profile?.matches||[];
  const center=(activeMin+activeMax)/2;
  const span=Math.max(20,activeMax-activeMin);
  const ranked=arr.map(p=>{
    const route=approxRoute(o,p),round=route.timeMin*2;
    const semanticHits=matched.filter(x=>(x.categories||[]).includes(p.category)&&x.kind!=='amenity'&&x.kind!=='condition');
    const hardFit=hardCats.includes(p.category)?42:0;
    const preferredFit=preferredCats.includes(p.category)?18:0;
    const semantic=Math.min(48,semanticHits.reduce((sum,x)=>sum+(x.weight||8),0));
    const urbanBoost=profile?.flags?.trendy&&URBAN_CATEGORIES.includes(p.category)?Math.min(30,Math.round((p.urbanScore||placePopularity(p))/4)):0;
    const oceanBoost=profile?.flags?.oceanView&&p.category==='바다'?18:0;
    const regionBonus=regionConstraint&&matchesRegion(p,regionConstraint)?20:0;
    const cat=(!cats.length||cats.includes(p.category))?8:0;
    const dist=Math.max(0,24-Math.abs(p.geoDistanceKm-center)/span*18);
    const time=avail==null?8:(round<=avail?18:Math.max(0,18-(round-avail)/15));
    const focusBonus=focus?24:0;
    const quietPenalty=profile?.flags?.quiet&&['관광지','전통시장','체험마을'].includes(p.category)?-14:0;
    const genericPenalty=profile&&matched.length&&!semanticHits.length&&!hardFit&&!preferredFit?-18:0;
    const relaxedPenalty=p.relaxed?-10:0;
    const feasible=avail==null?true:round<=avail;
    const why=[];

    if(regionConstraint)why.push(regionConstraint+' 지역 조건');
    if(hardFit&&semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+' 우선');
    else if(hardFit)why.push(p.category+' 목적지 유형 일치');
    else if(semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+' 조건과 잘 맞음');
    if(profile?.flags?.oceanView&&p.category==='바다')why.push('바다 전망 의도 반영');
    if(profile?.flags?.quiet&&['바다','산','공원','캠핑'].includes(p.category))why.push('한적한 분위기 선호 반영');
    if(profile?.flags?.trendy&&URBAN_CATEGORIES.includes(p.category))why.push('힙·트렌디한 상권 우선');
    if(profile?.flags?.localHidden&&['체험마을','전통시장','공원','관광지'].includes(p.category))why.push('로컬·숨은 장소 취향 반영');
    if(profile?.flags?.wantsCafe)why.push('여행지 선택 후 CAFE 연계');
    if(profile?.flags?.wantsFood)why.push('여행지 선택 후 FOOD 연계');
    why.push(Math.round(activeMin)+'~'+Math.round(activeMax)+'km 검색 범위');

    return {...p,routePreview:route,roundTripDriveMin:round,availableMin:avail,feasible,
      aiReason:why.slice(0,3).join(' · '),relaxedResult:!!p.relaxed,
      semanticIntent:(profile?.keywords||[]).join(','),
      queryRegion:regionConstraint,
      score:Math.min(99,Math.max(1,Math.round(18+hardFit+preferredFit+semantic+urbanBoost+oceanBoost+regionBonus+cat+dist+time+focusBonus+quietPenalty+genericPenalty+relaxedPenalty)))}
  }).sort((a,b)=>b.score-a.score||a.geoDistanceKm-b.geoDistanceKm);

  return diversifyRecommendations(ranked,14);
}
