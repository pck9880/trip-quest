# TRIP QUEST · v1.4.0

현재 위치와 이동 가능 거리, 취향, 시간 조건을 바탕으로 국내 여행지를 찾고 A/B 코스와 예상 교통비를 계산하는 정적 PWA입니다.

- Live: https://pck9880.github.io/trip-quest/
- Canonical source: `site-src/`
- Deployment: GitHub Pages via `.github/workflows/pages.yml`
- Runtime: browser-native ES Modules
- Tests: `npm test`
- Sale-ready baseline: `v1.0.0`

## 주요 기능

- 현재 위치 또는 직접 입력 출발지
- 최소/최대 거리 dual-range 검색
- 여행 취향 및 방향 조건
- 규칙 기반 자연어 여행 의도 해석
- 전국 여행지/젊은 상권/핫플 추천
- 도보 A코스 / 차량 B코스
- OpenStreetMap 지도와 도로 경로
- 차량 연비, 연료비/충전비, 예상 통행료 계산
- PWA 설치 및 여행 공유
- GPS 체크포인트 기반 QUEST, XP, 레벨 및 칭호

## 구조

```text
site-src/
├─ app.js                  # 앱 조립, PWA, AI 검색 흐름
├─ css/                    # base / product / landing / search
├─ js/
│  ├─ controllers/
│  ├─ core/
│  ├─ data/
│  ├─ domain/
│  ├─ services/
│  ├─ store/
│  ├─ ui/
│  └─ usecases/
├─ assets/
├─ index.html
├─ manifest.webmanifest
└─ sw.js
```

세부 구조는 `docs/ARCHITECTURE.md`를 참고하세요.

## 개발/검증

```bash
npm test
```

별도 빌드 프레임워크는 없습니다. GitHub Pages 배포 워크플로가 `site-src/`를 배포 산출물로 복사하고 PWA 아이콘 및 연료가격 파일을 생성합니다.

## 중요한 범위

현재 버전은 **정적 PWA**입니다. 사용자 계정, 서버 DB, 관리자 페이지, 네이티브 앱스토어 패키지, 직접 OpenAI API 연동은 포함하지 않습니다. 자연어 검색은 로컬 intent parser + recommendation engine 구조입니다.

상용 운영 전에는 공용 지도/날씨/지오코딩/라우팅 서비스의 사용 조건을 반드시 검토하고 필요한 유료 또는 자체 호스팅 서비스로 교체해야 합니다. 자세한 내용은 `docs/COMMERCIAL_READINESS.md`와 `docs/THIRD_PARTY.md`를 참고하세요.

## 문서

- `docs/BUYER_OVERVIEW.md` — 인수자가 먼저 볼 제품 범위
- `docs/ARCHITECTURE.md` — 코드 구조와 의존 방향
- `docs/DEPLOYMENT.md` — 배포 및 복구
- `docs/DATA.md` — 여행 데이터 구조
- `docs/THIRD_PARTY.md` — 외부 서비스/라이선스
- `docs/COMMERCIAL_READINESS.md` — 상용화 전 교체/확인 항목
- `docs/ASSET_PROVENANCE.md` — 이미지/자산 실사
- `docs/KNOWN_LIMITATIONS.md` — 현재 한계
- `docs/TRANSFER_CHECKLIST.md` — 매각/인수 체크리스트
- `docs/RELEASE_PROCESS.md` — 이후 업데이트 절차

## 라이선스

프로젝트 자체 코드의 이용 조건은 `LICENSE.md`를 따릅니다. 제3자 소프트웨어, 데이터, API 및 서비스는 각 제공자의 조건이 우선합니다.

## v1.2 사용자 기능

- 하단 `MY` 탭과 로컬 프로필
- 랜덤 임시 여행자 ID, 닉네임 수정, IndexedDB 프로필 이미지
- 일일 출석체크와 연속/월간 출석 통계
- 선택 코스의 `여행 완료` 기록과 다녀온 곳 목록/상세
- 기존 차량/연비 설정을 `MY > 설정`으로 이동
- 로그인 도입 전까지 사용자 데이터는 현재 기기에 로컬 저장

## v1.3 마이페이지 상세화

- 출석 달력/최장 연속 출석
- 프로필 이미지 512px 압축 저장
- 여행 기록 삭제·KEEP·코스 다시보기
- 여행 완료 통계와 월간 코스 거리
- 로컬 사용자 데이터 JSON 백업/복원/초기화

## v1.4 GPS QUEST

- QUEST 시작 전 위치정보 사용 안내 및 앱 내 동의
- 동의 후 브라우저/OS 위치 권한 요청
- GPS 정확도·반경·연속 위치·체류시간 기반 체크포인트 인증
- 위치 권한 거부, 신호 불가, 타임아웃, 오래된 좌표, 비정상 점프 대응
- PWA 백그라운드 전환 시 GPS 인증 일시중지
- 전체 이동경로는 저장하지 않고 인증 결과만 로컬 저장
- QUEST XP/레벨/칭호 해금 및 대표 칭호 장착
