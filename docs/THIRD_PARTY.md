# Third-Party Software, Data and Services

Reviewed: 2026-10-02. Terms can change; the buyer must re-check provider terms at transfer and before commercial launch.

| Dependency | Current use | Key condition / risk | Reference |
|---|---|---|---|
| Leaflet 1.9.4 | Browser map UI via unpkg | BSD 2-Clause software license | https://github.com/Leaflet/Leaflet/blob/main/LICENSE |
| OpenStreetMap data | Map data / attribution | ODbL; attribution required | https://www.openstreetmap.org/copyright |
| OpenStreetMap standard tiles | `tile.openstreetmap.org` | Best-effort public service, no SLA; usage/caching policy applies | https://operations.osmfoundation.org/policies/tiles/ |
| Nominatim public service | User-triggered origin search | Max 1 request/sec, attribution, no autocomplete; public service is not a scale-grade commercial SLA | https://operations.osmfoundation.org/policies/nominatim/ |
| Project OSRM demo server | Driving routes | Best-effort demo service; access may be withdrawn; selling access to the demo server is prohibited | https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy |
| Open-Meteo Free API | Weather | Free endpoint is for non-commercial use; commercial operation requires an appropriate paid plan. Data attribution is required | https://open-meteo.com/en/terms |
| Opinet web page | Best-effort build-time fuel-price refresh | Current workflow parses public HTML and has no contracted data-feed guarantee; verify terms or replace with an official licensed feed for commercial operation | https://www.opinet.co.kr/ |
| Naver Map web search | User-facing links for nearby café/food search | Link-out only; no private Naver API integration in this codebase | https://map.naver.com/ |

## Current implementation notes

- OSM attribution is rendered by both Leaflet maps.
- Weather UI identifies Open-Meteo.
- Origin search identifies OpenStreetMap/Nominatim.
- Route summary identifies OSRM when OSRM provides the route.
- No OpenAI API key or direct OpenAI API integration exists in v1.0.0.
- Kakao/TMAP providers are not active private API integrations in this baseline.

The transfer agreement should not imply that third-party service access, SLAs, trademarks, or paid API rights are being sold with the source code.
