import { $, esc } from '../core/dom.js';

let map=null;
let markers=[];
let routeLine=null;

export function initMap(){
  if(typeof L==='undefined'){$('#map').innerHTML='<div class="empty-state">지도를 불러오지 못했습니다.<br>인터넷 연결을 확인하세요.</div>';return}
  map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([35.8,127.8],7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,minZoom:6,detectRetina:true,updateWhenIdle:false,keepBuffer:4,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
    className:'tq-map-tiles'
  }).addTo(map);
}
function clearMarkers(){if(!map)return;markers.forEach(m=>m.remove());markers=[];if(routeLine){routeLine.remove();routeLine=null}}
function addMarker(lat,lng,label,rank){
  if(!map)return;
  const isOrigin=rank===0;
  const safe=esc(label||'장소');
  const icon=L.divIcon({className:'tq-map-marker-wrap',html:`<div class="tq-map-marker ${isOrigin?'origin':'rank'}">${isOrigin?'●':rank}</div>`,iconSize:[32,32],iconAnchor:[16,16]});
  const m=L.marker([lat,lng],{icon,zIndexOffset:isOrigin?1000:rank}).addTo(map).bindPopup(`<b>${safe}</b>`,{closeButton:false});
  m.bindTooltip(safe,{permanent:true,direction:'top',offset:[0,-16],className:`tq-map-label${isOrigin?' origin':''}`});
  markers.push(m);
}
export function drawMap(origin,recommendations=[]){
  if(!map)return;clearMarkers();const pts=[];
  if(origin){addMarker(origin.lat,origin.lng,origin.name&&origin.name!=='현재 위치'?`현재 위치 · ${origin.name}`:'현재 위치',0);pts.push([origin.lat,origin.lng])}
  recommendations.forEach((p,i)=>{addMarker(p.lat,p.lng,`${i+1}. ${p.name}`,i+1);pts.push([p.lat,p.lng])});
  if(pts.length>1)map.fitBounds(pts,{padding:[42,42],maxZoom:13});else if(pts.length===1)map.setView(pts[0],13);
  setTimeout(()=>map.invalidateSize(),80);
}
export function drawRoute(coords){if(!map)return;if(routeLine)routeLine.remove();if(coords?.length>1){routeLine=L.polyline(coords,{weight:5,opacity:.78,color:'#c9ff45'}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[38,38],maxZoom:14})}}
export function focusMapPoint(point,zoom=13){if(map&&point)map.setView([point.lat,point.lng],zoom)}
export function invalidateMainMap(){if(map)setTimeout(()=>map.invalidateSize(),0)}
