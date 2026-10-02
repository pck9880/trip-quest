import assert from 'node:assert/strict';
import { createProfileService } from '../site-src/js/services/profile-service.js';
import { createAttendanceService } from '../site-src/js/services/attendance-service.js';
import { buildTravelHistoryItem, createHistoryService } from '../site-src/js/services/history-service.js';

class FakeStorage{
  constructor(){this.data=new Map()}
  getItem(key){return this.data.has(key)?this.data.get(key):null}
  setItem(key,value){this.data.set(key,String(value))}
  removeItem(key){this.data.delete(key)}
}

const profileStorage=new FakeStorage();
const random=()=>new Uint8Array([0,1,2,3,4,5]);
const profiles=createProfileService(profileStorage,random);
const first=profiles.get();
assert.match(first.temporaryId,/^TQ-[A-Z2-9]{6}$/);
assert.equal(first.temporaryId,'TQ-ABCDEF');
assert.equal(first.nickname,'여행자');
const updated=profiles.update({nickname:'부산 여행자'});
assert.equal(updated.nickname,'부산 여행자');
assert.equal(updated.temporaryId,first.temporaryId,'temporary ID must remain stable');

const attendanceStorage=new FakeStorage();
let now=new Date(2026,9,2,10,0,0);
const attendance=createAttendanceService(attendanceStorage,()=>new Date(now));
assert.equal(attendance.checkedToday(),false);
assert.equal(attendance.checkIn().newCheckIn,true);
assert.equal(attendance.checkIn().newCheckIn,false,'same-day attendance must not duplicate');
now=new Date(2026,9,3,9,0,0);
assert.equal(attendance.checkIn().streak,2);
assert.equal(attendance.monthCount(),2);

const historyStorage=new FakeStorage();
const history=createHistoryService(historyStorage);
const destination={name:'전포카페거리',category:'카페거리',lat:35.15,lng:129.06};
const course={id:'A',title:'WALK',mode:'walk',stops:[{name:'전포카페거리'},{name:'삼정타워'}],route:{distanceKm:2.1,timeMin:32},estimatedCost:{total:0}};
const item=buildTravelHistoryItem(destination,course,new Date(2026,9,2,18,0,0));
assert.equal(item.destination.name,'전포카페거리');
let completed=history.complete(destination,course,new Date(2026,9,2,18,0,0));
assert.equal(completed.created,true);
completed=history.complete(destination,course,new Date(2026,9,2,21,0,0));
assert.equal(completed.created,false,'same course/day must not duplicate');
assert.equal(history.count(),1);
assert.equal(history.uniquePlaceCount(),1);
history.complete({name:'황리단길'},course,new Date(2026,9,3,18,0,0));
assert.equal(history.uniquePlaceCount(),2);

console.log('TRIP QUEST v1.2 profile, attendance, and travel-history tests passed');
