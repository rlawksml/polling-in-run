# Testing Strategy

## 목적

Polling In Run은 웹앱, FastAPI, Capacitor iOS, Apple MapKit native layer가 함께 움직이는 앱이다. 따라서 하나의 테스트 도구로 전부 확인하기보다 계층을 나눠 검증한다.

## 테스트 계층

| 계층 | 목적 | 현재 도구 | 상태 |
|---|---|---|---|
| Web lint | React/TypeScript 코드 규칙과 잠재 오류 확인 | ESLint | 사용 중 |
| Web unit/component | 화면 상태, 기록 저장, 유효성 검사, 주요 UI 흐름 확인 | Vitest, Testing Library | 사용 중 |
| API unit/integration | FastAPI 엔드포인트, 시설 데이터 변환, 인증 보조 API 확인 | pytest | 사용 중 |
| Web production build | TypeScript 컴파일과 Vite 번들 생성 확인 | tsc, Vite | 사용 중 |
| iOS native build | Capacitor, Swift plugin, Xcode 프로젝트 빌드 확인 | xcodebuild | 사용 중 |
| iOS 실기기 smoke | 위치 권한, Apple MapKit 조작, 러닝 시작/종료, 저장 확인 | Xcode, iPhone | 수동 검증 |
| E2E 자동화 | 실제 사용자 흐름을 자동 시나리오로 재현 | Playwright 또는 Maestro | 추후 도입 후보 |

## 현재 판단

지금 단계에서는 Vitest, pytest, xcodebuild만으로도 핵심 회귀를 꽤 잘 막을 수 있다. Playwright나 Maestro는 앱 흐름이 더 안정된 뒤 도입하는 편이 낫다.

Playwright는 브라우저 기반 E2E 테스트에 강하다. 로컬 웹 화면의 홈, 기록, 마이 페이지 흐름을 자동으로 누르고 확인하는 데 적합하지만, iPhone native MapKit 제스처나 위치 권한은 직접 검증하기 어렵다.

Maestro는 모바일 앱 E2E에 적합하다. Capacitor 앱을 실제 iOS 앱처럼 실행하고 탭, 스와이프, 화면 텍스트 확인을 자동화할 수 있다. 다만 iOS 실기기와 Xcode 환경 의존성이 있어서 MVP 화면이 안정된 뒤 붙이는 것이 좋다.

## 권장 실행 순서

```bash
npm run lint:web
npm run test:web
npm run test:api
npm run build:web
xcodebuild -project apps/web/ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

## 실기기 수동 체크리스트

- 앱 최초 실행 시 로딩 화면이 보인다.
- 위치 권한 요청과 허용 후 현재 위치 카드가 정상 표시된다.
- 홈 화면 Apple MapKit이 표시되고 드래그, 핀치 줌, 현위치 이동이 동작한다.
- 음수대/화장실 필터와 시설 마커가 표시된다.
- 러닝 시작 후 작은 러닝 상태 위젯이 표시된다.
- 러닝 종료 후 0km 또는 빈 메모 저장이 막힌다.
- 정상 기록은 저장 후 기록 페이지에서 확인된다.
- 기록 상세에서 경로가 보이고 삭제가 동작한다.
- 마이 페이지는 지도 위 오버레이가 아니라 독립 페이지처럼 보인다.

## 다음 도입 후보

1. Playwright: 웹 E2E와 스크린샷 회귀 테스트가 필요해질 때 도입한다.
2. Maestro: iOS 앱의 탭/스와이프/저장 흐름을 자동화하고 싶을 때 도입한다.
3. XCUITest: Apple native 계층을 더 깊게 검증해야 할 때 고려한다.
