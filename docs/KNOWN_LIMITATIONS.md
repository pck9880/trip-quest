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

- GPS QUEST requires a secure HTTPS context and explicit user consent before geolocation is requested.
- Browser/OS location permission can still be denied or permanently blocked by the user; the web app cannot override or programmatically revoke that OS-level permission.
- GPS accuracy varies by device, buildings, weather, and radio conditions. The app uses accuracy/radius/repeated-fix/dwell checks to reduce false verification but cannot guarantee survey-grade positioning.
- Static PWAs cannot guarantee continuous background geolocation, especially on iOS. TRIP QUEST pauses verification when backgrounded and requires the user to resume after returning.
- No continuous GPS route history is persisted by the QUEST implementation.
