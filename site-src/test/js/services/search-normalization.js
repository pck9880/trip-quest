/* Shared, side-effect-free search normalization.
   Providers return their own IDs; only the UI-level results are merged here. */
const SIDO_ALIASES=new Map([
  ['서울','서울특별시'],['부산','부산광역시'],['대구','대구광역시'],
  ['인천','인천광역시'],['광주','광주광역시'],['대전','대전광역시'],
  ['울산','울산광역시'],['세종','세종특별자치시'],
  ['강원도','강원특별자치도'],['전라북도','전북특별자치도'],
  ['전북','전북특별자치도'],['제주도','제주특별자치도']
]);
export function normalizeSido(value=''){
  const text=String(value||'').trim().replace(/\s+/g,' ');
  return SIDO_ALIASES.get(text)||text;
}
function words(value=''){return String(value||'').trim().split(/\s+/).filter(Boolean)}
function addressHas(address,token){
  const expected=words(token);
  if(!expected.length)return false;
  const tokens=words(address);
  return tokens.some((_,i)=>expected.every((part,j)=>tokens[i+j]===part));
}
function dongAliases(name=''){
  const value=String(name||'').trim();
  return [value,value.replace(/(?:제)?[0-9]+동$/,'동')].filter(Boolean);
}
export function regionMatches(place,path=[]){
  const [sido,sigungu,dong]=path.filter(Boolean);
  if(!sido)return true;
  const gotSido=normalizeSido(place.sido);
  const wantedSido=normalizeSido(sido);
  // Legacy combined administrative label for Gwangju + Jeonnam in bundled source.
  if(gotSido==='전남광주통합특별시'){
    const gu=words(place.sigungu).at(-1);
    const inGwangju=['광산구','남구','동구','북구','서구'].includes(gu);
    if(wantedSido!==(inGwangju?'광주광역시':'전라남도'))return false;
  }else if(gotSido!==wantedSido && !addressHas(place.address,wantedSido)){
    return false;
  }
  if(sigungu){
    const parts=words(place.sigungu);const city=(parts[0]===wantedSido?parts.slice(1):parts).join(' ');
    if(city!==sigungu&&!addressHas(city,sigungu)&&!addressHas(place.address,sigungu))return false;
  }
  if(dong){
    const source=String(place.eupmyeondong||'').trim();
    if(!dongAliases(dong).some(alias=>source===alias||addressHas(place.address,alias)))return false;
  }
  return true;
}
export function mergePlaces(...groups){
  const seen=new Set(),out=[];
  for(const place of groups.flat()){
    if(!place||!place.name||!Number.isFinite(Number(place.lat))||!Number.isFinite(Number(place.lng)))continue;
    const key=String(place.name).replace(/\s+/g,'').toLocaleLowerCase('ko')+'|'+Number(place.lat).toFixed(3)+'|'+Number(place.lng).toFixed(3);
    if(seen.has(key))continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}
