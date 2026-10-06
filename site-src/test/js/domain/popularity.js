const CATEGORY_WEIGHT={
  '해수욕장':22,'관광명소':20,'대형복합시설':19,'카페거리':18,'쇼핑거리':17,
  '백화점':16,'전통시장':15,'박물관미술관':14,'공원':12,'산책로':11,
  '산':10,'사찰':9,'대형도서관':7
};

const NAME_SIGNALS=[
  [/해운대|광안리|송정|송도|다대포|일광|임랑/,20],
  [/국립|도립|시민|중앙|생태|호수|수변|문화|역사|관광|전망|랜드|테마/,7],
  [/카페거리|로데오|지하상가|전통시장|해수욕장|박물관|미술관|수목원/,8],
  [/어린이|쌈지|소공원|쉼터/, -8]
];

export function popularityScore(place={}){
  const footTraffic=Number(place.footTraffic);
  if(Number.isFinite(footTraffic)&&footTraffic>=0)return 1_000_000_000+footTraffic;

  let score=(Number(place.popularityScore)||Number(place.score)||70)*10;
  score+=CATEGORY_WEIGHT[place.category]||0;

  const source=String(place.liveSource||place.source||'');
  if(/공식|TRIP QUEST/.test(source))score+=8;

  const text=[place.name,place.subcategory,place.address].filter(Boolean).join(' ');
  for(const [pattern,weight] of NAME_SIGNALS)if(pattern.test(text))score+=weight;

  if(place.category==='공원'){
    if(/수변공원|문화공원|역사공원|근린공원/.test(place.subcategory||''))score+=5;
    if(/체육공원/.test(place.subcategory||''))score+=2;
  }
  return score;
}

export function popularBasis(items=[]){
  return items.some(x=>Number.isFinite(Number(x?.footTraffic)))?'foot-traffic':'popularity-proxy';
}

export function pickPopularRecommendations(items=[]){
  if(!Array.isArray(items)||!items.length)return [];
  const count=items.length>=3?3:1;
  return items
    .map((place,index)=>({place,index,score:popularityScore(place)}))
    .sort((a,b)=>b.score-a.score||Number(b.place.score||0)-Number(a.place.score||0)||a.place.name.localeCompare(b.place.name,'ko'))
    .slice(0,count);
}
