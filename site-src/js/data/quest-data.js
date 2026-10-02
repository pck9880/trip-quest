export const QUESTS=[
  {
    id:'busan-jeonpo-city',
    region:'부산',
    theme:'city',
    difficulty:'NORMAL',
    title:'서면에서 전포까지',
    summary:'부산 도심의 세 체크포인트를 GPS로 인증하세요.',
    xp:240,
    verification:{radiusM:120,maxAccuracyM:60,requiredHits:3,dwellMs:20000,maxAgeMs:30000,maxJumpSpeedKmh:180},
    checkpoints:[
      {id:'seomyeon-youth',name:'서면 젊음의거리',category:'번화가',lat:35.1578,lng:129.0595},
      {id:'jeonpo-cafe',name:'전포카페거리',category:'카페거리',lat:35.1555,lng:129.0644},
      {id:'samjung-tower',name:'삼정타워',category:'쇼핑거리',lat:35.1528,lng:129.0592}
    ]
  },
  {
    id:'seoul-hongdae-walk',
    region:'서울',
    theme:'city',
    difficulty:'NORMAL',
    title:'홍대 골목 탐험',
    summary:'홍대와 연남동의 대표 거리 세 곳을 직접 방문하세요.',
    xp:260,
    verification:{radiusM:130,maxAccuracyM:60,requiredHits:3,dwellMs:20000,maxAgeMs:30000,maxJumpSpeedKmh:180},
    checkpoints:[
      {id:'hongdae-street',name:'홍대 걷고싶은거리',category:'번화가',lat:37.5563,lng:126.9236},
      {id:'yeonnam-forest',name:'연남동 경의선숲길',category:'문화거리',lat:37.5621,lng:126.9253},
      {id:'mangridan',name:'망리단길',category:'카페거리',lat:37.5560,lng:126.9103}
    ]
  },
  {
    id:'gyeongju-hwangridan',
    region:'경주',
    theme:'heritage',
    difficulty:'NORMAL',
    title:'황리단길 시간여행',
    summary:'황리단길에서 첨성대까지 역사 도보 체크포인트를 인증하세요.',
    xp:280,
    verification:{radiusM:130,maxAccuracyM:60,requiredHits:3,dwellMs:20000,maxAgeMs:30000,maxJumpSpeedKmh:180},
    checkpoints:[
      {id:'hwangridan',name:'황리단길',category:'번화가',lat:35.8387,lng:129.2093},
      {id:'daereungwon',name:'대릉원',category:'문화거리',lat:35.8399,lng:129.2115},
      {id:'cheomseongdae',name:'첨성대',category:'문화거리',lat:35.8347,lng:129.2190}
    ]
  },
  {
    id:'daegu-dongseong',
    region:'대구',
    theme:'city',
    difficulty:'NORMAL',
    title:'동성로 시티런',
    summary:'동성로와 교동, 김광석길을 잇는 도심 QUEST입니다.',
    xp:250,
    verification:{radiusM:130,maxAccuracyM:60,requiredHits:3,dwellMs:20000,maxAgeMs:30000,maxJumpSpeedKmh:180},
    checkpoints:[
      {id:'dongseongro',name:'동성로',category:'번화가',lat:35.8691,lng:128.5948},
      {id:'gyodong',name:'교동',category:'문화거리',lat:35.8722,lng:128.5940},
      {id:'kim-gwangseok',name:'김광석다시그리기길',category:'문화거리',lat:35.8606,lng:128.6062}
    ]
  }
];

export function getQuest(id){return QUESTS.find(quest=>quest.id===id)||null}
export function dailyQuest(date=new Date()){
  const key=Number(`${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`);
  return QUESTS[key%QUESTS.length];
}
