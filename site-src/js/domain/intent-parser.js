import { INTENT_RULES } from '../data/intent-rules.js';
import { normalizedDistanceRange } from './recommendation.js';

export function localAI(message,context){
  const m=message.trim(),compact=m.replace(/\s+/g,''),patch={};let focus='';

  const sliderRange=normalizedDistanceRange(context),sliderKm=sliderRange.max;
  const distance={min:sliderRange.min,max:sliderRange.max,km:sliderRange.max,mode:'range',fromSlider:true};
  const dir=['북동','남동','남서','북서','북','동','남','서'].find(d=>m.includes(d));if(dir)patch.direction=dir;



  const matches=INTENT_RULES.filter(r=>r.re.test(compact));
  const hardCategories=[...new Set(matches.filter(x=>x.kind==='hard').flatMap(x=>x.categories))];
  const preferredCategories=[...new Set(matches.filter(x=>['hard','mood','soft'].includes(x.kind)).flatMap(x=>x.categories))];

  // 직접 명시한 목적지 유형은 가장 강한 조건으로 취급한다. 카페/맛집은 코스 주변 편의시설로 분리한다.
  const explicitDestination=[];
  if(/바다|해변|해수욕장|바닷가|해안/.test(m))explicitDestination.push('바다');
  if(/\b산\b|산으로|산에/.test(m))explicitDestination.push('산');
  if(/공원/.test(m))explicitDestination.push('공원');
  if(/관광지/.test(m))explicitDestination.push('관광지');
  if(/박물관|미술관|뮤지엄/.test(m))explicitDestination.push('뮤지엄');
  if(/체험마을/.test(m))explicitDestination.push('체험마을');
  if(/전통시장/.test(m))explicitDestination.push('전통시장');
  for(const c of explicitDestination)if(!hardCategories.includes(c))hardCategories.push(c);

  const destinationCats=hardCategories.length?hardCategories:preferredCategories;
  if(destinationCats.length)patch.categories=destinationCats;
  if(/카페.*(빼|제외)|카페는.*(빼|제외)/.test(m))patch.categories=(patch.categories||context.categories||[]).filter(x=>x!=='카페');

  const regions=['서울','부산','대구','인천','광주','대전','울산','진주','사천','통영','거제','남해','여수','순천','하동','합천','산청','함양','거창','창원','김해','경주','전주','담양','공주','보령','군산','강릉','속초','춘천','안동','포항','제주','제천'];
  for(const r of regions)if(m.includes(r)){focus=r;break}

  const profile={
    keywords:matches.map(x=>x.label),
    matches:matches.map(x=>({id:x.id,label:x.label,kind:x.kind,weight:x.weight,categories:x.categories,reason:x.reason})),
    hardCategories,preferredCategories,distance,
    flags:{
      wantsCafe:matches.some(x=>x.id==='cafe'||x.id==='warmdrink'),
      wantsFood:matches.some(x=>x.id==='food'),
      quiet:matches.some(x=>x.id==='quiet'),
      rain:matches.some(x=>x.id==='rain'),
      wave:matches.some(x=>x.id==='wave'),
      trendy:matches.some(x=>x.id==='trendy'||x.id==='urbanhotspot'),
      urbanHotspot:matches.some(x=>x.id==='urbanhotspot'),
      localHidden:matches.some(x=>x.id==='localhidden'),
      retro:matches.some(x=>x.id==='retro'),
      picnic:matches.some(x=>x.id==='picnic')
    }
  };

  const travel=/여행|관광|여행지|코스|드라이브|바다|해변|산|카페|커피|라떼|맛집|뮤지엄|미술관|박물관|공원|시장|온천|캠핑|체험|데이트|당일치기|주차|날씨|교통|귀가|출발지|가고\s*싶|어디\s*갈|별|은하수|천체|밤하늘|노을|일몰|일출|해돋이|풍경|전망|경치|힐링|한적|실내|가족|아이|파도|비오|산책|걷기|숲|꽃|야경|쇼핑|소품|혼자|강아지|반려|기분전환|쉬고싶|답답|감성|낭만|역사|문화재|고궁|성곽|사찰|한옥|유적|추천|찾아줘|갈만|나들이|바람쐬|바람쐬고|바람쐬러|떠나고|가고\s*싶|보고\s*싶|걷고\s*싶|먹고\s*싶|마시고\s*싶|힙한|힙플|핫플|핫플레이스|트렌디|엠지|mz|로컬|숨은명소|빈티지|레트로|뉴트로|복합문화공간|문화공간|독립서점|책방|골목|구도심|원도심|오션뷰|바다뷰|시티뷰|스카이라인|피크닉|돗자리|잔디|수변|호수|강변|사진맛집|포토스팟|스냅|필카|이색|특이한|색다른|유니크|감각적|세련된|아기자기|미니멀|탁트인|뻥뚫린|개방감|차분한|소박한|느린여행|슬로우|뷰맛집|공간미|아트|공예|노포|로스터리|플리마켓|셀렉트샵|편집샵|스팟|플레이스/;
  const appIntent=/TRIP\s*QUEST|트립\s*퀘스트|설정|사용법|버튼|연비|휘발유|거리\s*바꿔|카테고리/i;

  if(/사용법|어떻게\s*써|기능\s*설명/.test(m))return {mode:'local',intent:'help',message:'출발지 → 취향 → 시간 → 추천 → 코스 순서로 진행합니다. 기분, 상황, 원하는 거리를 한 문장에 같이 적어도 분석합니다.',patch,focusQuery:focus,analysisKeywords:['사용법'],choices:[{label:'조건 직접 설정하기',action:'goto',step:2},{label:'다시 입력하기',action:'focus'}]};
  if(!matches.length&&!travel.test(compact)&&!appIntent.test(m))return {mode:'local',intent:'clarify',message:'여행 조건으로 이해할 정보가 조금 부족합니다. 기분, 현재 상황, 원하는 거리 중 한 가지만 더 적어주세요.',patch:{},focusQuery:'',analysisKeywords:[],choices:[{label:'AI 입력으로 돌아가기',action:'focus'},{label:'직접 조건 선택하기',action:'goto',step:2}]};

  const settings=/바꿔|변경|설정|빼|제외/.test(m)&&Object.keys(patch).length;
  const keywords=[...profile.keywords];
  keywords.push(`${sliderRange.min}~${sliderRange.max}km`);
  if(!keywords.length)keywords.push('국내여행');
  const msg=settings?'요청한 여행 조건을 반영했습니다.':`기분·상황·거리에서 ${keywords.join(' · ')} 조건을 분석했습니다. 장소 유형과 직접 관련 없는 카페·날씨 조건은 추천지를 왜곡하지 않고 코스 조건으로 따로 반영합니다.`;
  return {mode:'local',intent:settings?'settings':'travel_search',message:msg,patch,focusQuery:focus,
    semanticProfile:profile,analysisKeywords:keywords,
    choices:settings?[{label:'이 조건으로 검색',action:'search',patch,focusQuery:focus},{label:'조건 직접 확인',action:'goto',step:2}]:[{label:'조건 직접 수정',action:'goto',step:2},{label:'다른 조건 말하기',action:'focus'}]}
}
