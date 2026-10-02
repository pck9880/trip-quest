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

## GPS QUEST data

The active QUEST is generated from the user's selected A/B course by `site-src/js/domain/course-quest.js`. The route stops are shown as QUEST context, while the final course stop is the GPS completion point.

Public course/checkpoint coordinates may be persisted so an armed QUEST can survive a page reload. Live user latitude/longitude values are processed only in memory and are not written to the session. Successful verification stores the checkpoint ID, verification time, and reported GPS accuracy.

QUEST completion history remains in `tq_quest_progress_v1`. Rewards are currently pending: course-linked completions award 0 XP and do not unlock titles. Location/GPS enablement is device-specific and is not transferred by backup/restore.
