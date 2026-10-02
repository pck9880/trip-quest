import { INTENT_RULES } from '../data/intent-rules.js';
import { normalizedDistanceRange } from './recommendation.js';
import { planTravelQuery, queryPlanKeywords } from './query-planner.js';

function unique(values){return [...new Set(values.filter(Boolean))]}

export function localAI(message,context={}){
  const m=String(message||'').trim(),compact=m.replace(/\s+/g,''),patch={};
  const sliderRange=normalizedDistanceRange(context);
  const queryPlan=planTravelQuery(m,context);
  if(queryPlan.distanceMention){
    patch.minKm=queryPlan.distanceMention.min;
    patch.targetKm=queryPlan.distanceMention.max;
  }
  const effectiveRange=queryPlan.distanceMention||sliderRange;
  const distance={min:effectiveRange.min,max:effectiveRange.max,km:effectiveRange.max,mode:'range',fromSlider:!queryPlan.distanceMention};
  const dir=['북동','남동','남서','북서','북','동','남','서'].find(d=>m.includes(d));
  if(dir)patch.direction=dir;

  const matches=INTENT_RULES.filter(r=>r.re.test(compact));
  const hardCategories=unique([
    ...matches.filter(x=>x.kind==='hard').flatMap(x=>x.categories),
    ...queryPlan.destinationCategories
  ]);
  const preferredCategories=unique([
    ...hardCategories,
    ...matches.filter(x=>['hard','mood','soft'].includes(x.kind)).flatMap(x=>x.categories)
  ]);

  const explicitDestination=[];
  if(/관광지/.test(m))explicitDestination.push('관광지');
  if(/박물관|미술관|뮤지엄/.test(m))explicitDestination.push('뮤지엄');
  if(/체험마을/.test(m))explicitDestination.push('체험마을');
  if(/전통시장|재래시장/.test(m))explicitDestination.push('전통시장');
  if(/소품샵|편집샵|셀렉트샵/.test(m))explicitDestination.push('소품샵');
  for(const category of explicitDestination){
    if(!hardCategories.includes(category))hardCategories.push(category);
    if(!preferredCategories.includes(category))preferredCategories.push(category);
  }

  const destinationCats=hardCategories.length?hardCategories:preferredCategories;
  if(destinationCats.length)patch.categories=destinationCats;

  const linkedModes=unique([
    ...queryPlan.linkedModes,
    ...(matches.some(x=>x.id==='cafe'||x.id==='warmdrink')?['cafe']:[]),
    ...(matches.some(x=>x.id==='food')?['food']:[])
  ]);

  const profile={
    keywords:unique(matches.map(x=>x.label)),
    matches:matches.map(x=>({id:x.id,label:x.label,kind:x.kind,weight:x.weight,categories:x.categories,reason:x.reason})),
    hardCategories,
    preferredCategories,
    distance,
    regionConstraint:queryPlan.regionConstraint?.name||'',
    originRegion:queryPlan.originRegion?.name||'',
    linkedModes,
    queryPlan,
    flags:{
      wantsCafe:linkedModes.includes('cafe'),
      wantsFood:linkedModes.includes('food'),
      quiet:matches.some(x=>x.id==='quiet'),
      rain:matches.some(x=>x.id==='rain'),
      wave:matches.some(x=>x.id==='wave'),
      trendy:matches.some(x=>x.id==='trendy'||x.id==='urbanhotspot'),
      urbanHotspot:matches.some(x=>x.id==='urbanhotspot'),
      localHidden:matches.some(x=>x.id==='localhidden'),
      retro:matches.some(x=>x.id==='retro'),
      picnic:matches.some(x=>x.id==='picnic'),
      oceanView:(queryPlan.attributes||[]).some(x=>x.id==='oceanView')
    }
  };

  const travel=/여행|관광|여행지|코스|드라이브|바다|해변|산|카페|커피|라떼|맛집|뮤지엄|미술관|박물관|공원|시장|온천|캠핑|체험|데이트|당일치기|주차|날씨|교통|귀가|출발지|가고\s*싶|어디\s*갈|별|은하수|천체|밤하늘|노을|일몰|일출|해돋이|풍경|전망|경치|힐링|한적|실내|가족|아이|파도|비오|산책|걷기|숲|꽃|야경|쇼핑|소품|혼자|강아지|반려|기분전환|쉬고싶|답답|감성|낭만|역사|문화재|고궁|성곽|사찰|한옥|유적|추천|찾아줘|갈만|나들이|바람쐬|떠나고|보고\s*싶|먹고\s*싶|마시고\s*싶|힙한|힙플|핫플|트렌디|엠지|mz|로컬|숨은명소|빈티지|레트로|뉴트로|복합문화공간|독립서점|책방|골목|구도심|원도심|오션뷰|바다뷰|시티뷰|피크닉|수변|호수|강변|사진맛집|포토스팟|스냅|이색|유니크|감각적|세련된|탁트인|차분한|느린여행|뷰맛집|공간미|아트|공예|노포|로스터리|플리마켓|편집샵|스팟|플레이스/;
  const appIntent=/TRIP\s*QUEST|트립\s*퀘스트|설정|사용법|버튼|연비|휘발유|거리\s*바꿔|카테고리/i;

  if(/사용법|어떻게\s*써|기능\s*설명/.test(m)){
    return {mode:'local',intent:'help',message:'지역·장소 키워드와 거리 범위를 입력하면 TRIP 조건으로 구조화해 추천합니다.',patch:{},focusQuery:'',analysisKeywords:['사용법'],choices:[{label:'검색어 입력하기',action:'focus'}]};
  }
  if(!matches.length&&!travel.test(compact)&&!appIntent.test(m)&&!queryPlan.regionConstraint){
    return {mode:'local',intent:'clarify',message:'지역, 원하는 장소나 분위기 중 한 가지를 더 입력해주세요.',patch:{},focusQuery:'',analysisKeywords:[],choices:[{label:'검색어 다시 입력',action:'focus'}]};
  }

  const planned=queryPlanKeywords(queryPlan,effectiveRange);
  const semantic=matches.filter(x=>x.kind!=='amenity').map(x=>x.label);
  const amenity=[];
  if(profile.flags.wantsCafe)amenity.push('CAFE 연계');
  if(profile.flags.wantsFood)amenity.push('FOOD 연계');
  const analysisKeywords=unique([...planned,...semantic,...amenity]).slice(0,7);
  if(!analysisKeywords.some(x=>/km$/.test(x)))analysisKeywords.push(Math.round(effectiveRange.min)+'~'+Math.round(effectiveRange.max)+'km');

  const regionText=profile.regionConstraint?profile.regionConstraint+' 지역 · ':'';
  const categoryText=hardCategories.length?hardCategories.join(' · ')+' 중심 · ':'';
  const linkText=linkedModes.length?linkedModes.map(x=>x==='cafe'?'CAFE':'FOOD').join(' + ')+' 코스 연계':'여행지 중심';
  const responseMessage=regionText+categoryText+linkText+' 조건으로 검색했습니다.';

  return {
    mode:'local',
    intent:'travel_search',
    message:responseMessage,
    patch,
    focusQuery:'',
    semanticProfile:profile,
    queryPlan,
    analysisKeywords,
    choices:[{label:'다른 조건 말하기',action:'focus'}]
  };
}
