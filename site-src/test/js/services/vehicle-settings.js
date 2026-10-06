export const VEHICLE_SETTINGS_KEY='tq_vehicle_settings_v1';
export const FUEL_NAMES={gasoline:'휘발유',diesel:'경유',lpg:'LPG',electric:'전기'};
export function readVehicleSettings(){
  if(typeof localStorage==='undefined')return null;
  try{return JSON.parse(localStorage.getItem(VEHICLE_SETTINGS_KEY)||'null')}catch{return null}
}
export function activeVehicleProfile(body={}){
  const saved=readVehicleSettings();
  const fuel=saved?.fuel||'gasoline';
  const efficiency=Math.max(.1,Number(saved?.efficiency)||11);
  const fallbackPrice={gasoline:1858,diesel:1844,lpg:1139,electric:347}[fuel]||1858;
  const bodyPrice=Number(body.gasPrice);
  const energyPrice=fuel==='electric'
    ?Math.max(1,Number(saved?.energyPrice)||fallbackPrice)
    :(Number.isFinite(bodyPrice)&&bodyPrice>0?bodyPrice:Math.max(1,Number(saved?.energyPrice)||fallbackPrice));
  return {
    vehicleLabel:saved?.vehicleLabel||'캐스퍼',
    fuel,
    fuelLabel:FUEL_NAMES[fuel]||'연료',
    efficiency,
    energyPrice,
    tollDiscount:!!saved?.tollDiscount,
    energyUnit:fuel==='electric'?'kWh':'L',
    efficiencyUnit:fuel==='electric'?'km/kWh':'km/L'
  };
}
