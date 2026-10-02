const EARTH_M=6371000;
function rad(v){return Number(v)*Math.PI/180}
export function distanceMeters(a,b){
  const dLat=rad(Number(b.lat)-Number(a.lat)),dLng=rad(Number(b.lng)-Number(a.lng));
  const lat1=rad(a.lat),lat2=rad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*EARTH_M*Math.asin(Math.min(1,Math.sqrt(h)));
}

export function createCheckpointVerifier(checkpoint,config={}){
  const settings={
    radiusM:Math.max(20,Number(config.radiusM)||120),
    maxAccuracyM:Math.max(10,Number(config.maxAccuracyM)||60),
    requiredHits:Math.max(1,Number(config.requiredHits)||3),
    dwellMs:Number.isFinite(Number(config.dwellMs))?Math.max(0,Number(config.dwellMs)):20000,
    maxAgeMs:Math.max(1000,Number(config.maxAgeMs)||30000),
    maxJumpSpeedKmh:Math.max(30,Number(config.maxJumpSpeedKmh)||180)
  };
  let enteredAt=null,hits=0,lastAccepted=null,verified=false;

  function resetInside(){enteredAt=null;hits=0}
  function evaluate(position,receivedAt=Date.now()){
    if(verified)return {status:'verified',verified:true,progress:1,hits,dwellMs:settings.dwellMs};
    const lat=Number(position?.lat),lng=Number(position?.lng),accuracyM=Number(position?.accuracyM),timestamp=Number(position?.timestamp)||receivedAt;
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return {status:'invalid',verified:false,progress:0};
    const ageMs=Math.max(0,receivedAt-timestamp);
    if(ageMs>settings.maxAgeMs)return {status:'stale',verified:false,ageMs,progress:0};
    if(!Number.isFinite(accuracyM)||accuracyM>settings.maxAccuracyM)return {status:'weak',verified:false,accuracyM,progress:0};

    if(lastAccepted){
      const dtMs=Math.max(1,timestamp-lastAccepted.timestamp);
      const jumpM=distanceMeters(lastAccepted,{lat,lng});
      const speedKmh=(jumpM/(dtMs/1000))*3.6;
      if(dtMs<120000&&jumpM>250&&speedKmh>settings.maxJumpSpeedKmh)return {status:'jump',verified:false,jumpM,speedKmh,progress:0};
    }
    lastAccepted={lat,lng,timestamp};

    const distanceM=distanceMeters({lat,lng},checkpoint);
    if(distanceM>settings.radiusM){resetInside();return {status:'outside',verified:false,distanceM,accuracyM,progress:0,hits:0,dwellMs:0}}
    if(enteredAt===null)enteredAt=timestamp;
    hits++;
    const dwellMs=Math.max(0,timestamp-enteredAt);
    const hitProgress=Math.min(1,hits/settings.requiredHits),dwellProgress=settings.dwellMs?Math.min(1,dwellMs/settings.dwellMs):1;
    const progress=Math.min(hitProgress,dwellProgress);
    if(hits>=settings.requiredHits&&dwellMs>=settings.dwellMs){verified=true;return {status:'verified',verified:true,distanceM,accuracyM,hits,dwellMs,progress:1}}
    return {status:'verifying',verified:false,distanceM,accuracyM,hits,dwellMs,progress};
  }

  return {evaluate,reset(){enteredAt=null;hits=0;lastAccepted=null;verified=false},settings};
}
