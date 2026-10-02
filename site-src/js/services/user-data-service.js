import { profileService, getProfileAvatar, saveProfileAvatar, removeProfileAvatar } from './profile-service.js';
import { attendanceService } from './attendance-service.js';
import { historyService } from './history-service.js';
import { keepService } from './keep-service.js';
import { questService } from './quest-service.js';
import { questSessionService } from './quest-session-service.js';
import { locationConsentService } from './location-consent-service.js';
import { VEHICLE_SETTINGS_KEY } from './vehicle-settings.js';

const BACKUP_FORMAT='trip-quest-user-backup';
const BACKUP_VERSION=2;
function readVehicle(){try{return JSON.parse(localStorage.getItem(VEHICLE_SETTINGS_KEY)||'null')}catch{return null}}
function writeVehicle(value){try{if(value)localStorage.setItem(VEHICLE_SETTINGS_KEY,JSON.stringify(value));else localStorage.removeItem(VEHICLE_SETTINGS_KEY)}catch{}}
function blobToDataUrl(blob){if(!blob)return Promise.resolve(null);return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('프로필 이미지를 백업하지 못했습니다.'));reader.readAsDataURL(blob)})}
function dataUrlToBlob(dataUrl){if(!dataUrl||!String(dataUrl).startsWith('data:'))return null;const [head,body]=String(dataUrl).split(','),mime=(head.match(/data:([^;]+)/)||[])[1]||'image/webp',binary=atob(body||''),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime})}

export async function exportUserData(){return {format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:new Date().toISOString(),profile:profileService.exportData(),avatar:await blobToDataUrl(await getProfileAvatar()),attendance:attendanceService.exportData(),history:historyService.exportData(),keeps:keepService.exportData(),quests:questService.exportData(),vehicleSettings:readVehicle()}}
export async function importUserData(payload={}){
  if(payload?.format!==BACKUP_FORMAT||![1,BACKUP_VERSION].includes(Number(payload?.version)))throw new Error('TRIP QUEST 백업 파일이 아닙니다.');
  profileService.importData(payload.profile||{});attendanceService.importData(payload.attendance||[]);historyService.importData(payload.history||[]);keepService.importData(payload.keeps||[]);questService.importData(payload.quests||{});questSessionService.cancel();writeVehicle(payload.vehicleSettings||null);
  if(payload.avatar){const blob=dataUrlToBlob(payload.avatar);if(blob)await saveProfileAvatar(blob)}else await removeProfileAvatar();
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:user-data-restored'));return true;
}
export async function resetUserData(){profileService.clear();attendanceService.clear();historyService.clear();keepService.clear();questService.clear();questSessionService.cancel();locationConsentService.revoke();writeVehicle(null);await removeProfileAvatar();if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:user-data-reset'));return true}
export const userDataService={exportData:exportUserData,importData:importUserData,reset:resetUserData,format:BACKUP_FORMAT,version:BACKUP_VERSION};
