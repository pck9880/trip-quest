# TRIP QUEST · v0.54

국내여행 AI 플래너의 GitHub Pages/PWA 배포 저장소입니다.

- Live: https://pck9880.github.io/trip-quest/
- 실제 배포 원본: `site-src/`
- 배포 워크플로: `.github/workflows/pages.yml`
- 테스트: `tests/ai-smoke.mjs`, `tests/ui-smoke.mjs`, `tests/style-smoke.mjs`

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

## v0.51 코스/지도 분리

- `js/domain/course-planner.js`: A/B 코스 후보 구성, 근거리 연결, 코스 비용 계산
- `js/ui/main-map.js`: 추천 지도/경로/포커스 관리
- `js/ui/course-map.js`: 선택 코스 지도와 마커 관리
- Leaflet 인스턴스는 앱 전역 state에서 제거하고 각 지도 모듈 내부에 캡슐화
- 핫스팟 메타데이터는 여행지 데이터 생성 시점에 결합

## v0.52 UI/Controller 분리

- `js/ui/results.js`: 추천 결과·비용·코스 렌더링
- `js/ui/wizard.js`: 단계/거리/방향/취향 UI 상태 동기화
- `js/ui/time-controls.js`: 출발·귀가 시간 UI
- `js/ui/landing.js`: 메인 랜딩 표시/종료
- `js/ui/course-actions.js`: 코스 주변 카페·음식점 액션
- `js/controllers/search-controller.js`: 추천 검색·정렬·여행지 선택 orchestration
- `js/controllers/origin-controller.js`: 위치/출발지 검색·실시간 상태 갱신
- `js/controllers/app-controller.js`: DOM 이벤트 바인딩

`app.js`는 도메인 구현보다 모듈 조립과 AI 흐름 중심으로 축소했습니다.

## v0.53 Store / Service Facade

- `js/store/trip-store.js`: navigation/origin/search/selection/runtime 상태를 한 Store가 소유
- 기존 flat state 접근은 Store proxy를 통해 호환하면서 실제 데이터는 영역별 section으로 분리
- `resetJourney()`, `update()`, `snapshot()`으로 상태 lifecycle을 중앙화
- `js/services/travel-service.js`: config/geocode/bootstrap/recommend/tripSummary/courses/aiSearch 명시적 서비스 API 제공
- 프론트 내부의 가상 `/api/*` 라우터 제거
- 검색/출발지 Controller는 URL 문자열 대신 named service method에 의존

## v0.54 스타일 시스템 정리

- `css/base.css`: 앱 공통 레이아웃/컴포넌트
- `css/product.css`: 앱 크롬, 차량 설정, 랜딩 fallback
- `css/landing.css`: 현재 표지와 터치 lifecycle
- `css/search.css`: 검색 페이지, 거리 슬라이더, 직접입력 drawer
- 버전 번호 기반 CSS 패치 주석 제거 및 의미 기반 섹션명으로 교체
- 사용하지 않는 자동차 모션/빠른선택 CSS 제거
- 최종 cascade 파일에서 불필요한 `!important`를 제거하고 style budget 테스트 추가
