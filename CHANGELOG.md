# Changelog

## 1.1.0 — KEEP course library

- Added star-toggle KEEP controls beside A/B course selection
- Added persistent local course storage with duplicate prevention and removal
- Reworked bottom navigation to Explore / KEEP / Settings
- Added KEEP count badge, saved-course list, and detail bottom sheet
- Added removal from both course cards and KEEP list/detail views
- Added KEEP persistence/unit regression tests


## 1.0.1 — Landing cover hotfix

- Fixed the cover image URL after stylesheets moved into `site-src/css/`
- Prevented fallback landing copy from flashing before the cover-image probe completes
- Added regression checks for cover-path resolution and initial photo-ready state
- Bumped Service Worker/static asset versions so existing PWA installs receive the fix


## 1.0.0 — Sale-ready baseline

- Structured Store and named travel-service facade
- Domain/service/controller/UI module boundaries
- Recommendation, intent, course and map modules separated from the entry file
- Semantic CSS structure and style-budget test
- Legacy duplicate deployment files and unused cover iterations removed
- Third-party attribution improved in the UI
- Architecture, deployment, data, dependency, transfer and commercial-readiness documentation added
- Complete verification suite wired into CI and Pages deployment

## 0.54.0

- Replaced patch-oriented stylesheets with semantic CSS entrypoints
- Removed obsolete motion and deleted quick-search UI rules
- Reduced CSS `!important` usage and added style checks

## 0.53.0

- Centralized state ownership in `trip-store.js`
- Removed internal fake `/api/*` router
- Added named `travel-service.js` facade

## 0.52.0

- Extracted UI renderers and controllers

## 0.51.0

- Extracted course planner and map state

## 0.50.0

- Extracted recommendation engine and natural-language intent parser

## 0.49.0

- Extracted routing, weather, geocoding, vehicle and trip-cost services

## 0.48.0

- Started ES Module decomposition of the original monolithic entry file
