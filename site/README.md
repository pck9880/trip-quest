# TRIP QUEST Mobile v0.7 · GitHub Pages Edition

서버 설치 없이 정적 호스팅에서 실행되는 모바일/PWA 버전입니다.

## 바로 동작하는 기능
- iPhone / iPad / Android / PC 브라우저
- 현재 위치
- 출발지 검색(OpenStreetMap Nominatim, 실패 시 내장 데이터)
- 현재 날씨(Open-Meteo)
- 거리·방향·취향 기반 추천
- 여행 전용 자연어 해석 및 범위 밖 이지선다 유도
- 캐스퍼 11km/L 기준 근사 거리·연료비 계산
- A/B/C 코스
- 지도, PWA 홈 화면 추가, 모바일 공유

## 정적판에서 제한되는 기능
API 비밀키를 브라우저에 넣지 않기 위해 OpenAI GPT, Kakao REST API, TMAP 실시간 경로/통행료는 포함하지 않습니다. 현재 경로는 근사 계산이며 통행료는 0원으로 표시됩니다. 이후 백엔드 연결 시 같은 UI에 다시 붙일 수 있습니다.

## GitHub Pages
이 폴더 내용을 저장소 main 브랜치 루트에 올리면 `.github/workflows/pages.yml`이 Pages 배포를 수행하도록 준비되어 있습니다. 저장소에서 Pages가 GitHub Actions 소스로 허용되어 있어야 합니다.

## iPhone
배포된 HTTPS 주소를 Safari에서 열고 `공유 → 홈 화면에 추가`를 선택하면 앱처럼 실행할 수 있습니다.
