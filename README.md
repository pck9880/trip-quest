# TRIP QUEST · v0.50

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

## v0.50 추천/의도 계층 분리

추천 점수 계산과 자연어 의도 해석을 UI 진입점에서 분리했습니다.

- `js/domain/recommendation.js`: 거리·카테고리·도심 선호·점수 계산
- `js/usecases/search-destinations.js`: 도로거리 검증/후보 정제
- `js/domain/intent-parser.js`: 여행 자연어 의도 파싱
- `js/data/intent-rules.js`: 자연어 규칙 데이터

이 단계까지 `app.js`는 UI orchestration 중심으로 축소되며 추천/의도 로직은 독립 테스트 가능한 모듈이 됩니다.
