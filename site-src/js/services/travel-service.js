import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { clientWeather, selectWeatherAt } from './weather.js';
import { localGeocode } from './geocoding.js';
import { localRecommend } from '../domain/recommendation.js';
import { refineRoadDistanceResults } from '../usecases/search-destinations.js';
import { localAI } from '../domain/intent-parser.js';
import { coursePack } from '../domain/course-planner.js';
import { createPlaceSearchService } from './place-search-service.js';

export function createTravelService(){
  const placeSearchService=createPlaceSearchService();

  async function getConfig(){
    return {
      providers:{kakao:false,tmap:false,openai:false,weather:true,placeSearch:'osm-fallback',secureProxy:false},
      defaultGasPrice:1858,
      fuelEconomyKmL:11,
      publicBaseUrl:''
    };
  }

  async function geocode(query){
    return {items:await localGeocode(query||'')};
  }

  async function searchRegion(query){
    return {items:await placeSearchService.resolveRegion(query||''),source:'OpenStreetMap / Nominatim'};
  }

  async function searchPlaces(body={}){
    return placeSearchService.searchPlaces(body);
  }

  async function bootstrap(origin){
    const weather=await clientWeather(origin.lat,origin.lng);
    return {
      weather,
      traffic:{label:'경로 선택 후 계산',avgSpeed:0,source:'정적 배포판'},
      updatedAt:new Date().toISOString()
    };
  }

  async function recommend(criteria){
    const base=localRecommend(criteria);
    const items=await refineRoadDistanceResults(base,criteria);
    return {
      items,
      source:items.some(x=>x.roadVerified)?'도로 경로 + 내장 장소 데이터':'근사 경로 + 내장 장소 데이터'
    };
  }

  async function tripSummary(body){
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

    return {
      outbound,
      inbound,
      total:{
        distanceKm,
        drivingMin,
        toll,
        tripCost:energyCost+toll,
        fuelLiters:energyAmount,
        fuelCost:energyCost,
        energyAmount,
        energyCost,
        energyUnit:vehicle.energyUnit,
        energyPrice:vehicle.energyPrice,
        vehicleLabel:vehicle.vehicleLabel,
        fuelLabel:vehicle.fuelLabel,
        efficiency:vehicle.efficiency,
        efficiencyUnit:vehicle.efficiencyUnit,
        energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',
        costLabel:vehicle.fuel==='electric'?'충전비':'연료비'
      },
      fuelEconomyKmL:vehicle.efficiency
    };
  }

  async function courses(body){
    const weatherPack=await clientWeather(body.destination.lat,body.destination.lng);
    const weather=selectWeatherAt(weatherPack,body.departure);
    return {
      weather,
      courses:await coursePack(body,weather),
      provider:{ai:false,road:'osrm-or-fallback',kakao:false}
    };
  }

  async function aiSearch(message,context={}){
    const result=localAI(message||'',context);
    if(result.intent==='travel_search'&&context.origin){
      const merged={
        ...context,
        ...result.patch,
        focusQuery:result.focusQuery,
        semanticProfile:result.semanticProfile
      };
      result.items=await refineRoadDistanceResults(localRecommend(merged),merged);
    }
    return result;
  }

  return {getConfig,geocode,searchRegion,searchPlaces,bootstrap,recommend,tripSummary,courses,aiSearch};
}
