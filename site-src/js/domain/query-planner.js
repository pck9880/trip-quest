const REGIONS=[
  '서울','부산','대구','인천','광주','대전','울산','세종','제주',
  '수원','성남','용인','고양','화성','평택','안양','부천','남양주','의정부','파주','김포','광명','하남','군포','시흥','안산',
  '춘천','강릉','속초','양양','평창','정선','원주','동해','삼척','태백',
  '청주','충주','제천','단양','괴산','보은','옥천',
  '천안','아산','공주','보령','서산','태안','예산','서천',
  '전주','군산','익산','정읍','남원','고창','임실',
  '목포','여수','순천','광양','담양','고흥','강진',
  '포항','경주','안동','문경','영주','구미','김천',
  '창원','진주','통영','사천','김해','거제','양산','밀양','창녕','함안','고성','남해','하동','합천','산청','함양','거창'
];

const REGION_ALIASES={
  '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천',
  '광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종',
  '제주특별자치도':'제주'
};

const DESTINATION_RULES=[
  {category:'바다',re:/바다|해변|해수욕장|바닷가|해안|오션뷰|바다뷰|해안뷰|씨뷰|바다가\s*보이|바다\s*보이|바다앞/},
  {category:'산',re:/(?:^|\s)산(?:$|\s|으로|에)|등산|정상|산뷰|산멍/},
  {category:'공원',re:/공원|수변공원|호수공원|피크닉|잔디/},
  {category:'뮤지엄',re:/박물관|미술관|뮤지엄|전시관|전시/},
  {category:'체험마을',re:/체험마을|마을체험/},
  {category:'전통시장',re:/전통시장|재래시장/},
  {category:'캠핑',re:/캠핑|캠핑장|차박/},
  {category:'온천',re:/온천|스파/}
];

const ATTRIBUTE_RULES=[
  {id:'oceanView',label:'바다 전망',re:/오션뷰|바다뷰|해안뷰|씨뷰|바다가\s*보이|바다\s*보이|바다앞|해안/},
  {id:'quiet',label:'조용한 분위기',re:/조용|한적|한산|사람\s*적|붐비지|여유로운/},
  {id:'trendy',label:'힙한 분위기',re:/힙한|힙플|핫플|트렌디|감각적|세련된|mz|엠지/},
  {id:'scenic',label:'풍경·전망',re:/전망|풍경|경치|절경|파노라마|뷰맛집/},
  {id:'walk',label:'산책',re:/산책|걷기|걷고|둘레길|트레일/},
  {id:'drive',label:'드라이브',re:/드라이브|차타고|차로|해안도로/}
];

function clean(value){return String(value||'').replace(/\s+/g,' ').trim()}
function unique(values){return [...new Set(values.filter(Boolean))]}

function snapTripKm(value){
  const n=Number(value);
  if(!Number.isFinite(n))return null;
  return Math.max(0,Math.min(450,Math.round(n/50)*50));
}

function extractDistanceMention(text){
  const m=clean(text);
  const range=m.match(/(\d{1,3})\s*(?:~|〜|-|부터)\s*(\d{1,3})\s*(?:km|키로)/i);
  if(range){
    const a=snapTripKm(range[1]),b=snapTripKm(range[2]);
    if(a!=null&&b!=null)return {min:Math.min(a,b),max:Math.max(a,b),source:'text-range'};
  }
  const upper=m.match(/(\d{1,3})\s*(?:km|키로)\s*(?:이내|안|까지|내)/i);
  if(upper){
    const max=snapTripKm(upper[1]);
    if(max!=null)return {min:0,max:Math.max(50,max),source:'text-max'};
  }
  const lower=m.match(/(\d{1,3})\s*(?:km|키로)\s*(?:이상|밖|넘게)/i);
  if(lower){
    const min=snapTripKm(lower[1]);
    if(min!=null)return {min,max:450,source:'text-min'};
  }
  return null;
}

function regionMentions(text){
  const m=clean(text);
  const hits=[];
  for(const [full,short] of Object.entries(REGION_ALIASES)){
    let from=0,index;
    while((index=m.indexOf(full,from))>=0){hits.push({name:short,raw:full,index});from=index+full.length}
  }
  for(const name of REGIONS){
    let from=0,index;
    while((index=m.indexOf(name,from))>=0){
      if(!hits.some(x=>x.index===index&&(x.raw.includes(name)||name.includes(x.raw))))hits.push({name,raw:name,index});
      from=index+name.length;
    }
  }
  return hits.sort((a,b)=>a.index-b.index||b.raw.length-a.raw.length);
}

function resolveRegionRoles(text,hits){
  if(!hits.length)return {originRegion:null,regionConstraint:null};
  const m=clean(text);
  if(hits.length>=2){
    const first=hits[0],second=hits[1];
    const afterFirst=m.slice(first.index+first.raw.length,second.index);
    const afterSecond=m.slice(second.index+second.raw.length,second.index+second.raw.length+8);
    const firstLooksOrigin=/에서|출발|부터/.test(afterFirst);
    const secondLooksTarget=/쪽|방향|으로|로|에서|근처|주변|안/.test(afterSecond);
    if(firstLooksOrigin||secondLooksTarget)return {
      originRegion:{name:first.name,raw:first.raw},
      regionConstraint:{name:second.name,raw:second.raw}
    };
  }
  const last=hits[hits.length-1];
  return {originRegion:null,regionConstraint:{name:last.name,raw:last.raw}};
}

export function planTravelQuery(message,context={}){
  const text=clean(message);
  const hits=regionMentions(text);
  const roles=resolveRegionRoles(text,hits);
  const destinationCategories=unique(DESTINATION_RULES.filter(rule=>rule.re.test(text)).map(rule=>rule.category));
  const attributes=ATTRIBUTE_RULES.filter(rule=>rule.re.test(text)).map(rule=>({id:rule.id,label:rule.label}));
  const linkedModes=[];
  if(/카페|커피|라떼|아메리카노|에스프레소|디저트|베이커리|빵집|로스터리|브런치/.test(text))linkedModes.push('cafe');
  if(/맛집|식당|음식|먹거리|밥|식사|혼밥|국밥|회|횟집|해산물|고기|면|분식|야식/.test(text))linkedModes.push('food');

  return {
    raw:text,
    searchMode:context.searchMode||'travel',
    originRegion:roles.originRegion,
    regionConstraint:roles.regionConstraint,
    destinationCategories,
    linkedModes:unique(linkedModes),
    attributes,
    distanceMention:extractDistanceMention(text),
    hasExplicitDestination:destinationCategories.length>0
  };
}

export function queryPlanKeywords(plan={},distanceRange={}){
  const result=[];
  if(plan.regionConstraint?.name)result.push(plan.regionConstraint.name);
  for(const item of plan.attributes||[])result.push(item.label);
  for(const mode of plan.linkedModes||[])result.push(mode==='cafe'?'CAFE 연계':'FOOD 연계');
  const min=Number(distanceRange.min),max=Number(distanceRange.max);
  if(Number.isFinite(min)&&Number.isFinite(max))result.push(Math.round(min)+'~'+Math.round(max)+'km');
  return unique(result);
}
