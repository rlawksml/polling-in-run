# Polling In Run 현재 진행 정리

업데이트: 2026-06-22

## 한 줄 요약

Polling In Run은 현재 지도 기반 편의시설 탐색, 러닝 기록 MVP, M4 계정 라이프사이클, Capacitor iOS Preview 기본 설정까지 완료한 상태다.

실제 모바일 실사용 검증과 Supabase 환경변수 입력 후 인증 동작 확인은 아직 남아 있다.

## 현재 구현 상태

| 영역 | 상태 | 요약 |
|---|---:|---|
| M1. 지도와 현재 위치 | 8 / 9 | 카카오맵, 현재 위치, 지도 컨트롤 구현 완료. 모바일 실기기 위치 확인 대기 |
| M2. 주변 편의시설 | 12 / 12 | 실제 음수대/화장실 데이터, 지도 영역 조회, 상세 카드, 길찾기, 클러스터링 완료 |
| M3. 러닝 기록 | 5 / 5 | 러닝 시작, 일시정지, 종료, 거리/페이스, 결과 저장, 기록 조회 완료 |
| M4. 회원가입과 로그인 | 8 / 8 | ID/PW 인증, 중복 확인, 기록 접근 로그인 게이트, 사용자별 로컬 기록 분리, 회원 탈퇴 API 연결 완료 |
| M5. 모바일 앱 검증 | 5 / 7 | Capacitor 설정, iOS 플랫폼, API base URL 정리 완료. 실기기 검증 대기 |

## 완료된 핵심 기능

### 지도와 위치

- Kakao Maps JavaScript SDK 로더를 구현했다.
- 홈 화면에 모바일 우선 전체 화면 지도를 표시한다.
- 현재 위치 권한 요청, 사용자 위치 마커, 정확도 표시를 구현했다.
- 위치 권한 거부, 시간 초과, 미지원 상태 안내를 제공한다.
- 현재 위치 이동, 시설 전체 보기, 확대/축소 지도 컨트롤을 구현했다.
- 모바일 브라우저 실기기 확인 절차는 [`모바일 실기기 검증`](./qa/mobile-real-device-check.md)에 정리했다.

### 주변 편의시설

- FastAPI가 서로 다른 공공데이터 원본을 공통 `Facility` 모델로 정규화한다.
- 서울 열린데이터광장 음수대 Open API를 연결했다.
- 공간데이터마켓 서울 공중화장실 DBF 원본을 로컬에서 정규화한다.
- 음수대 API timeout 시 전체 시설 API가 실패하지 않도록 소스별 fallback을 적용했다.
- 현재 위치 반경과 지도 영역 기준으로 시설을 필터링한다.
- 마커 선택 시 시설명, 주소, 거리, 운영 시간 일부를 표시한다.
- 카카오맵 길찾기 외부 링크를 제공한다.
- 밀집 지역 마커 클러스터링을 적용했다.

### 러닝 기록

- 러닝 상태 모델은 `idle → running → paused → finished` 흐름이다.
- 화면이 켜진 상태에서 `watchPosition()`으로 위치 포인트를 수집한다.
- GPS 좌표 기반 거리와 평균 페이스를 계산한다.
- 러닝 결과 화면에서 거리, 시간, 페이스, 메모를 확인한다.
- 비로그인 임시 기록은 현재 `localStorage`의 `polling-in-run.records.v1`에 저장한다.
- 기록 탭에서 러닝 기록 목록과 상세를 조회할 수 있다.
- 기록 상세에서 로컬 저장 기록을 삭제할 수 있다.
- 비로그인 상태에서 기록 탭을 누르면 마이 페이지 로그인 화면으로 이동한다.
- 로그인한 사용자 기록은 `polling-in-run.records.v1.user.<userId>` key에 저장해 같은 브라우저 안에서도 사용자별로 분리한다.
- 모바일 웹 백그라운드 위치 추적 한계는 [`러닝 추적`](./features/run-tracking.md)에 기록했다.

### 회원가입과 로그인

- 마이 페이지에 ID/PW 로그인 화면과 회원가입 화면을 구현했다.
- ID 형식, 비밀번호 길이, 회원가입 비밀번호 확인을 검증한다.
- Supabase Auth 클라이언트를 연결했다.
- Supabase 기본 email/password 인증에 맞추기 위해 ID를 내부 인증 이메일로 변환한다.
- 예: `runner-id → runner-id@polling-in-run.local`
- `getSession`, `onAuthStateChange`, `signOut` 기반 세션 확인과 로그아웃 흐름을 준비했다.
- Supabase 환경변수가 없으면 실제 인증 요청 없이 설정 안내를 표시한다.
- Supabase 인증 실패 응답을 중복 ID, 로그인 실패, 비밀번호 조건, 네트워크 오류 등 사용자 친화적인 한국어 메시지로 변환한다.
- 로그인 세션의 `userId`를 기준으로 로컬 러닝 기록 저장소를 분리한다.
- 회원가입 전 ID 중복 확인을 FastAPI와 Supabase Admin API로 수행한다.
- 회원 탈퇴는 FastAPI가 현재 access token을 검증한 뒤 Supabase Auth 계정 삭제를 요청한다.
- 회원 탈퇴 성공 시 이 기기의 사용자별 로컬 러닝 기록도 삭제한다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui 기반 Button |
| Server State | TanStack Query |
| Map | Kakao Maps JavaScript API |
| Backend | FastAPI, Python |
| Auth | Supabase Auth |
| Mobile Preview | Capacitor iOS |
| Data | 서울 열린데이터광장, 공간데이터마켓 |
| Local Storage | 러닝 기록 MVP 저장 |

## 현재 필요한 로컬 설정

### Web

`apps/web/.env.local`:

```bash
VITE_KAKAO_MAP_KEY=
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AUTH_EMAIL_DOMAIN=polling-in-run.local
```

### API

`apps/api/.env`:

```bash
SEOUL_OPEN_DATA_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_AUTH_EMAIL_DOMAIN=polling-in-run.local
```

원본 화장실 데이터는 GitHub에 올리지 않고 로컬 `data/raw/restrooms/` 아래에 둔다.

## 검증된 명령

최근 M4 계정 라이프사이클 연결 기준으로 아래 검증을 통과했다.

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
```

## 남은 작업

### 바로 다음

1. Supabase Dashboard에서 web/api 환경변수를 로컬에 입력한다.
2. 로컬에서 실제 회원가입, ID 중복 확인, 로그인, 회원 탈퇴를 확인한다.
3. 모바일 브라우저와 Capacitor iOS 실기기 검증 체크리스트를 수행한다.

### M4 남은 범위

- 구현 기준 완료. 실제 Supabase 프로젝트 환경변수 입력 후 수동 검증이 필요하다.

### M5 남은 범위

- 카카오맵 JavaScript SDK가 iOS WebView origin에서 동작하는지 확인한다.
- iPhone 실기기에서 위치 권한, 현재 위치 마커, 시설 마커 표시를 확인한다.

### M5 이후

- PWA 설치 경험과 Capacitor 앱 경험을 비교한다.

## 주의할 점

- 실제 API 키, Supabase anon key, Supabase service role key는 `.env.local` 또는 `.env`에만 둔다.
- `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출되는 `apps/web/.env.local`에 절대 넣지 않는다.
- 원본 공공데이터 파일은 GitHub에 커밋하지 않는다.
- 현재 러닝 기록은 브라우저 `localStorage`에 저장되므로 기기 간 동기화되지 않는다.
- 사용자별 기록은 로컬 저장소 key 기준으로 분리됐지만, 기기 간 동기화는 Supabase DB 연결 이후에 가능하다.
- 모바일 브라우저에서 위치와 러닝 흐름은 실기기 확인 전까지 완료로 표시하지 않는다.

## 관련 문서

- [`TODO`](../TODO.md)
- [`README`](../README.md)
- [`홈 지도`](./pages/home-map.md)
- [`주변 편의시설`](./features/facility-search.md)
- [`러닝 추적`](./features/run-tracking.md)
- [`기록 저장`](./features/record-storage.md)
- [`인증과 설정`](./features/auth-and-settings.md)
- [`모바일 실기기 검증`](./qa/mobile-real-device-check.md)
- [`Capacitor iOS Preview`](./qa/capacitor-ios-preview.md)
