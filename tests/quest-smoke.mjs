import assert from 'node:assert/strict';
import { buildCourseQuest } from '../site-src/js/domain/course-quest.js';
import { createLocationConsentService } from '../site-src/js/services/location-consent-service.js';
import { createGpsService, normalizeGpsError } from '../site-src/js/services/gps-service.js';
import { createQuestService } from '../site-src/js/services/quest-service.js';
import { createQuestSessionService } from '../site-src/js/services/quest-session-service.js';

class FakeStorage{
  constructor(){this.data=new Map()}
  getItem(key){return this.data.has(key)?this.data.get(key):null}
  setItem(key,value){this.data.set(key,String(value))}
  removeItem(key){this.data.delete(key)}
}

const destination={name:'부산 전포카페거리',category:'카페거리',lat:35.1555,lng:129.0644};
const course={id:'A',title:'WALK',mode:'walk',stops:[
  {name:'서면 젊음의거리',category:'번화가',lat:35.1578,lng:129.0595},
  {name:'전포카페거리',category:'카페거리',lat:35.1555,lng:129.0644},
  {name:'삼정타워',category:'쇼핑거리',lat:35.1528,lng:129.0592}
]};
const courseQuest=buildCourseQuest(destination,course);
assert.equal(courseQuest.type,'course-quest');
assert.equal(courseQuest.course.id,'A');
assert.equal(courseQuest.routeStops.length,3);
assert.equal(courseQuest.checkpoints.length,1,'course QUEST should verify final destination only');
assert.equal(courseQuest.checkpoints[0].name,'삼정타워');
assert.equal(courseQuest.rewardStatus,'pending');
assert.equal(courseQuest.xp,0);

let now=new Date(2026,9,2,10,0,0);
const consentStorage=new FakeStorage();
const consent=createLocationConsentService(consentStorage,()=>new Date(now));
assert.equal(consent.isEnabled(),false);
assert.equal(consent.enable().enabled,true);
assert.equal(consent.isAgreed(),true);
assert.equal(consent.disable().enabled,false);
assert.equal(consent.status().agreed,true,'GPS OFF should not erase prior app-level acknowledgement');
consent.enable();

assert.equal(normalizeGpsError({code:1}).type,'permission_denied');
assert.equal(normalizeGpsError({code:2}).type,'position_unavailable');
assert.equal(normalizeGpsError({code:3}).type,'timeout');

let clearedId=null;
const fakeNavigator={
  permissions:{query:async()=>({state:'granted'})},
  geolocation:{
    getCurrentPosition(success){success({coords:{latitude:35,longitude:129,accuracy:15},timestamp:1000})},
    watchPosition(){return 77},
    clearWatch(id){clearedId=id}
  }
};
const gps=createGpsService({navigatorRef:fakeNavigator,windowRef:{isSecureContext:true,location:{hostname:'example.com'}},now:()=>1000});
assert.equal(gps.support().ok,true);
assert.equal(await gps.permissionState(),'granted');
assert.equal((await gps.current()).accuracyM,15);
gps.watch({onPosition:()=>{},onError:()=>{}});
assert.equal(gps.stop(),true);
assert.equal(clearedId,77);
const insecureGps=createGpsService({navigatorRef:fakeNavigator,windowRef:{isSecureContext:false,location:{hostname:'example.com'}}});
assert.equal(insecureGps.support().error.type,'insecure');

const questStorage=new FakeStorage();
const quests=createQuestService(questStorage,()=>new Date(now));
const rewardPending=quests.completeQuest(courseQuest,['arrival'],now);
assert.equal(rewardPending.created,true);
assert.equal(rewardPending.earnedXp,0,'course QUEST reward is intentionally pending');
assert.equal(rewardPending.newTitles.length,0,'pending reward must not unlock titles');
assert.equal(quests.getStats().xp,0);

const sessionStorage=new FakeStorage();
const sessionProgress=createQuestService(new FakeStorage(),()=>new Date(now));
let ms=1000;
let active=true;
let currentPosition={lat:35.123456,lng:129.123456,accuracyM:18,timestamp:ms};
let stopCount=0;
const sessionGps={
  support:()=>({ok:true,error:null}),
  permissionState:async()=> 'granted',
  async current(){return {...currentPosition}},
  watch(){throw new Error('reward claim must not start continuous GPS watch')},
  stop(){stopCount++;return true},
  isWatching:()=>false
};
const session=createQuestSessionService({
  storage:sessionStorage,gps:sessionGps,consent,progress:sessionProgress,
  clock:()=>new Date(now),receivedNow:()=>ms,isActive:()=>active
});

session.armCourseQuest(courseQuest);
assert.equal(session.getSnapshot().session.status,'armed');
assert.equal(session.getSnapshot().quest.course.id,'A');
assert.equal(session.getSnapshot().isWatching,false,'armed course must not continuously watch GPS');

// Wrong location: reward is denied and raw user coordinates are never persisted.
let claim=await session.claimReward();
assert.equal(claim.ok,false);
assert.equal(claim.reason,'outside');
assert.ok(claim.result.distanceM>0);
const stored=sessionStorage.getItem('tq_quest_session_v1');
assert.ok(!stored.includes('35.123456'),'live user latitude must not be persisted');
assert.ok(!stored.includes('129.123456'),'live user longitude must not be persisted');
assert.ok(session.getSnapshot().session,'wrong location must keep QUEST armed');

// Weak GPS also cannot complete.
currentPosition={lat:courseQuest.checkpoints[0].lat,lng:courseQuest.checkpoints[0].lng,accuracyM:150,timestamp:ms};
claim=await session.claimReward();
assert.equal(claim.ok,false);
assert.equal(claim.reason,'weak');

// Background/inactive app cannot claim.
active=false;
await assert.rejects(()=>session.claimReward(),error=>error.type==='inactive');
assert.ok(session.getSnapshot().session,'inactive claim must keep QUEST pending');

// Correct foreground GPS position completes with one on-demand position check.
active=true;
ms+=1000;now=new Date(now.getTime()+1000);
currentPosition={lat:courseQuest.checkpoints[0].lat,lng:courseQuest.checkpoints[0].lng,accuracyM:15,timestamp:ms};
claim=await session.claimReward();
assert.equal(claim.ok,true);
assert.equal(session.getSnapshot().session,null,'successful reward claim must clear QUEST session');
assert.equal(sessionProgress.getStats().completedCount,1);
assert.equal(sessionProgress.getStats().xp,0,'completion record should not grant reward yet');
assert.ok(stopCount>=1,'claim flow should stop any stale GPS watch');

session.armCourseQuest(courseQuest);
session.cancel();
assert.equal(session.getSnapshot().session,null);

const deniedGps={...sessionGps,permissionState:async()=> 'denied'};
const deniedSession=createQuestSessionService({storage:new FakeStorage(),gps:deniedGps,consent,progress:sessionProgress});
deniedSession.armCourseQuest(courseQuest);
await assert.rejects(()=>deniedSession.claimReward(),error=>error.type==='permission_denied');

consent.disable();
const gpsOffSession=createQuestSessionService({storage:new FakeStorage(),gps:sessionGps,consent,progress:sessionProgress});
gpsOffSession.armCourseQuest(courseQuest);
await assert.rejects(()=>gpsOffSession.claimReward(),error=>error.type==='gps_disabled');

console.log('TRIP QUEST v1.5.1 on-demand GPS reward claim tests passed');

