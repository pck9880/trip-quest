import { $, setText, esc } from '../core/dom.js';

let courseMap=null;
let courseMarkers=[];
let courseRouteLine=null;

const CATEGORY_META={
  '공원':{icon:'P',desc:'공원'},
  '사찰':{icon:'寺',desc:'절 · 사찰'},
  '마트':{icon:'M',desc:'마트'},
  '문화시설':{icon:'C',desc:'문화시설'},
  '산책로':{icon:'W',desc:'산책로'},
  '백화점':{icon:'D',desc:'백화점'},
  '카페':{icon:'C',desc:'카페'},
  '맛집':{icon:'F',desc:'음식점'},
  '관광명소':{icon:'★',desc:'관광명소'},
  '박물관미술관':{icon:'A',desc:'박물관 · 미술관'},
  '전통시장':{icon:'市',desc:'전통시장'},
  '쇼핑몰':{icon:'S',desc:'쇼핑몰'},
  '해변':{icon:'海',desc:'해변'},
  '산':{icon:'山',desc:'산'},
  '도서관':{icon:'B',desc:'도서관'},
  '숙박':{icon:'H',desc:'숙박'},
  '체험':{icon:'E',desc:'체험'},
  '테마파크':{icon:'T',desc:'테마파크'},
  '온천':{icon:'♨',desc:'온천 · 스파'},
  '캠핑':{icon:'△',desc:'캠핑'}
};

export function initCourseMap(){
  if(courseMap||typeof L==='undefined')return;
  const el=$('#courseMap');if(!el)return;
  courseMap=L.map('courseMap',{zoomControl:true,attributionControl:true}).setView([35.6,128.0],8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',className:'dark-map-tiles'}).addTo(courseMap);
}
export function clearCourseMap(){
  if(!courseMap)return;
  courseMarkers.forEach(m=>m.remove());courseMarkers=[];
  if(courseRouteLine){courseRouteLine.remove();courseRouteLine=null}
}
function coursePlaceMeta(point){
  return CATEGORY_META[point?.category]||{icon:'⌖',desc:point?.category||'여행 장소'};
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
  const routeType=course.mode==='walk'?'도보 근거리':course.route?.source==='osrm'?'OSRM 도로 드라이브':'드라이브 · 일부 근사';
  setText('#courseMapStatus',`${course.id}코스 · ${routeType} · 지역 내 ${stops.length}개 지점`);
}
