# Travel Data

## Destinations

`site-src/js/data/places.js` contains the local travel dataset.

Each normalized place contains fields such as:

```text
id
name
category
lat
lng
address
url
source
routeGroup
urbanScore
```

Hotspot metadata from `recommendation-data.js` is merged when the place dataset is created.

## Recommendation metadata

`recommendation-data.js` contains:

- popularity hints
- urban categories
- hotspot/route-group metadata

Young/high-footfall commercial districts such as Seomyeon, Jeonpo, Hongdae, Seongsu, Hwangridan-gil, and Dongseong-ro are modeled as urban recommendation data rather than generic tourist POIs.

## Course data

`course-data.js` defines linked course groups.

Course intent is sequential and geographically coherent:

- walking A course: nearby connected stops
- driving B course: wider city/region sequence

Avoid adding random POIs only because they share a city name.

## Recommendation rules

`intent-rules.js` maps Korean natural-language expressions to structured travel preferences. `recommendation.js` applies filters and scoring.

## Vehicle/cost assumptions

Vehicle settings are user-adjustable. The default compact-car profile uses Casper/11 km/L behavior.

Toll values are estimates. UI wording must remain **예상 통행료** rather than claiming an actual toll charge.

## Editing guidance

When adding destinations:

1. use stable names
2. verify latitude/longitude
3. assign one primary category
4. add hotspot metadata only when justified
5. connect course stops intentionally
6. run `npm test`
