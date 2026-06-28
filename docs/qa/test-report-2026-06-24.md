# Test Report - 2026-06-24

## 요약

2026-06-24 기준 Polling In Run의 웹 lint, 웹 테스트, API 테스트, 웹 프로덕션 빌드, iOS 시뮬레이터 빌드를 실행했다. 최종 결과는 모두 통과다.

## 실행 환경

- macOS local development
- Node/Vite/React web app
- FastAPI pytest environment: `apps/api/.venv`
- Xcode iOS Simulator SDK: `iphonesimulator26.5`
- Capacitor Swift package: `capacitor-swift-pm 8.4.1`

## 결과

| 항목 | 명령어 | 결과 |
|---|---|---|
| Web lint | `npm run lint:web` | 통과 |
| Web tests | `npm run test:web` | 통과, 2 files / 16 tests |
| API tests | `npm run test:api` | 통과, 15 tests |
| Web build | `npm run build:web` | 통과 |
| iOS simulator build | `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` | 통과 |

## 발견한 이슈와 조치

### API 테스트가 로컬 `.env`에 영향을 받는 문제

처음 `npm run test:api` 실행 시 `test_user_id_availability_requires_admin_env`가 실패했다. 테스트는 Supabase admin 환경변수가 없을 때 503을 기대했지만, 실제 로컬 `apps/api/.env` 값이 읽혀 200이 반환됐다.

조치:

- `get_api_env_value()`에 테스트용 `POLLING_IN_RUN_SKIP_DOTENV=1` 스위치를 추가했다.
- 해당 테스트에서 이 값을 설정해 로컬 실제 비밀값과 테스트를 분리했다.
- 재실행 결과 API 테스트 15개가 모두 통과했다.

## 빌드 산출물 참고

웹 프로덕션 빌드 결과:

- `dist/index.html`: 0.52 kB
- `dist/assets/index-BpqI1W5j.css`: 33.32 kB
- `dist/assets/index-DF4eEfjG.js`: 359.66 kB

## 현재 테스트 체계 평가

현재 MVP 단계에서는 새 테스트 도구를 바로 추가하기보다 기존의 Vitest, pytest, xcodebuild 기반 테스트를 안정화하는 편이 효율적이다.

추후 사용자 흐름이 안정되면 Playwright로 웹 E2E와 스크린샷 회귀 테스트를 추가하고, iPhone 앱 자체의 탭/스와이프 흐름은 Maestro 도입을 검토한다.

## 남은 수동 검증

- iPhone 실기기에서 위치 권한 허용 흐름 확인
- Apple MapKit 드래그/확대/축소 확인
- 러닝 시작, 종료, 저장, 기록 조회 확인
- 0km 또는 빈 메모 저장 차단 확인
- 마이 페이지 독립 화면 레이아웃 확인
