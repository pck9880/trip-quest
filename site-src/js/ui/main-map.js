import { $, esc } from '../core/dom.js';

let map=null;
let markers=[];
let routeLine=null;

export function initMap(){
  if(typeof L==='undefined'){$('#map').innerHTML='<div class="empty-state">지도를 불러오지 못했습니다.<br>인터넷 연결을 확인하세요.</div>';return}
  map=L.map('map',{zoomControl:true}).setView([35.6,128.0],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors',className:'dark-map-tiles'}).addTo(map);
}
function clearMarkers(){if(!map)return;markers.forEach(m=>m.remove());markers=[];if(routeLine){routeLine.remove();routeLine=null}}
function addMarker(lat,lng,label,rank){if(!map)return;const isOrigin=rank===0;const icon=L.divIcon({className:'',html:`<div style="background:${isOrigin?'#c9ff45':'#f4f7fa'};color:#10150b;border:2px solid #0b1016;width:${isOrigin?19:28}px;height:${isOrigin?19:28}px;border-radius:50%;display:grid;place-items:center;font:bold 11px system-ui;box-shadow:0 3px 12px #0008">${isOrigin?'':rank}</div>`,iconSize:[28,28],iconAnchor:[14,14]});const m=L.marker([lat,lng],{icon}).addTo(map).bindPopup(esc(label));markers.push(m)}
export function drawMap(origin,recommendations=[]){if(!map)return;clearMarkers();const pts=[];if(origin){addMarker(origin.lat,origin.lng,'출발지',0);pts.push([origin.lat,origin.lng])}recommendations.forEach((p,i)=>{addMarker(p.lat,p.lng,`${i+1}. ${p.name}`,i+1);pts.push([p.lat,p.lng])});if(pts.length>1)map.fitBounds(pts,{padding:[28,28]});else if(pts.length===1)map.setView(pts[0],10);setTimeout(()=>map.invalidateSize(),80)}
export function drawRoute(coords){if(!map)return;if(routeLine)routeLine.remove();if(coords?.length>1){routeLine=L.polyline(coords,{weight:5,opacity:.78,color:'#c9ff45'}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[28,28]})}}

export function focusMapPoint(point,zoom=13){if(map&&point)map.setView([point.lat,point.lng],zoom)}
export function invalidateMainMap(){if(map)setTimeout(()=>map.invalidateSize(),0)}
