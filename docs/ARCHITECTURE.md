# Architecture

## Dependency direction

```text
data / core
    ↓
domain
    ↓
services
    ↓
usecases
    ↓
controllers
    ↓
ui
    ↓
app.js composition
```

The Store is shared application state. UI-specific Leaflet instances stay encapsulated in map modules rather than Store state.

## Main modules

### data

- `places.js` — local destination dataset
- `recommendation-data.js` — popularity and hotspot metadata
- `course-data.js` — linked curated course definitions
- `intent-rules.js` — natural-language rule data
- `ui-options.js` — UI labels/options

### domain

- `recommendation.js` — ranking/filtering
- `intent-parser.js` — travel intent parsing
- `course-planner.js` — A/B course construction
- `geo.js` — geographic calculations
- `schedule.js` — time-window calculations
- `trip-cost.js` — estimated toll logic

### services

- `routing.js` — OSRM + approximation fallback
- `weather.js` — Open-Meteo
- `geocoding.js` — Nominatim
- `vehicle-settings.js` — local vehicle settings
- `travel-service.js` — named application service facade

### store

`trip-store.js` owns navigation, origin, search, selection, and runtime state. A compatibility Proxy preserves simple `state.field` access while the underlying ownership is sectioned.

### controllers / ui

Controllers orchestrate user flows. UI modules render state and bind view-specific behavior.

## Search flow

```text
origin
 → distance/category/direction/time
 → intent parser (optional natural-language query)
 → recommendation engine
 → road-distance refinement
 → result ranking
 → destination selection
 → trip summary + A/B courses
 → map / estimated cost
```

## Security boundary

No private API keys belong in `site-src/`. Any future LLM, payment, private routing, or authenticated API must be introduced behind a server-side proxy/backend.
