# Capacitor iOS Preview

## 목적

React/Vite 웹앱을 Capacitor iOS 앱으로 감싸 iPhone 실기기에서 지도, 위치 권한, 시설 조회, 러닝 기록 흐름을 검증한다.

## 현재 상태

- Capacitor 기본 패키지를 `apps/web`에 설치했다.
- `apps/web/capacitor.config.ts`를 추가했다.
- iOS 플랫폼 프로젝트를 `apps/web/ios`에 추가했다.
- `webDir`는 Vite build 결과인 `dist`를 사용한다.
- `npm run build:web` 후 `npx cap sync ios`가 성공했다.
- API 호출은 `VITE_API_BASE_URL`을 통해 앱 환경에서도 FastAPI origin을 지정할 수 있게 정리했다.

## 로컬 실행 흐름

```bash
npm run build:web
cd apps/web
npx cap sync ios
npx cap open ios
```

Xcode에서 iPhone 실기기를 선택해 실행한다.

## 환경변수

웹 로컬 개발에서는 `VITE_API_BASE_URL`을 비워두면 Vite dev proxy의 `/api`를 사용한다.

Capacitor 앱에서는 Vite dev proxy가 없으므로 `apps/web/.env.local`에 FastAPI가 접근 가능한 origin을 지정한다.

```bash
VITE_API_BASE_URL=http://<PC 내부 IP>:8000
```

예:

```bash
VITE_API_BASE_URL=http://192.168.45.3:8000
```

## 확인할 항목

- [ ] Xcode에서 앱이 빌드된다.
- [ ] iPhone에서 앱이 실행된다.
- [ ] 카카오맵이 iOS WebView에서 표시된다.
- [ ] 현재 위치 권한 요청이 표시된다.
- [ ] 현재 위치 마커가 표시된다.
- [ ] 시설 API가 `VITE_API_BASE_URL`을 통해 호출된다.
- [ ] 음수대와 화장실 마커 또는 클러스터가 표시된다.
- [ ] 러닝 시작, 일시정지, 재개, 종료 흐름이 동작한다.
- [ ] 러닝 결과 저장과 기록 조회가 동작한다.
- [ ] 로그인, ID 중복 확인, 회원 탈퇴 API 호출 전략을 확인한다.

## 주의점

- Kakao Maps JavaScript SDK는 iOS WebView origin에서 별도 이슈가 있을 수 있다.
- 로컬 FastAPI 서버를 iPhone에서 접근하려면 PC와 iPhone이 같은 네트워크에 있어야 한다.
- `SUPABASE_SERVICE_ROLE_KEY`는 FastAPI `.env`에만 둔다.
- Capacitor 앱의 백그라운드 위치 추적은 이번 PR 범위가 아니다.

## 다음 결정

- PWA 설치 경험과 Capacitor 앱 경험을 비교한다.
- iOS WebView에서 Kakao Maps가 안정적으로 동작하지 않으면 지도 SDK 대안을 다시 검토한다.
- 실제 앱 배포를 목표로 할 경우 App Store 서명, 개인정보 안내, 위치 권한 문구를 별도 정리한다.
