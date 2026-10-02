export const DIR_DEG={북:0,'북동':45,동:90,'남동':135,남:180,'남서':225,서:270,'북서':315};

const rad=d=>d*Math.PI/180;

export function geoKm(a,b){const R=6371,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x))}

export function geoBearing(a,b){const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lng-a.lng),y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360}

export function degDiff(a,b){return Math.abs(((a-b+540)%360)-180)}
