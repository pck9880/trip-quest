# Changelog

## 1.1.2 — AI map reference + KEEP course shortcut

- Removed the stale direct `drawMap()` call from `app.js`; AI recommendation presentation now goes through the search controller
- Added a modular-reference regression test to catch calls to extracted functions that are neither local nor imported
- Changed KEEP detail action from external map search to the in-app Step 5 course page
- Added saved-course hydration so KEEP can reopen the stored destination/course, selected route map, and nearby-place actions
- Bumped PWA cache/static versions


## 1.1.1 — AI patch + KEEP detail hotfix

- Restored the missing AI `applyPatch()` runtime handler that caused Step 4 recommendation errors
- Preserved destination distance/reason/route context in newly saved KEEP courses
- Replaced misleading 0 km / 0 min labels for single-stop courses with single-place/visit labels
- Added destination context and a map shortcut to KEEP detail
- Increased the KEEP detail back-to-list button size and visibility
- Added regression checks for the AI patch handler and KEEP detail UX


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
