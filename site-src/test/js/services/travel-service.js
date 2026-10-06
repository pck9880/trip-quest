import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { clientWeather, selectWeatherAt } from './weather.js';
import { coursePack } from '../domain/course-planner.js';
import { searchRegionPlaces, searchNearbyPlaces } from './live-place-search.js';

export function createTravelService(){
  async function getConfig(){
    return {
      providers:{openai:false,livePlaces:true,weather:true},
      defaultGasPrice:1858,
      fuelEconomyKmL:11,
      publicBaseUrl:''
    };
  }
  async function selectionSearch(criteria){
    const result=await searchRegionPlaces({
      boundary:criteria.regionBoundary,
      categories:criteria.categories||[],
      facilities:criteria.facilities||[]
    });
    return {items:result.items,source:result.source};
  }
  async function tripSummary(body){
    if(!body.origin)throw new Error('출발 위치가 필요합니다.');
    const [outbound,inbound]=await Promise.all([
      roadRoute(body.origin,body.destination),
      roadRoute(body.destination,body.origin)
    ]);
    const distanceKm=outbound.distanceKm+inbound.distanceKm;
    const drivingMin=outbound.timeMin+inbound.timeMin;
    const vehicle=activeVehicleProfile(body);
    const energyAmount=distanceKm/vehicle.efficiency;
    const energyCost=Math.round(energyAmount*vehicle.energyPrice);
    const toll=estimateRoundTripToll(distanceKm,vehicle.tollDiscount);
    return {outbound,inbound,total:{
      distanceKm,drivingMin,toll,tripCost:energyCost+toll,
      fuelLiters:energyAmount,fuelCost:energyCost,energyAmount,energyCost,
      energyUnit:vehicle.energyUnit,energyPrice:vehicle.energyPrice,
      vehicleLabel:vehicle.vehicleLabel,fuelLabel:vehicle.fuelLabel,
      efficiency:vehicle.efficiency,efficiencyUnit:vehicle.efficiencyUnit,
      energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',
      costLabel:vehicle.fuel==='electric'?'충전비':'연료비'
    },fuelEconomyKmL:vehicle.efficiency};
  }
  async function courses(body){
    const weatherPack=await clientWeather(body.destination.lat,body.destination.lng);
    const weather=selectWeatherAt(weatherPack,body.departure);
    const nearby=await searchNearbyPlaces(body.destination,5000);
    return {
      weather,
      courses:await coursePack({...body,nearby},weather),
      provider:{ai:false,places:'OpenStreetMap/Overpass',road:'osrm-or-fallback'}
    };
  }
  return {getConfig,selectionSearch,tripSummary,courses};
}
