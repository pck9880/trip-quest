# Buyer Overview

## What is included

TRIP QUEST v1.0.0 is a working static travel-discovery PWA with:

- current-location/manual-origin flow
- 0–400 km dual-range distance selection
- category/direction/time filters
- local natural-language intent parsing
- domestic destination recommendation logic
- curated linked A/B courses
- OSM map rendering and OSRM route fallback
- vehicle energy cost and estimated toll calculation
- PWA install/share flow
- GitHub Pages deployment automation
- tests and transfer documentation

## Technical shape

The app uses browser-native ES Modules. Business logic is separated into data, domain, services, use cases, controllers, UI, and Store modules.

There is no secret-bearing backend in v1.0.0. This is intentional for GitHub Pages safety.

## Not included

- verified revenue or paid customers
- verified MAU/retention analytics
- user accounts or authentication
- server database
- admin dashboard
- native iOS/Android store package
- owned custom domain
- direct OpenAI/LLM API integration
- paid commercial contracts for external map/weather/routing/geocoding services

A buyer should value the asset as an operational MVP/codebase and product foundation, not as a cash-flowing business unless independent metrics are supplied outside this repository.
