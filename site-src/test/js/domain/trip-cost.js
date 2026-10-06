export function estimateRoundTripToll(distanceKm,tollDiscount=false){
  const oneWay=Math.max(0,Number(distanceKm)||0)/2;
  if(oneWay<40)return 0;
  const estimate=(900+oneWay*44.3)*2*(tollDiscount?.5:1);
  return Math.max(0,Math.round(estimate/100)*100);
}
