export const GPS_ERROR_TYPES={
  1:'permission_denied',
  2:'position_unavailable',
  3:'timeout'
};

export function normalizeGpsError(error={}){
  const type=GPS_ERROR_TYPES[Number(error.code)]||error.type||'unknown';
  const messages={
    permission_denied:'위치 권한이 거부되었습니다. 브라우저 또는 기기 설정에서 위치 권한을 허용해주세요.',
    position_unavailable:'현재 위치를 확인할 수 없습니다. GPS와 네트워크 상태를 확인해주세요.',
    timeout:'위치 확인 시간이 초과되었습니다. 하늘이 트인 곳에서 다시 시도해주세요.',
    insecure:'GPS QUEST는 HTTPS 보안 연결에서만 사용할 수 있습니다.',
    unsupported:'이 브라우저에서는 위치 기능을 사용할 수 없습니다.',
    unknown:'위치를 확인하는 중 문제가 발생했습니다.'
  };
  return {type,message:messages[type]||messages.unknown,code:Number(error.code)||0,recoverable:type!=='permission_denied'&&type!=='insecure'&&type!=='unsupported'};
}

export function normalizePosition(position={},now=()=>Date.now()){
  const coords=position.coords||{};
  return {
    lat:Number(coords.latitude),
    lng:Number(coords.longitude),
    accuracyM:Number(coords.accuracy),
    speedMps:Number.isFinite(Number(coords.speed))?Number(coords.speed):null,
    heading:Number.isFinite(Number(coords.heading))?Number(coords.heading):null,
    timestamp:Number(position.timestamp)||now(),
    receivedAt:now()
  };
}

export function createGpsService({navigatorRef=globalThis.navigator,windowRef=globalThis.window,now=()=>Date.now()}={}){
  let watchId=null;
  function isSecure(){
    if(!windowRef)return true;
    if(windowRef.isSecureContext===true)return true;
    const host=windowRef.location?.hostname||'';
    return host==='localhost'||host==='127.0.0.1';
  }
  function support(){
    if(!isSecure())return {ok:false,error:normalizeGpsError({type:'insecure'})};
    if(!navigatorRef?.geolocation)return {ok:false,error:normalizeGpsError({type:'unsupported'})};
    return {ok:true,error:null};
  }
  async function permissionState(){
    if(!navigatorRef?.permissions?.query)return 'unknown';
    try{return (await navigatorRef.permissions.query({name:'geolocation'})).state||'unknown'}catch{return 'unknown'}
  }
  function current(options={}){
    const state=support();if(!state.ok)return Promise.reject(state.error);
    return new Promise((resolve,reject)=>{
      navigatorRef.geolocation.getCurrentPosition(
        pos=>resolve(normalizePosition(pos,now)),
        err=>reject(normalizeGpsError(err)),
        {enableHighAccuracy:true,timeout:15000,maximumAge:5000,...options}
      );
    });
  }
  function watch({onPosition,onError,options={}}={}){
    const state=support();
    if(!state.ok){onError?.(state.error);return null}
    stop();
    watchId=navigatorRef.geolocation.watchPosition(
      pos=>onPosition?.(normalizePosition(pos,now)),
      err=>onError?.(normalizeGpsError(err)),
      {enableHighAccuracy:true,timeout:15000,maximumAge:5000,...options}
    );
    return watchId;
  }
  function stop(){
    if(watchId===null||watchId===undefined)return false;
    try{navigatorRef?.geolocation?.clearWatch?.(watchId)}catch{}
    watchId=null;return true;
  }
  return {support,permissionState,current,watch,stop,isWatching:()=>watchId!==null&&watchId!==undefined};
}

export const gpsService=createGpsService();
