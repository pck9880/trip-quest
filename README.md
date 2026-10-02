# TRIP QUEST · v0.49

국내여행 AI 플래너의 GitHub Pages/PWA 배포 저장소입니다.

- Live: https://pck9880.github.io/trip-quest/
- 실제 배포 원본: `site-src/`
- 배포 워크플로: `.github/workflows/pages.yml`
- 테스트: `tests/ai-smoke.mjs`, `tests/ui-smoke.mjs`

> 루트의 과거 정적 파일과 `site/` 폴더는 배포 원본이 아닙니다. 기능 수정은 `site-src/`를 기준으로 진행합니다.


## v0.48 리팩터링 기반

`site-src/app.js`의 저위험 책임을 ES Module로 분리했습니다. UI와 추천 동작은 유지하면서 DOM/format, 여행 데이터, 추천 메타데이터, 코스 데이터, 지리·시간 계산을 독립 모듈로 관리합니다.

- `site-src/js/core/`: DOM·표시 포맷 공통 유틸리티
- `site-src/js/data/`: 여행지·추천·코스·UI 옵션 데이터
- `site-src/js/domain/`: 지리·일정 순수 계산
- `npm test`: AI/추천/코스/UI smoke test

## v0.49 서비스 계층 분리

외부 I/O와 차량/비용 계산 책임을 `app.js`에서 분리했습니다.

- `js/services/routing.js`: OSRM 및 경로 fallback
- `js/services/weather.js`: Open-Meteo 및 시간대 날씨 선택
- `js/services/geocoding.js`: 지오코딩
- `js/services/vehicle-settings.js`: 차량 설정/localStorage
- `js/domain/trip-cost.js`: 예상 통행료 계산
