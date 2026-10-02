import assert from 'node:assert/strict';
import { QUESTS } from '../site-src/js/data/quest-data.js';
import { createLocationConsentService } from '../site-src/js/services/location-consent-service.js';
import { createGpsService, normalizeGpsError } from '../site-src/js/services/gps-service.js';
import { createCheckpointVerifier } from '../site-src/js/domain/quest-verification.js';
import { createQuestService } from '../site-src/js/services/quest-service.js';
import { createQuestSessionService } from '../site-src/js/services/quest-session-service.js';

class FakeStorage{
  constructor(){this.data=new Map()}
  getItem(key){return this.data.has(key)?this.data.get(key):null}
  setItem(key,value){this.data.set(key,String(value))}
  removeItem(key){this.data.delete(key)}
}

let now=new Date(2026,9,2,10,0,0);
const consentStorage=new FakeStorage();
const consent=createLocationConsentService(consentStorage,()=>new Date(now));
assert.equal(consent.isAgreed(),false);
assert.equal(consent.agree().agreed,true);
assert.ok(consent.status().agreedAt);
assert.equal(consent.revoke().agreed,false);
consent.agree();

assert.equal(normalizeGpsError({code:1}).type,'permission_denied');
assert.equal(normalizeGpsError({code:2}).type,'position_unavailable');
assert.equal(normalizeGpsError({code:3}).type,'timeout');

let clearedId=null,watchHandlers=null;
const fakeNavigator={
  permissions:{query:async()=>({state:'granted'})},
  geolocation:{
    getCurrentPosition(success){success({coords:{latitude:35,longitude:129,accuracy:15},timestamp:1000})},
    watchPosition(success,error){watchHandlers={success,error};return 77},
    clearWatch(id){clearedId=id}
  }
};
const gps=createGpsService({navigatorRef:fakeNavigator,windowRef:{isSecureContext:true,location:{hostname:'example.com'}},now:()=>1000});
assert.equal(gps.support().ok,true);
assert.equal(await gps.permissionState(),'granted');
assert.equal((await gps.current()).accuracyM,15);
gps.watch({onPosition:()=>{},onError:()=>{}});
assert.equal(gps.isWatching(),true);
assert.equal(gps.stop(),true);
assert.equal(clearedId,77);
const insecureGps=createGpsService({navigatorRef:fakeNavigator,windowRef:{isSecureContext:false,location:{hostname:'example.com'}}});
assert.equal(insecureGps.support().error.type,'insecure');

const checkpoint={id:'cp',lat:35,lng:129};
const verifier=createCheckpointVerifier(checkpoint,{radiusM:120,maxAccuracyM:60,requiredHits:3,dwellMs:20000,maxAgeMs:30000,maxJumpSpeedKmh:180});
assert.equal(verifier.evaluate({lat:35,lng:129,accuracyM:100,timestamp:1000},1000).status,'weak');
assert.equal(verifier.evaluate({lat:35,lng:129,accuracyM:20,timestamp:2000},2000).status,'verifying');
assert.equal(verifier.evaluate({lat:35,lng:129,accuracyM:20,timestamp:12000},12000).status,'verifying');
const verified=verifier.evaluate({lat:35,lng:129,accuracyM:20,timestamp:23000},23000);
assert.equal(verified.status,'verified');
assert.equal(verified.verified,true);

const questStorage=new FakeStorage();
now=new Date(2026,9,2,12,0,0);
const quests=createQuestService(questStorage,()=>new Date(now));
const quest=QUESTS[0];
let completion=quests.completeQuest(quest,quest.checkpoints.map(cp=>cp.id),now);
assert.equal(completion.created,true);
assert.equal(completion.stats.xp,quest.xp);
assert.equal(completion.newTitles[0].id,'first-step');
assert.equal(quests.getStats().equippedTitleInfo.name,'첫 발걸음');
completion=quests.completeQuest(quest,quest.checkpoints.map(cp=>cp.id),now);
assert.equal(completion.created,false,'same quest/day must not duplicate XP');
assert.equal(quests.equipTitle('first-step'),true);

const sessionStorage=new FakeStorage();
const sessionQuestStorage=new FakeStorage();
let ms=1000;
let gpsWatching=false,stopCount=0,handlers=null;
const sessionGps={
  support:()=>({ok:true,error:null}),
  permissionState:async()=> 'granted',
  watch({onPosition,onError}){handlers={onPosition,onError};gpsWatching=true;return 9},
  stop(){const was=gpsWatching;gpsWatching=false;if(was)stopCount++;return was},
  isWatching:()=>gpsWatching
};
const sessionProgress=createQuestService(sessionQuestStorage,()=>new Date(now));
const session=createQuestSessionService({
  storage:sessionStorage,
  gps:sessionGps,
  consent,
  progress:sessionProgress,
  clock:()=>new Date(now),
  receivedNow:()=>ms
});
await session.begin(quest.id);
assert.equal(session.getSnapshot().session.questId,quest.id);
assert.equal(session.getSnapshot().isWatching,true);
handlers.onPosition({lat:quest.checkpoints[0].lat,lng:quest.checkpoints[0].lng,accuracyM:15,timestamp:ms});
assert.ok(!sessionStorage.getItem('tq_quest_session_v1').includes('"lat"'),'raw GPS coordinates must not be persisted');
ms=11000;now=new Date(now.getTime()+10000);handlers.onPosition({lat:quest.checkpoints[0].lat,lng:quest.checkpoints[0].lng,accuracyM:15,timestamp:ms});
ms=22000;now=new Date(now.getTime()+11000);handlers.onPosition({lat:quest.checkpoints[0].lat,lng:quest.checkpoints[0].lng,accuracyM:15,timestamp:ms});
assert.equal(session.getSnapshot().session.checkpointIndex,1);

for(let index=1;index<quest.checkpoints.length;index++){
  const cp=quest.checkpoints[index];
  ms+=1000;now=new Date(now.getTime()+1000);handlers.onPosition({lat:cp.lat,lng:cp.lng,accuracyM:15,timestamp:ms});
  ms+=10000;now=new Date(now.getTime()+10000);handlers.onPosition({lat:cp.lat,lng:cp.lng,accuracyM:15,timestamp:ms});
  ms+=11000;now=new Date(now.getTime()+11000);handlers.onPosition({lat:cp.lat,lng:cp.lng,accuracyM:15,timestamp:ms});
}
assert.equal(session.getSnapshot().session,null,'completed quest session must be cleared');
assert.equal(sessionProgress.getStats().completedCount,1);
assert.ok(stopCount>=1,'GPS watch must stop after quest completion');

await session.begin(quest.id);
assert.equal(session.getSnapshot().isWatching,true);
session.cancel();
assert.equal(session.getSnapshot().session,null);
assert.equal(session.getSnapshot().isWatching,false);

const deniedGps={...sessionGps,permissionState:async()=> 'denied'};
const deniedSession=createQuestSessionService({storage:new FakeStorage(),gps:deniedGps,consent,progress:sessionProgress});
await assert.rejects(()=>deniedSession.begin(quest.id),error=>error.type==='permission_denied');

consent.revoke();
const noConsentSession=createQuestSessionService({storage:new FakeStorage(),gps:sessionGps,consent,progress:sessionProgress});
await assert.rejects(()=>noConsentSession.begin(quest.id),error=>error.type==='consent_required');

console.log('TRIP QUEST v1.4 GPS QUEST, consent, verification, XP and title tests passed');
