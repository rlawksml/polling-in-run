# Polling In Run 현재 진행 정리

업데이트: 2026-06-24

## 한 줄 요약

Polling In Run은 현재 지도 기반 편의시설 탐색, 러닝 기록 MVP, 로컬 대시보드, 기록 페이지 확장, Capacitor iOS Preview, 홈 화면 Apple MapKit 대체 초안, 로딩 UX 보강까지 완료했고, 방향을 local-first iPhone prototype으로 재정의한 상태다.

iPhone 실기기에서 NativeMap 기반 홈 지도, 위치, 시설 마커, 지도 조작, 현위치 이동, 시설 JSON 로딩까지 확인했다.

## 현재 구현 상태

| 영역 | 상태 | 요약 |
|---|---:|---|
| M1. 지도와 현재 위치 | 10 / 10 | 카카오맵 웹 MVP 완료. iPhone 실기기 위치 확인 완료. iPhone 앱 지도 전략은 Apple MapKit native 우선 |
| M2. 주변 편의시설 | 12 / 12 | 실제 음수대/화장실 데이터, 지도 영역 조회, 상세 카드, 길찾기, 클러스터링 완료 |
| M3. 러닝 기록 | 5 / 5 | 러닝 시작, 일시정지, 종료, 거리/페이스, 결과 저장, 기록 조회 완료 |
| M4. 마이 페이지와 로컬 사용자 정보 | 6 / 6 | 로그인 기능은 추후 확장으로 축소. 로컬 프로필, D3 대시보드, 설정 안내 구현 완료 |
| M5. Local-first iPhone 프로토타입 | 8 / 8 | Capacitor 설정 완료. Apple MapKit 대체, 로딩 UX, 현위치 이동, 단일 마이 페이지와 실기기 핵심 지도 검증 완료 |

## 완료된 핵심 기능

### 지도와 위치

- Kakao Maps JavaScript SDK 로더를 구현했다.
- 홈 화면에 모바일 우선 전체 화면 지도를 표시한다.
- 현재 위치 권한 요청, 사용자 위치 마커, 정확도 표시를 구현했다.
- 위치 권한 거부, 시간 초과, 미지원 상태 안내를 제공한다.
- 현재 위치 이동, 시설 전체 보기, 확대/축소 지도 컨트롤을 구현했다.
- 모바일 브라우저와 iPhone 실기기에서 지도, 현재 위치, 주변 시설 표시를 확인했다.
- Capacitor 정적 앱의 `capacitor://localhost` origin에서는 Kakao Maps JavaScript SDK가 도메인 검증에 막힐 수 있음을 확인했다.
- iPhone 앱 지도 전략은 Apple MapKit native를 1차 후보로 두고, 길찾기는 외부 지도 앱 연동을 우선한다.
- Apple MapKit native는 Swift `MKMapView`를 WebView 아래에 깔아 홈 화면의 Kakao Maps 영역을 대체하는 방식으로 시작한다.
- NativeMap iOS 초안은 React에서 현재 위치와 최대 300개 시설을 넘기고, embedded `MKMapView`에서 annotation으로 표시한다.
- 앱 초기 진입 시 전체 랜딩 로딩 화면을 최소 2초 표시하고, 시설 데이터 로딩 중에는 지도 위 스켈레톤을 표시한다.

### 주변 편의시설

- FastAPI가 서로 다른 공공데이터 원본을 공통 `Facility` 모델로 정규화한다.
- 서울 열린데이터광장 음수대 Open API를 연결했다.
- 공간데이터마켓 서울 공중화장실 DBF 원본을 로컬에서 정규화한다.
- 음수대 API timeout 시 전체 시설 API가 실패하지 않도록 소스별 fallback을 적용했다.
- 현재 위치 반경과 지도 영역 기준으로 시설을 필터링한다.
- 시설 데이터 6,477건을 `apps/web/public/data/facilities.json`으로 export했다.
- 시설 JSON은 약 5.2MB이고 gzip 기준 약 389KB다. 로컬 Node 기준 `JSON.parse` 평균은 약 8.7ms였고, iPhone 실기기에서도 빠르게 표시되는 것을 확인했다.
- 프론트는 로컬 JSON을 먼저 조회하고, 실패하면 FastAPI 시설 API로 fallback한다.
- 마커 선택 시 시설명, 주소, 거리, 운영 시간 일부를 표시한다.
- 카카오맵 길찾기 외부 링크를 제공한다.
- 밀집 지역 마커 클러스터링을 적용했다.

### 러닝 기록

- 러닝 상태 모델은 `idle → running → paused → finished` 흐름이다.
- 화면이 켜진 상태에서 `watchPosition()`으로 위치 포인트를 수집한다.
- GPS 좌표 기반 거리와 평균 페이스를 계산한다.
- 러닝 결과 화면에서 거리, 시간, 페이스, 메모를 확인한다.
- 비로그인 임시 기록은 현재 `localStorage`의 `polling-in-run.records.v1`에 저장한다.
- 기록 탭에서 러닝 기록 목록과 상세를 독립 페이지로 조회할 수 있다.
- 기록 탭에서 메모 검색, 월별 필터, 거리·시간·페이스 정렬을 사용할 수 있다.
- 새로 저장한 기록은 경로 좌표를 함께 저장하고, iPhone 상세에서는 Apple MapKit snapshot 경로 이미지를 제공한다.
- 웹과 snapshot 실패 상황에서는 카드 내부 SVG 경로를 fallback으로 제공한다.
- 기록 탭은 지도 위 floating panel이 아니라 불투명한 전체 페이지로 전환했다.
- 기록 상세에서 로컬 저장 기록을 삭제할 수 있다.
- local-first MVP에서는 로그인 없이 로컬 저장 기록을 조회할 수 있게 방향을 조정한다.
- 모바일 웹 백그라운드 위치 추적 한계는 [`러닝 추적`](./features/run-tracking.md)에 기록했다.

### 마이 페이지와 인증 확장안

- 마이 페이지를 로컬 프로필, D3 러닝 대시보드, 앱 설정, 위치 권한 안내 중심의 독립 페이지로 구성했다.
- ID/PW 로그인, 회원가입, Supabase Auth 연결, ID 중복 확인, 회원 탈퇴는 이전 실험 기록으로 남긴다.
- 계정 기능은 공개 서비스 또는 멀티 디바이스 동기화가 필요해질 때 다시 도입한다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui 기반 Button |
| Server State | TanStack Query |
| Map | Kakao Maps JavaScript API, Apple MapKit native 검토 |
| Optional Backend | FastAPI, Python |
| Optional Auth | Supabase Auth |
| Mobile Preview | Capacitor iOS |
| Data | 서울 열린데이터광장, 공간데이터마켓, local-first 시설 JSON |
| Local Storage | 러닝 기록 MVP 저장 |

## 현재 필요한 로컬 설정

### Web

`apps/web/.env.local`:

```bash
VITE_KAKAO_MAP_KEY=
VITE_API_BASE_URL=
# Optional auth expansion
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
# VITE_AUTH_EMAIL_DOMAIN=polling-in-run.local
```

### API

`apps/api/.env`:

```bash
SEOUL_OPEN_DATA_API_KEY=
# Optional auth expansion
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
# SUPABASE_AUTH_EMAIL_DOMAIN=polling-in-run.local
```

원본 화장실 데이터는 GitHub에 올리지 않고 로컬 `data/raw/restrooms/` 아래에 둔다.

시설 JSON은 아래 명령으로 갱신한다.

```bash
npm run export:facilities
```

## 검증된 명령

최근 웹 MVP 기준으로 아래 검증을 통과했다.

```bash
apps/api/.venv/bin/python -m pytest apps/api
npm run test:web
npm run lint:web
npm run build:web
npm --prefix apps/web audit
git diff --check
```

`npm --prefix apps/web audit` 결과는 `0 vulnerabilities`였다.

M5 Capacitor iOS Preview 기준으로 아래 검증을 추가로 통과했다.

```bash
npm run build:web
cd apps/web
npx cap sync ios
xcodebuild -project apps/web/ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

## 남은 작업

### 바로 다음

1. 기록 페이지 확장 기능의 실제 사용감을 확인하고 필터·정렬·경로 표현을 다듬는다.
2. PWA 설치 경험과 Capacitor 앱 경험을 비교한다.
3. 접근성·성능·배포 점검과 포트폴리오 회고를 준비한다.

### M4 남은 범위

- 구현 기준 완료. 추후에는 목표 입력 UI, 그래프 라벨·색상·간격, empty state, 기록 리셋, 평균 페이스 추이 그래프를 polish 작업으로 검토한다.

### M5 남은 범위

- NativeMap Capacitor plugin 초안은 추가했다.
- React UI 좌표 기반 WebView touch pass-through를 추가했다.
- 홈 화면 상단 MY 버튼과 브랜드 카드는 제거하고, 우측 상단을 현위치 이동 버튼으로 바꿨다.
- NativeMap recenter bridge를 추가해 iPhone 홈 화면에서 현재 위치로 다시 이동할 수 있게 했다.
- 러닝 중에도 홈 지도에서 음수대/화장실 필터, 현재 영역 재검색, 현재 위치 이동을 사용할 수 있게 했다.
- 앱 초기 로딩 화면, 시설 데이터 스켈레톤, 마이 페이지 단일 화면 배경 처리를 추가했다.
- iPhone 실기기에서 위치 권한, 현재 위치 마커, 시설 마커, Apple MapKit 드래그·확대/축소, 현위치 이동 버튼을 확인했다. 기록 상세 경로는 native overlay 대신 Apple MapKit snapshot 이미지를 React 카드 안에 표시하는 방식으로 정리했고, 기록 탭은 독립 페이지로 전환해 지도 배경과 레이어 충돌을 줄였다.
- 경로가 직선처럼 단순화되는 문제를 줄이기 위해 위치 샘플링을 1초 간격으로 보강하고 경로 포인트 저장 기준을 낮췄다.
- 경로 표시용 포인트 저장 기준과 누적 거리 계산 기준을 분리해 방향 전환 좌표 보존을 강화했다.
- 시설 JSON 크기와 로컬 파싱 성능은 1차 확인했고, iPhone 실기기에서도 빠르게 로딩되는 것을 확인했다. 이후 데이터가 커지면 gzip 서빙, 필드 축소, 지역별 분할 순서로 검토한다.

### M5 이후

- PWA 설치 경험과 Capacitor 앱 경험을 비교한다.

## 주의할 점

- 실제 API 키, Supabase anon key, Supabase service role key는 `.env.local` 또는 `.env`에만 둔다.
- `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출되는 `apps/web/.env.local`에 절대 넣지 않는다.
- 원본 공공데이터 파일은 GitHub에 커밋하지 않는다.
- 현재 러닝 기록은 브라우저 `localStorage`에 저장되므로 기기 간 동기화되지 않는다.
- 사용자별 클라우드 동기화는 Supabase DB 연결 이후에 가능하며, 현재 MVP 필수 범위가 아니다.
- 모바일 브라우저와 iPhone 앱의 위치·지도 핵심 흐름은 실기기 확인을 완료했다. 러닝 장거리 백그라운드 추적은 별도 native 기능으로 다룬다.

## 관련 문서

- [`TODO`](../TODO.md)
- [`README`](../README.md)
- [`홈 지도`](./pages/home-map.md)
- [`주변 편의시설`](./features/facility-search.md)
- [`러닝 추적`](./features/run-tracking.md)
- [`기록 저장`](./features/record-storage.md)
- [`인증과 설정`](./features/auth-and-settings.md)
- [`Local-first iPhone Prototype`](./features/local-first-iphone-prototype.md)
- [`모바일 실기기 검증`](./qa/mobile-real-device-check.md)
- [`Capacitor iOS Preview`](./qa/capacitor-ios-preview.md)
