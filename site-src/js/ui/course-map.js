import { $, setText, esc } from '../core/dom.js';
import { COURSE_PLACE_META } from '../data/course-data.js';

let courseMap=null;
let courseMarkers=[];
let courseRouteLine=null;

export function initCourseMap(){
  if(courseMap||typeof L==='undefined')return;
  const el=$('#courseMap');if(!el)return;
  courseMap=L.map('courseMap',{zoomControl:true,attributionControl:true}).setView([35.6,128.0],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors',className:'dark-map-tiles'}).addTo(courseMap);
}
export function clearCourseMap(){
  if(!courseMap)return;
  courseMarkers.forEach(m=>m.remove());courseMarkers=[];
  if(courseRouteLine){courseRouteLine.remove();courseRouteLine=null}
}

function coursePlaceMeta(point){
  return COURSE_PLACE_META[point?.category]||{icon:'⌖',desc:'여행 장소'};
}
function addCourseMarker(point,rank){
  if(!courseMap)return;
  const meta=coursePlaceMeta(point);
  const icon=L.divIcon({
    className:'',
    html:`<div class="course-map-place-pin"><span class="pin-location">⌖</span><b>${esc(meta.icon)}</b><em>${String(rank).padStart(2,'0')}</em></div>`,
    iconSize:[42,48],iconAnchor:[21,42]
  });
  const tooltip=`<strong>${String(rank).padStart(2,'0')} · ${esc(point.name)}</strong><small>${esc(point.category||'장소')} · ${esc(meta.desc)}</small>`;
  const m=L.marker([point.lat,point.lng],{icon}).addTo(courseMap)
    .bindPopup(`<b>${esc(point.name)}</b><br>${esc(point.category||'장소')} · ${esc(meta.desc)}`)
    .bindTooltip(tooltip,{permanent:true,direction:rank%2?'right':'left',offset:[rank%2?10:-10,-5],className:'course-place-tooltip'});
  courseMarkers.push(m);
}
export function drawCourseRoute(course){
  if(!course)return;
  initCourseMap();if(!courseMap)return;clearCourseMap();
  const stops=course.stops||[];
  if(!stops.length){setText('#courseMapStatus','표시할 지역 코스가 없습니다.');return}

  stops.forEach((p,i)=>addCourseMarker(p,i+1));
  const coords=course.route?.coords?.length>1?course.route.coords:stops.map(p=>[p.lat,p.lng]);
  if(coords.length>1){
    courseRouteLine=L.polyline(coords,{weight:6,opacity:.96,color:'#c9ff45',lineCap:'round',lineJoin:'round'}).addTo(courseMap);
    courseMap.fitBounds(courseRouteLine.getBounds(),{padding:[48,48],maxZoom:15});
  }else{
    courseMap.setView([stops[0].lat,stops[0].lng],15);
  }
  setTimeout(()=>courseMap.invalidateSize(),120);
  const routeType=course.mode==='walk'?'도보 근거리':course.route?.source==='osrm'?'실제 도로 드라이브':'드라이브 · 일부 근사';
  setText('#courseMapStatus',`${course.id}코스 · ${routeType} · 지역 내 ${stops.length}개 지점`);
}
