import assert from 'node:assert/strict';
import { buildCourseKeep, createKeepService } from '../site-src/js/services/keep-service.js';

class FakeStorage{
  constructor(){this.data=new Map()}
  getItem(key){return this.data.has(key)?this.data.get(key):null}
  setItem(key,value){this.data.set(key,String(value))}
  removeItem(key){this.data.delete(key)}
}

const storage=new FakeStorage();
const service=createKeepService(storage);
const destination={name:'부산 서면',category:'번화가',lat:35.15,lng:129.06};
const course={
  id:'A',
  title:'WALK · 도보 근거리',
  mode:'walk',
  stops:[{name:'서면 번화가'},{name:'전포카페거리'},{name:'삼정타워'}],
  route:{distanceKm:2.8,timeMin:38,source:'walk-estimate'},
  estimatedCost:{total:0}
};

const item=buildCourseKeep(destination,course);
assert.ok(item.id.startsWith('course-'));
assert.equal(item.destination.name,'부산 서면');
assert.equal(item.course.stops.length,3);
assert.equal(service.count(),0);

let result=service.toggle(item);
assert.equal(result.saved,true);
assert.equal(service.count(),1);
assert.equal(service.has(item.id),true);

const restored=createKeepService(storage);
assert.equal(restored.count(),1);
assert.equal(restored.get(item.id).course.route.distanceKm,2.8);

restored.save({...item,course:{...item.course,title:'업데이트된 코스'}});
assert.equal(restored.count(),1,'same course must not duplicate');

result=restored.toggle(item);
assert.equal(result.saved,false);
assert.equal(restored.count(),0);
assert.equal(restored.has(item.id),false);

console.log('TRIP QUEST v1.1 KEEP persistence/toggle tests passed');
