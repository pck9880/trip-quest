# Commercial Readiness

The codebase is sale-ready as an MVP/source asset. **Commercial operation** still requires provider and business infrastructure decisions.

## Before monetization

| Item | Status | Required action |
|---|---|---|
| Project code structure | Ready | Continue normal PR/test workflow |
| GitHub Pages demo | Ready for demo | Keep or move to buyer-owned hosting/domain |
| Leaflet | Ready with license notice | Preserve third-party notice |
| OSM attribution | Implemented | Keep visible attribution |
| OSM public tiles | Demo/low-scale dependency | Use compliant commercial tile provider or self-host for scale/SLA |
| Nominatim public geocoder | Moderate user-triggered use only | Add caching/provider abstraction or commercial/self-hosted geocoder before scale |
| OSRM public demo | Prototype/demo dependency | Replace with managed/self-hosted routing for paid production |
| Open-Meteo Free API | **Not commercial-ready** | Move to an Open-Meteo commercial plan or another commercially licensed weather provider |
| Opinet HTML parse | Best-effort only | Verify rights/terms and replace with official licensed feed if required |
| Backend/auth/database | Not included | Add if business model needs accounts/saved trips/admin |
| Payments | Not included | Add only through secure backend/provider |
| OpenAI/LLM API | Not included | If added, keep credentials server-side |
| Custom domain | Not included | Buyer should attach a transferable domain |
| App Store / Google Play | Not included | Package separately if native distribution is required |

Provider replacement is relatively contained because external calls already live under `js/services/` and `travel-service.js`.
