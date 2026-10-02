# Known Limitations

- Static GitHub Pages PWA; no server application
- No user login/account system
- No database or cloud persistence
- No admin dashboard
- No native App Store / Google Play release
- No verified revenue, customer contracts, MAU, retention, or conversion metrics in this repository
- No owned custom domain included in the repository
- No direct OpenAI/LLM API integration
- Natural-language behavior is a local intent parser + recommendation engine
- Public OSRM, Nominatim, OSM tile, and Open-Meteo dependencies are not equivalent to production commercial SLAs
- Open-Meteo Free API is not suitable for commercial operation under its current terms
- Fuel-price refresh is best-effort and can fall back to defaults
- Recommendation data is curated/static rather than a live nationwide commercial POI database
- Estimated toll logic is an estimate, not a toll authority quotation
- Cover-asset provenance requires seller verification before an exclusivity warranty

These are disclosure items, not hidden defects. They should be included in buyer due diligence.

## GPS QUEST / PWA limitations

- GPS can be enabled or disabled from MY > 위치 및 GPS. Turning it on is the explicit app-level action that triggers the browser/OS geolocation permission request.
- Browser/OS location permission can still be denied or permanently blocked by the user; the web app cannot override or programmatically revoke that OS-level permission.
- GPS accuracy varies by device, buildings, weather, and radio conditions. The reward-claim flow checks target radius, reported accuracy and position freshness but cannot guarantee survey-grade positioning.
- TRIP QUEST does not continuously track an armed QUEST. The user must open the active app and tap `보상받기`, which requests a fresh GPS fix and completes only when the location matches the QUEST target.
- TRIP QUEST intentionally does not verify or complete QUESTs while the PWA is inactive, backgrounded, or closed.
- No continuous live user GPS route history is persisted by the QUEST implementation.
