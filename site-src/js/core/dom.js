export const $=s=>document.querySelector(s);

export const all=s=>Array.from(document.querySelectorAll(s));

export function setText(sel,t){const el=$(sel);if(el)el.textContent=t}

export function loading(on){document.body.classList.toggle('loading',on)}

export function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}

export function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtWon(n){return `${Math.round(n||0).toLocaleString('ko-KR')}원`}
function fmtMin(m){const h=Math.floor((m||0)/60),min=Math.round((m||0)%60);return h?`${h}시간 ${min}분`:`${min}분`}
function fmtKm(k){return `${(k||0).toFixed(1)} km`}
const VEHICLE_SETTINGS_KEY='tq_vehicle_settings_v1';
const FUEL_NAMES={gasoline:'휘발유',diesel:'경유',lpg:'LPG',electric:'전기'};
function readVehicleSettings(){
  if(typeof localStorage==='undefined')return null;
  try{return JSON.parse(localStorage.getItem(VEHICLE_SETTINGS_KEY)||'null')}catch{return null}
}
function activeVehicleProfile(body={}){
  const saved=readVehicleSettings();
  const fuel=saved?.fuel||'gasoline';
  const efficiency=Math.max(.1,Number(saved?.efficiency)||11);
  const fallbackPrice={gasoline:1858,diesel:1844,lpg:1139,electric:347}[fuel]||1858;
  const bodyPrice=Number(body.gasPrice);
  const energyPrice=fuel==='electric'
    ?Math.max(1,Number(saved?.energyPrice)||fallbackPrice)
    :(Number.isFinite(bodyPrice)&&bodyPrice>0?bodyPrice:Math.max(1,Number(saved?.energyPrice)||fallbackPrice));
  return {
    vehicleLabel:saved?.vehicleLabel||'캐스퍼',
    fuel,
    fuelLabel:FUEL_NAMES[fuel]||'연료',
    efficiency,
    energyPrice,
    tollDiscount:!!saved?.tollDiscount,
    energyUnit:fuel==='electric'?'kWh':'L',
    efficiencyUnit:fuel==='electric'?'km/kWh':'km/L'
  };
}
function estimateRoundTripToll(distanceKm,tollDiscount=false){
  const oneWay=Math.max(0,Number(distanceKm)||0)/2;
  if(oneWay<40)return 0;
  const estimate=(900+oneWay*44.3)*2*(tollDiscount?.5:1);
  return Math.max(0,Math.round(estimate/100)*100);
}
function setText(sel,t){const el=$(sel);if(el)el.textContent=t}
function loading(on){document.body.classList.toggle('loading',on)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
const RAW_PLACES=[
['진주성','관광지',35.1896,128.0780],['경상남도수목원','공원',35.1628,128.3050],['사천바다케이블카','관광지',34.9308,128.0437],['남해 독일마을','관광지',34.7996,128.0390],['상주은모래비치','바다',34.7238,127.9878],['통영 동피랑벽화마을','관광지',34.8448,128.4241],['통영 미륵산','산',34.8278,128.4163],['거제 바람의언덕','바다',34.7446,128.6639],['거제 포로수용소유적공원','뮤지엄',34.8917,128.6218],['순천만국가정원','공원',34.9280,127.5090],['순천만습지','관광지',34.8854,127.5095],['여수 오동도','바다',34.7441,127.7655],['여수 아쿠아플라넷','뮤지엄',34.7458,127.7482],['광양 매화마을','관광지',35.0880,127.7060],['하동 최참판댁','관광지',35.1570,127.6942],['합천 해인사','관광지',35.8012,128.0980],['합천 영상테마파크','체험마을',35.5698,128.1675],['산청 동의보감촌','체험마을',35.4158,127.8303],['지리산 천왕봉권역','산',35.3371,127.7308],['함양 상림공원','공원',35.5214,127.7242],['거창 수승대','관광지',35.7383,127.8338],['창원 주남저수지','관광지',35.3075,128.6773],['창원 진해루','바다',35.1478,128.6986],['김해 클레이아크미술관','뮤지엄',35.2500,128.7458],['부산 해운대해수욕장','바다',35.1587,129.1604],['부산 국립해양박물관','뮤지엄',35.0786,129.0803],['부산 감천문화마을','체험마을',35.0975,129.0106],['울산 대왕암공원','바다',35.4926,129.4393],['경주 불국사','관광지',35.7900,129.3318],['경주 국립경주박물관','뮤지엄',35.8292,129.2285],['대구 수성못','공원',35.8297,128.6179],['대구미술관','뮤지엄',35.8274,128.6746],['전주 한옥마을','관광지',35.8150,127.1530],['전주 남부시장','전통시장',35.8120,127.1470],['담양 죽녹원','공원',35.3254,126.9860],['광주 국립아시아문화전당','뮤지엄',35.1468,126.9200],['대전 국립중앙과학관','뮤지엄',36.3742,127.3779],['대전 한밭수목원','공원',36.3680,127.3880],['공주 공산성','관광지',36.4624,127.1278],['보령 대천해수욕장','바다',36.3054,126.5084],['군산 근대역사박물관','뮤지엄',35.9884,126.7115],['변산반도 채석강','바다',35.6251,126.4695],['제천 의림지','관광지',37.1723,128.2106],['안동 하회마을','체험마을',36.5394,128.5180],['포항 호미곶','바다',36.0760,129.5685],['강릉 경포해변','바다',37.8058,128.9071],['속초 영금정','바다',38.2071,128.5992],['춘천 제이드가든','공원',37.8458,127.5364],['서울 국립중앙박물관','뮤지엄',37.5239,126.9803],['인천 을왕리해수욕장','바다',37.4475,126.3720],
['부산 다대포해수욕장','바다',35.0467,128.9664],['부산 오륙도해맞이공원','공원',35.1035,129.1220],['부산 회동수원지','공원',35.2385,129.1218],
['울산 슬도','바다',35.4817,129.4307],['울산 간절곶','바다',35.3590,129.3606],['경주 주상절리전망대','바다',35.6764,129.4750],
['포항 이가리닻전망대','바다',36.2057,129.3947],['창원 저도연육교','바다',35.1026,128.5607],['사천 비토섬','바다',34.9745,127.9786],
['남해 설리해수욕장','바다',34.7134,128.0267],['남해 섬이정원','공원',34.7654,127.8886],['거제 구조라해수욕장','바다',34.8094,128.6907],
['통영 달아공원','공원',34.7688,128.3948],['고성 상족암군립공원','공원',34.9082,128.1465],['순천 와온해변','바다',34.8455,127.5088],
['여수 무슬목해변','바다',34.6358,127.7762],['광양 배알도수변공원','공원',34.9377,127.7295],['하동 평사리공원','공원',35.1451,127.7042],
['대구 사문진나루터','공원',35.8060,128.4810],['세종 금강보행교','공원',36.4802,127.2898],['청주 청남대','공원',36.4624,127.4902],
['보령 무창포해수욕장','바다',36.2480,126.5360],['군산 선유도해수욕장','바다',35.8150,126.4112],['서천 마량리동백나무숲','공원',36.1354,126.5051],
['고창 구시포해수욕장','바다',35.4450,126.4364],['담양 메타세쿼이아길','공원',35.3224,126.9871],['전주 덕진공원','공원',35.8473,127.1245],
['강릉 안목해변','바다',37.7716,128.9474],['양양 남애항','바다',37.9454,128.7890],['춘천 의암호스카이워크','공원',37.8578,127.6894],
['인천 소래습지생태공원','공원',37.4112,126.7473],['서울 북서울꿈의숲','공원',37.6207,127.0410],
['양산 황산공원','공원',35.3166,128.9933],['밀양 위양지','공원',35.5470,128.7264],['창녕 우포늪','공원',35.5465,128.4144],
['김해 화포천습지생태공원','공원',35.3090,128.8230],['함안 악양생태공원','공원',35.2921,128.4147],['거제 학동흑진주몽돌해변','바다',34.7776,128.6394],
['통영 미래사 편백숲','산',34.8129,128.4101],['하동 송림공원','공원',35.0667,127.7450],['고흥 남열해돋이해수욕장','바다',34.5772,127.4846],
['여수 장도','공원',34.7589,127.6566],['강진 가우도','바다',34.5017,126.7908],['목포 고하도','공원',34.7718,126.3560],
['임실 옥정호','공원',35.5531,127.1097],['충주 탄금대','공원',36.9746,127.9277],['괴산 산막이옛길','공원',36.7604,127.8476],
['단양 이끼터널','관광지',36.9792,128.3523],['영주 무섬마을','체험마을',36.7397,128.6221],['문경 진남교반','공원',36.6528,128.1348],
['태안 신두리해안사구','바다',36.8384,126.1969],['서산 웅도','바다',36.8245,126.3595],['예산 예당호','공원',36.6329,126.7942],
['평창 육백마지기','산',37.5128,128.4697],['정선 병방치스카이워크','산',37.3797,128.6690],['양양 죽도해변','바다',37.9755,128.7614],
['가평 자라섬','공원',37.8177,127.5209],['포천 산정호수','공원',38.0684,127.3225],['파주 임진각평화누리공원','공원',37.8905,126.7400],
['부산 서면 젊음의거리','번화가',35.1578,129.0595],['부산 전포카페거리','카페거리',35.1555,129.0644],['부산 삼정타워','쇼핑거리',35.1528,129.0592],['부산 남포동 BIFF광장','번화가',35.0987,129.0285],['부산 자갈치시장','전통시장',35.0967,129.0306],['부산 해리단길','카페거리',35.1637,129.1590],
['서울 홍대 걷고싶은거리','번화가',37.5563,126.9236],['서울 연남동 경의선숲길','문화거리',37.5621,126.9253],['서울 망리단길','카페거리',37.5560,126.9103],['서울 성수 연무장길','번화가',37.5446,127.0559],['서울 서울숲','공원',37.5444,127.0374],['서울 건대입구 맛의거리','번화가',37.5404,127.0695],['서울 송리단길','카페거리',37.5107,127.1107],['서울 익선동 한옥거리','문화거리',37.5730,126.9894],['서울 을지로 골목','문화거리',37.5660,126.9910],
['경주 황리단길','번화가',35.8387,129.2093],['경주 대릉원','문화거리',35.8399,129.2115],['경주 첨성대','문화거리',35.8347,129.2190],['경주 동궁과월지','문화거리',35.8347,129.2265],['경주 보문호수','공원',35.8425,129.2870],
['대구 동성로','번화가',35.8691,128.5948],['대구 교동','문화거리',35.8722,128.5940],['대구 김광석다시그리기길','문화거리',35.8606,128.6062],['대구 앞산카페거리','카페거리',35.8330,128.5872],
['광주 동명동 카페거리','카페거리',35.1507,126.9233],['광주 충장로','번화가',35.1489,126.9147],['광주 양림동 펭귄마을','문화거리',35.1418,126.9155],['광주 1913송정역시장','전통시장',35.1372,126.7915],
['대전 으능정이문화의거리','번화가',36.3295,127.4278],['대전 성심당 본점거리','번화가',36.3275,127.4276],['대전 대흥동 문화예술거리','문화거리',36.3268,127.4239],['대전 엑스포과학공원','공원',36.3763,127.3880],
['전주 객리단길','카페거리',35.8194,127.1412],['전주 팔복예술공장','문화거리',35.8509,127.1072],
['수원 행리단길','카페거리',37.2840,127.0118],['수원 화성행궁','문화거리',37.2819,127.0143],['수원 장안문','문화거리',37.2877,127.0142],['수원 광교호수공원','공원',37.2834,127.0652],
['인천 개항로','문화거리',37.4727,126.6213],['인천 신포국제시장','전통시장',37.4714,126.6283],['인천 차이나타운','문화거리',37.4753,126.6178],['인천 월미도','번화가',37.4737,126.5967],['인천 송도 센트럴파크','공원',37.3931,126.6386],
['제주 누웨마루거리','번화가',33.4896,126.4888],['제주 동문시장','전통시장',33.5129,126.5289],['제주 탑동광장','문화거리',33.5177,126.5235],['제주 애월카페거리','카페거리',33.4633,126.3102],['제주 한담해안산책로','문화거리',33.4596,126.3109],['제주 협재해수욕장','바다',33.3940,126.2395],
['강릉 안목커피거리','카페거리',37.7713,128.9470],['강릉 강릉항','문화거리',37.7700,128.9511],['강릉 월화거리','문화거리',37.7540,128.8961],['강릉 명주동 골목','문화거리',37.7514,128.8927],
['울산 삼산디자인거리','번화가',35.5393,129.3388],['울산 성남동 젊음의거리','번화가',35.5539,129.3202],['울산 태화강국가정원','공원',35.5516,129.2958],
['창원 상남분수광장','번화가',35.2248,128.6816],['창원 창동예술촌','문화거리',35.2066,128.5770],['창원 용호동 가로수길','카페거리',35.2311,128.6817],
['춘천 명동거리','번화가',37.8796,127.7270],['춘천 육림고개','문화거리',37.8762,127.7264],['춘천 공지천','공원',37.8682,127.7140]
].map((p,i)=>({id:'local-'+i,name:p[0],category:p[1],lat:p[2],lng:p[3],address:'',url:'',source:'local'}));
const URBAN_CATEGORIES=['번화가','카페거리','문화거리','쇼핑거리'];
const HOTSPOT_META={
  '부산 서면 젊음의거리':{routeGroup:'busan-seomyeon',urbanScore:99,youth:true},
  '부산 전포카페거리':{routeGroup:'busan-seomyeon',urbanScore:98,youth:true},
  '부산 삼정타워':{routeGroup:'busan-seomyeon',urbanScore:91,youth:true},
  '부산 남포동 BIFF광장':{routeGroup:'busan-seomyeon',urbanScore:94,youth:true},
  '부산 자갈치시장':{routeGroup:'busan-seomyeon',urbanScore:84},
  '서울 홍대 걷고싶은거리':{routeGroup:'seoul-hongdae',urbanScore:100,youth:true},
  '서울 연남동 경의선숲길':{routeGroup:'seoul-hongdae',urbanScore:96,youth:true},
  '서울 망리단길':{routeGroup:'seoul-hongdae',urbanScore:92,youth:true},
  '서울 성수 연무장길':{routeGroup:'seoul-seongsu',urbanScore:99,youth:true},
  '서울 서울숲':{routeGroup:'seoul-seongsu',urbanScore:90,youth:true},
  '서울 건대입구 맛의거리':{routeGroup:'seoul-seongsu',urbanScore:96,youth:true},
  '서울 송리단길':{routeGroup:'seoul-seongsu',urbanScore:95,youth:true},
  '경주 황리단길':{routeGroup:'gyeongju-hwangridan',urbanScore:99,youth:true},
  '경주 대릉원':{routeGroup:'gyeongju-hwangridan',urbanScore:91},
  '경주 첨성대':{routeGroup:'gyeongju-hwangridan',urbanScore:90},
  '경주 동궁과월지':{routeGroup:'gyeongju-hwangridan',urbanScore:90},
  '경주 보문호수':{routeGroup:'gyeongju-hwangridan',urbanScore:84},
  '대구 동성로':{routeGroup:'daegu-dongseong',urbanScore:98,youth:true},
  '대구 교동':{routeGroup:'daegu-dongseong',urbanScore:95,youth:true},
  '대구 김광석다시그리기길':{routeGroup:'daegu-dongseong',urbanScore:90},
  '대구 앞산카페거리':{routeGroup:'daegu-dongseong',urbanScore:91,youth:true},
  '광주 동명동 카페거리':{routeGroup:'gwangju-dongmyeong',urbanScore:96,youth:true},
  '광주 충장로':{routeGroup:'gwangju-dongmyeong',urbanScore:94,youth:true},
  '광주 양림동 펭귄마을':{routeGroup:'gwangju-dongmyeong',urbanScore:88},
  '광주 1913송정역시장':{routeGroup:'gwangju-dongmyeong',urbanScore:87},
  '대전 으능정이문화의거리':{routeGroup:'daejeon-eunhaeng',urbanScore:95,youth:true},
  '대전 성심당 본점거리':{routeGroup:'daejeon-eunhaeng',urbanScore:94,youth:true},
  '대전 대흥동 문화예술거리':{routeGroup:'daejeon-eunhaeng',urbanScore:89},
  '대전 한밭수목원':{routeGroup:'daejeon-eunhaeng',urbanScore:82},
  '대전 엑스포과학공원':{routeGroup:'daejeon-eunhaeng',urbanScore:83},
  '전주 객리단길':{routeGroup:'jeonju-gaekridan',urbanScore:94,youth:true},
  '전주 한옥마을':{routeGroup:'jeonju-gaekridan',urbanScore:93},
  '전주 남부시장':{routeGroup:'jeonju-gaekridan',urbanScore:86},
  '전주 덕진공원':{routeGroup:'jeonju-gaekridan',urbanScore:80},
  '전주 팔복예술공장':{routeGroup:'jeonju-gaekridan',urbanScore:84},
  '수원 행리단길':{routeGroup:'suwon-haengni',urbanScore:97,youth:true},
  '수원 화성행궁':{routeGroup:'suwon-haengni',urbanScore:91},
  '수원 장안문':{routeGroup:'suwon-haengni',urbanScore:87},
  '수원 광교호수공원':{routeGroup:'suwon-haengni',urbanScore:88},
  '인천 개항로':{routeGroup:'incheon-gaehang',urbanScore:92,youth:true},
  '인천 신포국제시장':{routeGroup:'incheon-gaehang',urbanScore:87},
  '인천 차이나타운':{routeGroup:'incheon-gaehang',urbanScore:90},
  '인천 월미도':{routeGroup:'incheon-gaehang',urbanScore:86},
  '인천 송도 센트럴파크':{routeGroup:'incheon-gaehang',urbanScore:88},
  '제주 누웨마루거리':{routeGroup:'jeju-city',urbanScore:90,youth:true},
  '제주 동문시장':{routeGroup:'jeju-city',urbanScore:87},
  '제주 탑동광장':{routeGroup:'jeju-city',urbanScore:84},
  '제주 애월카페거리':{routeGroup:'jeju-aewol',urbanScore:94,youth:true},
  '제주 한담해안산책로':{routeGroup:'jeju-aewol',urbanScore:88},
  '제주 협재해수욕장':{routeGroup:'jeju-aewol',urbanScore:87},
  '강릉 안목커피거리':{routeGroup:'gangneung-anmok',urbanScore:93,youth:true},
  '강릉 안목해변':{routeGroup:'gangneung-anmok',urbanScore:88},
  '강릉 강릉항':{routeGroup:'gangneung-anmok',urbanScore:82},
  '강릉 경포해변':{routeGroup:'gangneung-anmok',urbanScore:89},
  '울산 삼산디자인거리':{routeGroup:'ulsan-urban',urbanScore:92,youth:true},
  '울산 성남동 젊음의거리':{routeGroup:'ulsan-urban',urbanScore:91,youth:true},
  '울산 태화강국가정원':{routeGroup:'ulsan-urban',urbanScore:84},
  '창원 상남분수광장':{routeGroup:'changwon-urban',urbanScore:90,youth:true},
  '창원 용호동 가로수길':{routeGroup:'changwon-urban',urbanScore:88,youth:true},
  '창원 창동예술촌':{routeGroup:'changwon-urban',urbanScore:84},
  '춘천 명동거리':{routeGroup:'chuncheon-urban',urbanScore:89,youth:true},
  '춘천 육림고개':{routeGroup:'chuncheon-urban',urbanScore:86,youth:true},
  '춘천 공지천':{routeGroup:'chuncheon-urban',urbanScore:80}
};
for(const p of RAW_PLACES)Object.assign(p,HOTSPOT_META[p.name]||{});
const CURATED_COURSES={
  'busan-seomyeon':{walk:['부산 서면 젊음의거리','부산 전포카페거리','부산 삼정타워'],drive:['부산 서면 젊음의거리','부산 남포동 BIFF광장','부산 자갈치시장']},
  'seoul-hongdae':{walk:['서울 홍대 걷고싶은거리','서울 연남동 경의선숲길','서울 망리단길'],drive:['서울 홍대 걷고싶은거리','서울 성수 연무장길','서울 송리단길']},
  'seoul-seongsu':{walk:['서울 성수 연무장길','서울 서울숲','서울 건대입구 맛의거리'],drive:['서울 성수 연무장길','서울 건대입구 맛의거리','서울 송리단길']},
  'gyeongju-hwangridan':{walk:['경주 황리단길','경주 대릉원','경주 첨성대'],drive:['경주 황리단길','경주 동궁과월지','경주 보문호수']},
  'daegu-dongseong':{walk:['대구 동성로','대구 교동','대구 김광석다시그리기길'],drive:['대구 동성로','대구 수성못','대구 앞산카페거리']},
  'gwangju-dongmyeong':{walk:['광주 동명동 카페거리','광주 국립아시아문화전당','광주 충장로'],drive:['광주 동명동 카페거리','광주 양림동 펭귄마을','광주 1913송정역시장']},
  'daejeon-eunhaeng':{walk:['대전 으능정이문화의거리','대전 성심당 본점거리','대전 대흥동 문화예술거리'],drive:['대전 으능정이문화의거리','대전 한밭수목원','대전 엑스포과학공원']},
  'jeonju-gaekridan':{walk:['전주 객리단길','전주 한옥마을','전주 남부시장'],drive:['전주 객리단길','전주 덕진공원','전주 팔복예술공장']},
  'suwon-haengni':{walk:['수원 행리단길','수원 화성행궁','수원 장안문'],drive:['수원 행리단길','수원 광교호수공원','수원 장안문']},
  'incheon-gaehang':{walk:['인천 개항로','인천 신포국제시장','인천 차이나타운'],drive:['인천 개항로','인천 월미도','인천 송도 센트럴파크']},
  'jeju-city':{walk:['제주 누웨마루거리','제주 동문시장','제주 탑동광장'],drive:['제주 누웨마루거리','제주 탑동광장','제주 애월카페거리']},
  'jeju-aewol':{walk:['제주 애월카페거리','제주 한담해안산책로','제주 협재해수욕장'],drive:['제주 애월카페거리','제주 협재해수욕장','제주 누웨마루거리']},
  'gangneung-anmok':{walk:['강릉 안목커피거리','강릉 안목해변','강릉 강릉항'],drive:['강릉 안목커피거리','강릉 경포해변','강릉 월화거리']},
  'ulsan-urban':{walk:['울산 성남동 젊음의거리','울산 태화강국가정원','울산 삼산디자인거리'],drive:['울산 삼산디자인거리','울산 성남동 젊음의거리','울산 태화강국가정원']},
  'changwon-urban':{walk:['창원 상남분수광장','창원 용호동 가로수길','창원 창동예술촌'],drive:['창원 상남분수광장','창원 용호동 가로수길','창원 창동예술촌']},
  'chuncheon-urban':{walk:['춘천 명동거리','춘천 육림고개','춘천 공지천'],drive:['춘천 명동거리','춘천 공지천','춘천 육림고개']}
};
function placeByName(name){return RAW_PLACES.find(p=>p.name===name)}
function curatedStops(destination,mode){
  const group=destination?.routeGroup||HOTSPOT_META[destination?.name]?.routeGroup;
  const preset=group&&CURATED_COURSES[group];
  if(!preset)return null;
  const names=mode==='walk'?preset.walk:preset.drive;
  const stops=names.map(placeByName).filter(Boolean);
  if(!stops.some(p=>p.name===destination.name))stops.unshift(destination);
  return stops.slice(0,3);
}
const DIR_DEG={북:0,'북동':45,동:90,'남동':135,남:180,'남서':225,서:270,'북서':315};
const rad=d=>d*Math.PI/180;
function geoKm(a,b){const R=6371,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function geoBearing(a,b){const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lng-a.lng),y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function degDiff(a,b){return Math.abs(((a-b+540)%360)-180)}
function approxRoute(a,b){const distanceKm=geoKm(a,b)*1.23,avg=distanceKm<20?38:distanceKm<80?52:68;return {distanceKm,timeMin:distanceKm/avg*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'estimate'}}
const ROAD_ROUTE_CACHE=new Map();
async function roadRoute(a,b){
  const fallback=approxRoute(a,b);
  if(typeof window==='undefined'||typeof fetch!=='function')return fallback;
  const key=[Number(a.lat).toFixed(5),Number(a.lng).toFixed(5),Number(b.lat).toFixed(5),Number(b.lng).toFixed(5)].join(',');
  if(ROAD_ROUTE_CACHE.has(key))return ROAD_ROUTE_CACHE.get(key);
  const promise=(async()=>{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4500);
    try{
      const url=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
      const r=await fetch(url,{signal:ctrl.signal,headers:{accept:'application/json'}});
      if(!r.ok)throw new Error('route');
      const j=await r.json(),route=j?.routes?.[0];
      if(!route||!Number.isFinite(route.distance)||!Number.isFinite(route.duration))throw new Error('route');
      const coords=(route.geometry?.coordinates||[]).map(([lng,lat])=>[lat,lng]);
      return {distanceKm:route.distance/1000,timeMin:route.duration/60,toll:0,coords:coords.length>1?coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'osrm'};
    }catch{return fallback}finally{clearTimeout(timer)}
  })();
  ROAD_ROUTE_CACHE.set(key,promise);
  const result=await promise;
  ROAD_ROUTE_CACHE.set(key,result);
  return result;
}
function weatherText(code){if(code===0)return '맑음';if([1,2].includes(code))return '대체로 맑음';if(code===3)return '흐림';if([45,48].includes(code))return '안개';if([51,53,55,56,57].includes(code))return '이슬비';if([61,63,65,66,67,80,81,82].includes(code))return '비';if([71,73,75,77,85,86].includes(code))return '눈';if([95,96,99].includes(code))return '뇌우';return '변동'}
async function clientWeather(lat,lng){try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=Asia%2FSeoul&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability,weather_code,temperature_2m,wind_speed_10m&forecast_days=3`;const r=await fetch(u);if(!r.ok)throw 0;const j=await r.json();const c=j.current||{};return {current:{temperature_2m:c.temperature_2m,apparent_temperature:c.apparent_temperature,weather_code:c.weather_code,condition:weatherText(c.weather_code),wind_speed_10m:c.wind_speed_10m,precipitation_probability:j.hourly?.precipitation_probability?.[0]||0,source:'open-meteo'},hourly:(j.hourly?.time||[]).map((t,i)=>({time:t,temperature_2m:j.hourly.temperature_2m[i],precipitation_probability:j.hourly.precipitation_probability[i],weather_code:j.hourly.weather_code[i],condition:weatherText(j.hourly.weather_code[i]),wind_speed_10m:j.hourly.wind_speed_10m[i],source:'open-meteo'}))}}catch{return {current:{source:'fallback',condition:'날씨 확인 필요',temperature_2m:null,apparent_temperature:null,wind_speed_10m:null,precipitation_probability:null},hourly:[]}}}
function scheduleWindow(dep,ret){const a=new Date(dep),b=new Date(ret);return !isNaN(a)&&!isNaN(b)&&b>a?(b-a)/60000:null}
function recommendationRegion(name=''){
  const regions=['서울','부산','대구','인천','광주','대전','울산','진주','사천','통영','거제','남해','여수','순천','광양','하동','합천','산청','함양','거창','창원','김해','경주','전주','담양','공주','보령','군산','제천','안동','포항','강릉','속초','춘천','제주'];
  return regions.find(r=>name.startsWith(r)||name.includes(r))||name.split(/\s+/)[0]||'기타';
}
function diversifyRecommendations(items,limit=10){
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
function normalizedDistanceRange(body={}){
  let min=Math.max(0,Math.min(400,Math.round(Number(body.minKm??0)/10)*10));
  let max=Math.max(0,Math.min(400,Math.round(Number(body.targetKm??100)/10)*10));
  if(max<min)[min,max]=[max,min];
  if(max-min<10){
    if(max<400)max=Math.min(400,min+10);
    else min=Math.max(0,max-10);
  }
  return {min,max};
}
function localRecommend(body){
  const o=body.origin,{min:minKm,max:maxKm}=normalizedDistanceRange(body),cats=body.categories||[],dir=body.direction||'전체',
    avail=scheduleWindow(body.departure,body.returnTime),focus=(body.focusQuery||'').trim().toLowerCase(),
    profile=body.semanticProfile||null;

  const all=RAW_PLACES.map(p=>({...p,geoDistanceKm:geoKm(o,p),distanceKm:geoKm(o,p),bearing:geoBearing(o,p)}));
  let arr=[...all];

  const hardCats=profile?.hardCategories||[];
  const preferredCats=profile?.preferredCategories||[];
  const band=body.distanceBand&&Number.isFinite(Number(body.distanceBand.min))&&Number.isFinite(Number(body.distanceBand.max))
    ?{min:Math.max(0,Number(body.distanceBand.min)),max:Math.min(400,Number(body.distanceBand.max))}
    :null;
  const activeMin=band?band.min:minKm,activeMax=band?band.max:maxKm;

  if(focus){
    const tokens=focus.split(/\s+/).filter(Boolean);
    const direct=arr.filter(p=>tokens.some(t=>p.name.toLowerCase().includes(t)));
    if(direct.length){const centers=direct;arr=arr.filter(p=>centers.some(c=>geoKm(c,p)<=40)||direct.includes(p))}
  }else{
    // 실제 도로거리는 직선거리보다 길어질 수 있으므로 최소값은 여유 있게 55%부터 후보화하고,
    // 최대값은 직선거리상 넘을 수 없는 장소만 먼저 제거한다.
    arr=arr.filter(p=>p.geoDistanceKm<=activeMax&&p.geoDistanceKm>=Math.max(0,activeMin*.55));
    if(dir!=='전체'&&DIR_DEG[dir]!=null)arr=arr.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=55);

    const naturalHard=hardCats.some(c=>['바다','산','공원','캠핑'].includes(c));
    if(profile?.flags?.trendy&&!naturalHard){
      const urban=arr.filter(p=>URBAN_CATEGORIES.includes(p.category));
      if(urban.length)arr=urban;
    }else if(hardCats.length)arr=arr.filter(p=>hardCats.includes(p.category));
    else if(profile&&preferredCats.length){
      const preferred=arr.filter(p=>preferredCats.includes(p.category));
      arr=preferred.length>=3?preferred:[...preferred,...arr.filter(p=>!preferredCats.includes(p.category))];
    }else if(!profile&&cats.length)arr=arr.filter(p=>cats.includes(p.category));
  }

  if(profile&&arr.length<6&&!focus){
    let fallback=all.filter(p=>p.geoDistanceKm<=activeMax&&p.geoDistanceKm>=Math.max(0,activeMin*.45));
    if(hardCats.length)fallback=fallback.filter(p=>hardCats.includes(p.category));
    else if(preferredCats.length)fallback=fallback.filter(p=>preferredCats.includes(p.category));
    if(dir!=='전체'&&DIR_DEG[dir]!=null){
      const sameDir=fallback.filter(p=>degDiff(p.bearing,DIR_DEG[dir])<=75);
      if(sameDir.length)fallback=sameDir;
    }
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
    const cat=(!cats.length||cats.includes(p.category))?8:0;
    const dist=Math.max(0,24-Math.abs(p.geoDistanceKm-center)/span*18);
    const time=avail==null?8:(round<=avail?18:Math.max(0,18-(round-avail)/15));
    const focusBonus=focus?24:0;
    const quietPenalty=profile?.flags?.quiet&&['관광지','전통시장','체험마을'].includes(p.category)?-14:0;
    const genericPenalty=profile&&matched.length&&!semanticHits.length&&!hardFit&&!preferredFit?-18:0;
    const relaxedPenalty=p.relaxed?-10:0;
    const feasible=avail==null?true:round<=avail;
    const why=[];
    if(hardFit&&semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+'을 우선 반영');
    else if(semanticHits.length)why.push(semanticHits.slice(0,2).map(x=>x.reason||x.label).join(' + ')+' 조건과 잘 맞음');
    if(profile?.flags?.quiet&&['바다','산','공원','캠핑'].includes(p.category))why.push('한적한 분위기 선호를 자연형 장소에 반영');
    if(profile?.flags?.trendy&&URBAN_CATEGORIES.includes(p.category))why.push('힙·트렌디한 젊은 상권 데이터를 우선 반영');
    if(profile?.flags?.localHidden&&['체험마을','전통시장','공원','관광지'].includes(p.category))why.push('로컬·숨은 장소 취향 반영');
    if(profile?.flags?.picnic&&['공원','바다'].includes(p.category))why.push('피크닉하기 좋은 장소 유형 우선');
    if(profile?.flags?.wantsCafe)why.push('목적지 선택 후 4km 이내 카페 검색으로 연결');
    why.push(`${Math.round(activeMin)}~${Math.round(activeMax)}km 검색 범위 후보`);
    if(feasible&&avail!=null)why.push('설정한 귀가시간 안에 이동 가능');

    return {...p,routePreview:route,roundTripDriveMin:round,availableMin:avail,feasible,
      aiReason:why.slice(0,3).join(' · '),relaxedResult:!!p.relaxed,
      semanticIntent:(profile?.keywords||[]).join(','),
      score:Math.min(99,Math.max(1,Math.round(18+hardFit+preferredFit+semantic+urbanBoost+cat+dist+time+focusBonus+quietPenalty+genericPenalty+relaxedPenalty)))}
  }).sort((a,b)=>b.score-a.score);
  return diversifyRecommendations(ranked,14);
}
async function refineRoadDistanceResults(items,body){
  if(!Array.isArray(items)||!items.length||!body?.origin)return [];
  const {min:minKm,max:maxKm}=normalizedDistanceRange(body);
  const band=body.distanceBand&&Number.isFinite(Number(body.distanceBand.min))&&Number.isFinite(Number(body.distanceBand.max))
    ?{min:Math.max(0,Number(body.distanceBand.min)),max:Math.min(400,Number(body.distanceBand.max))}
    :null;
  const min=band?band.min:minKm,max=band?band.max:maxKm;
  const checked=await Promise.all(items.slice(0,12).map(async p=>{
    const route=await roadRoute(body.origin,p);
    const roadKm=route.distanceKm;
    if(roadKm<min||roadKm>max)return null;
    const round=route.timeMin*2,avail=scheduleWindow(body.departure,body.returnTime);
    const feasible=avail==null?true:round<=avail;
    const distanceFit=Math.max(0,14-Math.abs(roadKm-(min+max)/2)/Math.max(10,max-min)*10);
    return {...p,distanceKm:roadKm,geoDistanceKm:p.geoDistanceKm??geoKm(body.origin,p),routePreview:route,
      roundTripDriveMin:round,availableMin:avail,feasible,roadVerified:route.source==='osrm',
      score:Math.min(99,Math.round((p.score||50)+distanceFit))};
  }));
  return diversifyRecommendations(checked.filter(Boolean).sort((a,b)=>b.score-a.score),10);
}
async function localGeocode(q){const x=q.trim().toLowerCase();const local=RAW_PLACES.filter(p=>p.name.toLowerCase().includes(x)||x.includes(p.name.split(' ')[0].toLowerCase())).slice(0,5).map(p=>({name:p.name,address:'내장 여행지 데이터',lat:p.lat,lng:p.lng}));try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&countrycodes=kr&accept-language=ko`);if(r.ok){const j=await r.json();const rem=(j||[]).map(d=>({name:String(d.display_name||'').split(',')[0],address:d.display_name||'',lat:Number(d.lat),lng:Number(d.lon)}));if(rem.length)return rem}}catch{}return local}
function selectWeatherAt(w,iso){if(!w?.hourly?.length)return w.current;const t=new Date(iso).getTime();if(!Number.isFinite(t))return w.current;let best=w.hourly[0],d=Infinity;for(const x of w.hourly){const dd=Math.abs(new Date(x.time).getTime()-t);if(dd<d){best=x;d=dd}}return best}
function localCandidates(anchor,cats,maxLegKm){
  let pool=RAW_PLACES
    .filter(p=>p.id!==anchor.id)
    .map(p=>({...p,fromAnchorKm:geoKm(anchor,p)}))
    .filter(p=>p.fromAnchorKm<=maxLegKm);
  if(cats?.length){
    const preferred=pool.filter(p=>cats.includes(p.category));
    pool=[...preferred,...pool.filter(p=>!preferred.includes(p))];
  }
  return pool.sort((a,b)=>a.fromAnchorKm-b.fromAnchorKm);
}
function buildLocalChain(start,pool,maxLegKm,limit=2){
  const chosen=[],used=new Set(),remaining=[...pool];let current=start;
  while(chosen.length<limit){
    const options=remaining
      .filter(p=>!used.has(p.id))
      .map(p=>({p,leg:geoKm(current,p)}))
      .filter(x=>x.leg<=maxLegKm)
      .sort((a,b)=>a.leg-b.leg);
    if(!options.length)break;
    const next=options[0].p;chosen.push(next);used.add(next.id);current=next;
  }
  return chosen;
}
async function roadCandidatePool(anchor,cats,maxLegKm){
  let pool=RAW_PLACES.filter(p=>p.id!==anchor.id&&geoKm(anchor,p)<=Math.max(6,maxLegKm*1.45));
  if(cats?.length){
    const preferred=pool.filter(p=>cats.includes(p.category));
    pool=[...preferred,...pool.filter(p=>!preferred.includes(p))];
  }
  const checked=await Promise.all(pool.slice(0,18).map(async p=>{
    const route=await roadRoute(anchor,p);
    return route.distanceKm<=maxLegKm?{...p,fromAnchorKm:route.distanceKm,roadSource:route.source}:null;
  }));
  return checked.filter(Boolean).sort((a,b)=>a.fromAnchorKm-b.fromAnchorKm);
}
async function buildRoadChain(start,pool,maxLegKm,limit=2){
  const chosen=[],used=new Set();let current=start;
  while(chosen.length<limit){
    const candidates=pool.filter(p=>!used.has(p.id));
    if(!candidates.length)break;
    const checked=await Promise.all(candidates.slice(0,12).map(async p=>({p,route:await roadRoute(current,p)})));
    const options=checked.filter(x=>x.route.distanceKm<=maxLegKm).sort((a,b)=>a.route.distanceKm-b.route.distanceKm);
    if(!options.length)break;
    const next=options[0].p;chosen.push(next);used.add(next.id);current=next;
  }
  return chosen;
}
function walkingLeg(a,b){
  const distanceKm=geoKm(a,b)*1.12;
  return {distanceKm,timeMin:distanceKm/4.5*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'walk-estimate'};
}
async function buildLocalCourseRoute(stops,mode){
  if(!Array.isArray(stops)||stops.length<2)return {distanceKm:0,timeMin:0,toll:0,coords:stops?.length?[[stops[0].lat,stops[0].lng]]:[],source:mode==='walk'?'walk-estimate':'osrm'};
  let distanceKm=0,timeMin=0,maxLegKm=0,allRoad=true,coords=[];
  for(let i=1;i<stops.length;i++){
    const r=mode==='walk'?walkingLeg(stops[i-1],stops[i]):await roadRoute(stops[i-1],stops[i]);
    distanceKm+=r.distanceKm;timeMin+=r.timeMin;maxLegKm=Math.max(maxLegKm,r.distanceKm);
    if(mode==='drive')allRoad=allRoad&&r.source==='osrm';
    if(coords.length&&r.coords?.length)coords.push(...r.coords.slice(1));else if(r.coords?.length)coords.push(...r.coords);
  }
  return {distanceKm,timeMin,maxLegKm,toll:0,coords,source:mode==='walk'?'walk-estimate':allRoad?'osrm':'mixed'};
}
async function coursePack(body,w){
  const d=body.destination,cats=body.categories||[];
  const rain=Number(w.precipitation_probability)>=55||['비','눈','뇌우','이슬비'].includes(w.condition);

  const curatedWalk=curatedStops(d,'walk');
  const curatedDrive=curatedStops(d,'drive');
  const walkPool=curatedWalk?[]:localCandidates(d,cats,1.8);
  const drivePool=curatedDrive?[]:await roadCandidatePool(d,cats,4);
  const walkStops=curatedWalk||[d,...buildLocalChain(d,walkPool,1.8,2)];
  const driveStops=curatedDrive||[d,...await buildRoadChain(d,drivePool,4,2)];

  const configs=[
    {
      id:'A',title:'WALK · 도보 근거리',mode:'walk',
      reason:curatedWalk
        ?'같은 상권 안에서 실제로 이어 걷기 좋은 핵심 거리·시설을 순서대로 연결한 도보 코스입니다.'
        :walkStops.length>1
          ?'선택한 여행지 주변의 가까운 지점을 이어 만든 도보 코스입니다.'
          :'도보권 안에 추가 장소가 부족해 선택한 여행지를 중심으로 보여줍니다.',
      stops:walkStops
    },
    {
      id:'B',title:'DRIVE · 드라이브 코스',mode:'drive',
      reason:curatedDrive
        ?'같은 도시권에서 성격이 이어지는 번화가·문화거리·시장 등을 차량으로 연결한 드라이브 코스입니다.'
        :driveStops.length>1
          ?'선택 지역 안에서 가까운 지점을 차량으로 이어 만든 드라이브 코스입니다.'
          :'도로거리 4km 이내 적합한 추가 장소가 부족해 선택한 여행지 중심으로 구성했습니다.',
      stops:driveStops
    }
  ];

  const results=[];
  for(const c of configs){
    const route=await buildLocalCourseRoute(c.stops,c.mode);
    const vehicle=activeVehicleProfile(body);
    const fuel=c.mode==='drive'?route.distanceKm/vehicle.efficiency:0;
    const fuelCost=c.mode==='drive'?Math.round(fuel*vehicle.energyPrice):0;
    results.push({...c,
      weatherFit:rain?(c.mode==='walk'?'낮음':'보통'):'높음',
      localRule:c.mode==='walk'
        ?(curatedWalk?'큐레이션 도보 연계 · 출발지 제외':'여행지 주변 도보 근거리 · 출발지 제외')
        :(curatedDrive?'큐레이션 도시권 드라이브 · 출발지 제외':route.source==='osrm'?'여행지 주변 실제 도로거리 4km 이내':'여행지 주변 4km 이내 · 경로 실패 구간은 근사'),
      maxLocalLegKm:route.maxLegKm||0,
      route,
      estimatedCost:{fuelCost,toll:0,total:fuelCost}
    });
  }
  return results;
}
function localAI(message,context){
  const m=message.trim(),compact=m.replace(/\s+/g,''),patch={};let focus='';

  const sliderRange=normalizedDistanceRange(context),sliderKm=sliderRange.max;
  const distance={min:sliderRange.min,max:sliderRange.max,km:sliderRange.max,mode:'range',fromSlider:true};
  const dir=['북동','남동','남서','북서','북','동','남','서'].find(d=>m.includes(d));if(dir)patch.direction=dir;

  const semanticRules=[
    {id:'wave',label:'파도·해안',kind:'hard',weight:24,re:/파도|거친바다|바닷소리|해안|바다보고|바다보러|물멍/,categories:['바다'],reason:'파도·해안 풍경'},
    {id:'stargazing',label:'별·밤하늘',kind:'hard',weight:22,re:/별.*(보|잘)|별보기|별구경|은하수|천체|밤하늘|별사진/,categories:['산','캠핑','바다','공원'],reason:'별·밤하늘 감상'},
    {id:'sunset',label:'노을·일몰',kind:'hard',weight:18,re:/노을|일몰|석양|해질녘|선셋/,categories:['바다','산','공원'],reason:'노을·일몰 감상'},
    {id:'sunrise',label:'일출·해돋이',kind:'hard',weight:18,re:/일출|해돋이|해뜨는|선라이즈/,categories:['바다','산'],reason:'일출·해돋이 감상'},
    {id:'hiking',label:'등산·트레킹',kind:'hard',weight:22,re:/등산|산타|정상|등반|트레킹/,categories:['산'],reason:'등산·트레킹'},
    {id:'museum',label:'전시·뮤지엄',kind:'hard',weight:22,re:/박물관|미술관|뮤지엄|전시|갤러리|과학관/,categories:['뮤지엄'],reason:'전시·문화 관람'},
    {id:'market',label:'시장·로컬',kind:'hard',weight:18,re:/전통시장|야시장|시장구경/,categories:['전통시장'],reason:'로컬 시장·골목'},
    {id:'experience',label:'체험',kind:'hard',weight:18,re:/체험|만들기|공방|농촌|마을체험|직접해/,categories:['체험마을'],reason:'직접 하는 체험'},
    {id:'history',label:'역사·문화',kind:'hard',weight:16,re:/역사|문화재|고궁|성곽|사찰|절|한옥|유적/,categories:['관광지','뮤지엄','체험마을'],reason:'역사·문화 체험'},

    {id:'quiet',label:'조용·한적',kind:'mood',weight:13,re:/조용|한적|사람이?(많지않|적|없는)|사람적은|북적이지|붐비지|여유로운|한산|복잡하지/,categories:['바다','산','공원','캠핑'],reason:'조용하고 한적한 분위기'},
    {id:'relax',label:'휴식·힐링',kind:'mood',weight:12,re:/쉬고|쉬고싶|휴식|힐링|멍때리|느긋|머리식히|답답|기분전환/,categories:['바다','공원','산'],reason:'휴식·기분전환'},
    {id:'romantic',label:'감성·분위기',kind:'mood',weight:10,re:/감성|감성적인|분위기좋|분위기있는|무드있는|무드좋|낭만|로맨틱|데이트감성|포근|아늑/,categories:['바다','공원','관광지'],reason:'감성적인 분위기'},
    {id:'active',label:'활동적',kind:'mood',weight:10,re:/활동적|움직이고|신나게|액티비티/,categories:['산','체험마을','공원'],reason:'활동적인 일정'},
    {id:'trendy',label:'힙·트렌디',kind:'mood',weight:26,re:/힙한|힙한곳|힙플|핫플|핫플레이스|트렌디|트렌디한|요즘뜨는|요즘핫한|요즘유행|mz|엠지|감각적|감각적인|세련된|유니크|개성있는|개성적인|스타일리시/,categories:['번화가','카페거리','문화거리','쇼핑거리'],reason:'힙하고 트렌디한 상권·거리'},
    {id:'urbanhotspot',label:'번화가·젊은상권',kind:'hard',weight:30,re:/번화가|젊은사람|젊은층|유동인구|사람많은곳|사람많은데|사람붐비는|대학가|핫한상권|상권|쇼핑거리|놀거리많은|술집많은|밤놀기|도심핫플|젊음의거리/,categories:['번화가','카페거리','문화거리','쇼핑거리'],reason:'젊은 층이 많이 찾는 도심 상권'},
    {id:'localhidden',label:'로컬·숨은명소',kind:'mood',weight:15,re:/로컬|찐로컬|현지인|동네사람|숨은명소|숨은곳|덜알려진|안유명한|유명하지않|사람들이잘모르는|관광객적은|관광객없는|골목감성|동네감성/,categories:['체험마을','전통시장','공원','관광지'],reason:'로컬·숨은 장소 분위기'},
    {id:'retro',label:'레트로·빈티지',kind:'mood',weight:14,re:/레트로|뉴트로|빈티지|복고|옛날감성|옛감성|오래된감성|세월감|아날로그|필름감성|필카감성/,categories:['전통시장','체험마을','관광지','뮤지엄'],reason:'레트로·빈티지 분위기'},
    {id:'artspace',label:'예술·공간',kind:'soft',weight:15,re:/예술|아트|디자인|공예|공방거리|복합문화공간|문화공간|전시공간|창작공간|작업실|아트스페이스|설치미술|미디어아트/,categories:['뮤지엄','체험마을','관광지'],reason:'예술·문화 공간'},
    {id:'architecture',label:'건축·공간미',kind:'soft',weight:14,re:/건축|건축물|공간미|공간디자인|인테리어|건물구경|근대건축|산업유산|창고개조|공장개조|한옥감성|모던건축/,categories:['관광지','뮤지엄','체험마을'],reason:'건축·공간 디자인'},
    {id:'alley',label:'골목·마을',kind:'soft',weight:13,re:/골목|골목길|마을길|벽화골목|동네산책|구도심|원도심|옛동네|작은마을|마을구경/,categories:['체험마을','전통시장','관광지'],reason:'골목·마을 산책'},
    {id:'bookish',label:'책·서점감성',kind:'soft',weight:10,re:/책방|독립서점|서점|북카페|책구경|책읽기|문학|북스테이/,categories:['뮤지엄','체험마을','관광지'],reason:'책·문화 감성'},
    {id:'oceanview',label:'오션뷰·바다뷰',kind:'hard',weight:22,re:/오션뷰|바다뷰|해안뷰|씨뷰|바다가보이는|바다보이는|바다앞|바닷가뷰/,categories:['바다'],reason:'바다 전망'},
    {id:'waterside',label:'수변·호수',kind:'soft',weight:14,re:/호수|호숫가|강변|강가|수변|저수지|연못|물가|리버뷰|레이크뷰|수변공원/,categories:['공원','관광지'],reason:'수변·호수 풍경'},
    {id:'picnic',label:'피크닉·잔디',kind:'soft',weight:14,re:/피크닉|돗자리|잔디|잔디밭|도시락|소풍|피크닉하기|누워있기|누워서쉬기/,categories:['공원','바다'],reason:'피크닉·잔디 휴식'},
    {id:'photo',label:'사진·스냅',kind:'soft',weight:13,re:/스냅|스냅사진|필름사진|필카|사진맛집|포토스팟|포토존|인생사진|인생샷|사진찍기|사진찍을/,categories:['바다','공원','뮤지엄','관광지','체험마을'],reason:'사진·스냅 촬영'},
    {id:'cityview',label:'도시뷰·시티감성',kind:'soft',weight:11,re:/도시뷰|시티뷰|스카이라인|도심뷰|도시야경|도심감성|시티감성|도시구경/,categories:['관광지','공원','뮤지엄'],reason:'도시 풍경·시티 감성'},
    {id:'lively',label:'활기·북적임',kind:'mood',weight:10,re:/활기찬|활기있는|북적이는|사람많은|사람많아도|시장분위기|왁자지껄|생동감/,categories:['전통시장','관광지','체험마을'],reason:'활기찬 분위기'},
    {id:'minimal',label:'미니멀·차분',kind:'mood',weight:9,re:/미니멀|깔끔한|정갈한|차분한|담백한|모던한|심플한/,categories:['뮤지엄','공원','관광지'],reason:'차분하고 정돈된 분위기'},
    {id:'unique',label:'이색·특이한곳',kind:'mood',weight:13,re:/이색|이색적인|특이한|특색있는|색다른|독특한|신기한|별난|평범하지않|남들과다른/,categories:['체험마을','뮤지엄','관광지'],reason:'이색적이고 특색 있는 장소'},
    {id:'cozy',label:'아늑·포근',kind:'mood',weight:10,re:/아늑|포근|편안한|편안하게|따뜻한분위기|아기자기|소박한/,categories:['공원','뮤지엄','체험마을','관광지'],reason:'아늑하고 편안한 분위기'},
    {id:'openair',label:'탁트인·개방감',kind:'mood',weight:12,re:/탁트인|탁트인곳|뻥뚫린|개방감|시야좋은|시원하게트인|넓게트인/,categories:['바다','산','공원'],reason:'탁 트인 개방감'},
    {id:'healingview',label:'멍·뷰힐링',kind:'mood',weight:12,re:/물멍|산멍|불멍|뷰멍|멍하니|멍때리기|가만히보기|아무생각없이/,categories:['바다','산','공원','캠핑'],reason:'가만히 쉬며 풍경 보기'},
    {id:'seasonal',label:'계절감성',kind:'soft',weight:10,re:/봄감성|여름감성|가을감성|겨울감성|계절감|제철풍경|계절풍경/,categories:['공원','산','바다','관광지'],reason:'계절 분위기'},
    {id:'morning',label:'아침·브런치시간',kind:'condition',weight:0,re:/아침에|오전에|모닝|브런치시간|늦은아침/,categories:[],reason:'아침 시간대'},
    {id:'evening',label:'저녁·밤시간',kind:'condition',weight:0,re:/저녁에|저녁시간|밤에가|밤늦게|야간|퇴근후/,categories:[],reason:'저녁·야간 시간대'},
    {id:'shortstop',label:'잠깐·가볍게',kind:'mood',weight:8,re:/잠깐|짧게|가볍게|잠시|한두시간|두시간정도|시간많이안쓰고/,categories:['공원','바다','뮤지엄','관광지'],reason:'짧고 가벼운 일정'},
    {id:'slowtrip',label:'느린여행',kind:'mood',weight:10,re:/슬로우|느린여행|천천히|느긋하게|여유롭게|서두르지않고/,categories:['공원','바다','체험마을','전통시장'],reason:'느긋한 여행 분위기'},

    {id:'scenic',label:'풍경·전망',kind:'soft',weight:12,re:/전망|풍경|뷰좋|뷰좋은|경치|절경|파노라마|전망좋은|뷰맛집|전망대/,categories:['바다','산','공원','관광지'],reason:'풍경·전망'},
    {id:'drive',label:'드라이브',kind:'soft',weight:10,re:/드라이브|드라이브하기|차타고|차로가|차타고가|운전하며|해안도로|도로풍경|차박가기/,categories:['바다','산','관광지'],reason:'드라이브하기 좋은 동선'},
    {id:'walk',label:'산책·걷기',kind:'soft',weight:10,re:/산책|산책하기|산책로|걷고|걷기|걷기좋은|둘레길|데크길|트레일|가볍게걷|슬슬걷/,categories:['공원','바다','산','관광지'],reason:'걷기·산책'},
    {id:'forest',label:'숲·자연',kind:'soft',weight:14,re:/숲|숲길|수목원|나무|자연|자연속|계곡|피톤치드|초록초록|녹음|산림욕/,categories:['산','공원'],reason:'숲·자연 휴식'},
    {id:'flower',label:'꽃·정원',kind:'soft',weight:12,re:/꽃|정원|수국|벚꽃|매화|단풍|억새|코스모스/,categories:['공원','관광지'],reason:'꽃·정원 풍경'},
    {id:'night',label:'야경·밤',kind:'soft',weight:11,re:/야경|야간뷰|밤에|밤풍경|불빛|조명|네온|빛축제|밤산책/,categories:['바다','공원','관광지'],reason:'야경·밤 풍경'},
    {id:'date',label:'데이트',kind:'soft',weight:8,re:/데이트|커플|연인|둘이서/,categories:['바다','공원','관광지'],reason:'데이트 분위기'},
    {id:'family',label:'가족·아이',kind:'soft',weight:8,re:/아이랑|아이와|가족|애기|아기|어린이|부모님/,categories:['체험마을','공원','뮤지엄','관광지'],reason:'가족 동반'},
    {id:'solo',label:'혼자 여행',kind:'soft',weight:8,re:/혼자|혼여|혼자서|혼자여행/,categories:['뮤지엄','공원','바다'],reason:'혼자 머물기 좋은 여행'},
    {id:'pet',label:'반려동물',kind:'soft',weight:8,re:/강아지|반려견|반려동물|애견|댕댕/,categories:['공원','캠핑','바다'],reason:'반려동물 동반'},

    {id:'rain',label:'비 오는 날',kind:'condition',weight:0,re:/비오|비오는|비가오|비내|우천|장마|빗소리|비인데/,categories:[],reason:'비 오는 상황'},
    {id:'cold',label:'추운 날',kind:'condition',weight:0,re:/추워|추운|쌀쌀|한파|기온낮/,categories:[],reason:'추운 날씨'},
    {id:'hotweather',label:'더운 날',kind:'condition',weight:0,re:/더워|더운|폭염|무더위/,categories:[],reason:'더운 날씨'},
    {id:'indoor',label:'실내',kind:'hard',weight:18,re:/실내|비피할|춥지않|덥지않|에어컨/,categories:['뮤지엄','전통시장','체험마을','관광지'],reason:'실내 중심 일정'},

    {id:'cafe',label:'카페·커피',kind:'amenity',weight:0,re:/카페|카페투어|카페거리|커피|라떼|아메리카노|에스프레소|브런치|디저트|베이커리|빵집|로스터리|커피맛집|디저트맛집|뷰카페|대형카페|감성카페|한옥카페|테라스카페|루프탑카페/,categories:[],reason:'카페·커피 취향'},
    {id:'warmdrink',label:'따뜻한 음료',kind:'amenity',weight:0,re:/따뜻한(라떼|커피|차|음료)|뜨거운(커피|차)|핫초코/,categories:[],reason:'따뜻한 음료'},
    {id:'food',label:'맛집·먹거리',kind:'amenity',weight:0,re:/맛집|찐맛집|로컬맛집|현지인맛집|먹거리|밥|식사|혼밥|브런치|국밥|회|해산물|고기|면|분식|맛있는|노포|노포맛집|시장먹거리|간식|야식/,categories:[],reason:'먹거리·맛집'},
    {id:'souvenir',label:'소품·쇼핑',kind:'amenity',weight:0,re:/소품|소품샵|기념품|쇼핑|편집샵|셀렉트샵|라이프스타일샵|문구|문구점|굿즈|빈티지샵|플리마켓|마켓구경/,categories:[],reason:'소품·기념품 쇼핑'}
  ];

  const matches=semanticRules.filter(r=>r.re.test(compact));
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
async function api(url,opts={}){const u=new URL(url,location.href),method=(opts.method||'GET').toUpperCase(),body=opts.body?JSON.parse(opts.body):{};
  if(u.pathname.endsWith('/api/config'))return {providers:{kakao:false,tmap:false,openai:false,weather:true},defaultGasPrice:1858,fuelEconomyKmL:11,publicBaseUrl:''};
  if(u.pathname.endsWith('/api/geocode'))return {items:await localGeocode(u.searchParams.get('q')||'')};
  if(u.pathname.endsWith('/api/bootstrap')){const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng')),weather=await clientWeather(lat,lng);return {weather,traffic:{label:'경로 선택 후 계산',avgSpeed:0,source:'정적 배포판'},updatedAt:new Date().toISOString()}}
  if(u.pathname.endsWith('/api/recommend')){const base=localRecommend(body),items=await refineRoadDistanceResults(base,body);return {items,source:items.some(x=>x.roadVerified)?'도로 경로 + 내장 장소 데이터':'근사 경로 + 내장 장소 데이터'}};
  if(u.pathname.endsWith('/api/trip-summary')){
    const [a,b]=await Promise.all([roadRoute(body.origin,body.destination),roadRoute(body.destination,body.origin)]);
    const distanceKm=a.distanceKm+b.distanceKm,drivingMin=a.timeMin+b.timeMin,vehicle=activeVehicleProfile(body);
    const energyAmount=distanceKm/vehicle.efficiency,energyCost=Math.round(energyAmount*vehicle.energyPrice);
    const toll=estimateRoundTripToll(distanceKm,vehicle.tollDiscount);
    return {outbound:a,inbound:b,total:{
      distanceKm,drivingMin,toll,tripCost:energyCost+toll,
      fuelLiters:energyAmount,fuelCost:energyCost,
      energyAmount,energyCost,energyUnit:vehicle.energyUnit,energyPrice:vehicle.energyPrice,
      vehicleLabel:vehicle.vehicleLabel,fuelLabel:vehicle.fuelLabel,efficiency:vehicle.efficiency,efficiencyUnit:vehicle.efficiencyUnit,
      energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',
      costLabel:vehicle.fuel==='electric'?'충전비':'연료비'
    },fuelEconomyKmL:vehicle.efficiency}
  }
  if(u.pathname.endsWith('/api/courses')){const ww=await clientWeather(body.destination.lat,body.destination.lng),w=selectWeatherAt(ww,body.departure);return {weather:w,courses:await coursePack(body,w),provider:{ai:false,road:'osrm-or-fallback',kakao:false}}}
  if(u.pathname.endsWith('/api/ai-search')){const r=localAI(body.message||'',body.context||{});if(r.intent==='travel_search'&&body.context?.origin){const merged={...body.context,...r.patch,focusQuery:r.focusQuery,semanticProfile:r.semanticProfile};r.items=await refineRoadDistanceResults(localRecommend(merged),merged)}return r}
  throw new Error('지원하지 않는 요청입니다.');
}


function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone===true}
function encodeShare(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeShare(str){try{let s=str.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}}
function appBaseUrl(){return state.config?.publicBaseUrl || `${location.origin}${location.pathname}`}
function buildShareUrl(){
  if(!state.selected)return appBaseUrl();
  const payload={v:1,destination:{name:state.selected.name,category:state.selected.category,lat:state.selected.lat,lng:state.selected.lng,address:state.selected.address||''},course:state.selectedCourse||'',minKm:state.minKm,targetKm:state.targetKm,direction:state.direction,categories:state.categories};
  const u=new URL(appBaseUrl(),location.href);u.searchParams.set('trip',encodeShare(payload));return u.toString();
}
async function shareTrip(){
  const hasTrip=!!state.selected;const url=buildShareUrl();
  const title=hasTrip?`TRIP QUEST · ${state.selected.name}`:'TRIP QUEST · 국내여행 AI 플래너';
  const text=hasTrip?`${state.selected.name}${state.selectedCourse?` · ${state.selectedCourse}코스`:''}\nTRIP QUEST에서 여행 정보를 확인해보세요.`:'국내여행 AI 플래너 TRIP QUEST';
  try{if(navigator.share){await navigator.share({title,text,url});return}await navigator.clipboard.writeText(url);toast('공유 링크를 복사했습니다.')}catch(e){if(e?.name!=='AbortError')toast('공유를 완료하지 못했습니다.')}
}
function hydrateSharedTrip(){
  const q=new URL(location.href).searchParams.get('trip');if(!q)return;
  const data=decodeShare(q);if(!data?.destination?.name)return;state.sharedTrip=data;
  $('#sharedTripBanner').hidden=false;setText('#sharedTripTitle',data.destination.name);setText('#sharedTripMeta',`${data.destination.category||'여행지'}${data.course?` · ${data.course}코스`:''} · 공유 링크`);
}
async function useSharedTrip(){
  const d=state.sharedTrip;if(!d)return;
  if(Number.isFinite(Number(d.minKm)))state.minKm=Number(d.minKm);if(Number.isFinite(Number(d.targetKm)))state.targetKm=Number(d.targetKm);syncDistanceUI()
  if(d.direction&&['전체','북','북동','동','남동','남','남서','서','북서'].includes(d.direction)){state.direction=d.direction;syncDirectionUI()}
  if(Array.isArray(d.categories)&&d.categories.length){state.categories=d.categories.filter(x=>categoryLabels.includes(x));syncCategoriesUI()}
  if(!state.origin){state.sharedPending=true;setStep(1);toast('출발지를 설정하면 공유 받은 여행지를 기준으로 다시 계산합니다.');return}
  await recommend({focusQuery:d.destination.name});
}
function initPWA(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
  hydrateSharedTrip();
  const btn=$('#installBtn');
  if(isStandalone()){btn.hidden=true}else if(isIOS()){btn.hidden=false;btn.textContent='홈 화면 추가'}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;btn.hidden=false;btn.textContent='앱 설치'});
  window.addEventListener('appinstalled',()=>{state.installPrompt=null;btn.hidden=true;toast('TRIP QUEST가 설치되었습니다.')});
  btn.onclick=async()=>{if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;btn.hidden=true}else if(isIOS()){$('#iosInstallTip').hidden=false}else toast('브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.')};
  $('#closeInstallTip').onclick=()=>$('#iosInstallTip').hidden=true;
  $('#iosInstallTip').onclick=e=>{if(e.target===$('#iosInstallTip'))$('#iosInstallTip').hidden=true};
  $('#topShareBtn').onclick=shareTrip;$('#shareTripBtn').onclick=shareTrip;$('#sharedTripUseBtn').onclick=useSharedTrip;
}

function initTimes(){
  const now=new Date(); const d=new Date(now); d.setMinutes(Math.ceil(d.getMinutes()/30)*30,0,0); const ret=new Date(d); ret.setHours(ret.getHours()+8);
  const local=x=>{const z=new Date(x.getTime()-x.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)};
  $('#departTime').value=local(d); $('#returnTime').value=local(ret); updateSchedulePreview();
}
function updateSchedulePreview(){
  const dep=new Date($('#departTime').value),ret=new Date($('#returnTime').value);let html='';
  if(!Number.isNaN(dep.valueOf())&&!Number.isNaN(ret.valueOf())&&ret>dep){const mins=(ret-dep)/60000;html=`<span>사용 가능 ${fmtMin(mins)}</span><span>출발 ${dep.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span><span>귀가 ${ret.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>`}
  $('#schedulePreview').innerHTML=html;
}

function initMap(){
  if(typeof L==='undefined'){$('#map').innerHTML='<div class="empty-state">지도를 불러오지 못했습니다.<br>인터넷 연결을 확인하세요.</div>';return}
  state.map=L.map('map',{zoomControl:true}).setView([35.6,128.0],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors',className:'dark-map-tiles'}).addTo(state.map);
}
