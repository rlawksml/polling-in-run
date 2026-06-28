# 인증과 설정

## 해결하려는 문제

사용자 정보, 언어, 위치 권한 안내 같은 개인 설정을 관리해야 한다.

## 선택 방향

현재 MVP는 내 iPhone에서 동작하는 local-first 프로토타입을 우선한다. 따라서 마이 페이지는 로그인보다 로컬 프로필과 앱 설정을 보여주는 곳으로 축소한다.

Supabase Auth와 FastAPI 권한 검증은 여러 기기에서 기록을 동기화하거나 공개 서비스로 확장할 때 다시 도입한다.

이전 실험에서는 사용자가 입력하는 ID를 내부 인증 이메일로 변환해 Supabase email/password Auth에 연결했다.

```text
runner-id → runner-id@polling-in-run.local
```

이 방식은 화면에서는 ID/PW 경험을 유지하면서 Supabase의 기본 Auth API를 사용할 수 있게 한다. 다만 현재 local-first MVP에서는 계정 운영 책임과 구현 범위를 줄이기 위해 인증 기능을 추후 확장으로 내린다.

## Supabase Auth를 확장안으로 남기는 이유

### 장점

- 인증 서버를 직접 구축하는 시간을 줄인다.
- PostgreSQL과 사용자 데이터를 연결하기 쉽다.
- 이메일과 소셜 로그인 확장이 가능하다.

### 단점

- Supabase의 인증 방식과 토큰 수명주기를 이해해야 한다.
- React와 FastAPI 양쪽에서 세션·권한 경계를 설계해야 한다.
- Supabase Auth의 기본 비밀번호 인증은 email/password 또는 phone/password 중심이라 순수 ID/PW는 별도 매핑 규칙이 필요하다.

## 구현 시점 판단

현재 위치, 지도, 러닝 기록 흐름을 먼저 검증한다. 사용자별 클라우드 기록 저장과 기기 간 동기화가 필요해지는 시점에 인증을 추가한다.

## 구현 기록

아래 내용은 현재 MVP 필수 범위가 아니라, 인증 확장 실험 기록이다.

### 2026-06-21

- 마이 페이지에 ID/PW 로그인과 회원가입 화면 초안을 추가했다.
- ID 4자 이상, 비밀번호 8자 이상, 회원가입 비밀번호 확인 일치 여부를 검증한다.
- Supabase Auth 연결 전 단계이므로 비밀번호를 로컬에 저장하지 않는다.
- 비밀번호 찾기, 이메일 인증, 소셜 로그인은 MVP 범위에서 제외한다는 안내를 화면에 표시한다.
- `@supabase/supabase-js`를 추가하고 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 기반 클라이언트를 구성했다.
- `signUp`, `signInWithPassword`, `getSession`, `onAuthStateChange`, `signOut` 흐름을 마이 페이지와 연결했다.
- Supabase 환경변수가 없으면 인증 요청을 보내지 않고 설정 안내를 표시한다.
- 사용자가 입력한 ID는 소문자 ID로 정규화한 뒤 `VITE_AUTH_EMAIL_DOMAIN`을 붙인 내부 인증 이메일로 변환한다.
- Supabase 원문 인증 오류를 화면에 그대로 노출하지 않고, 중복 ID, 로그인 실패, 비밀번호 조건, 네트워크 오류를 한국어 안내 메시지로 변환한다.
- 중복 ID는 Supabase 응답 기반 안내를 먼저 적용했다.
- 로그인한 사용자 기록은 세션의 `userId`를 포함한 로컬 저장소 key로 분리한다. Supabase DB 저장은 이후 단계에서 연결한다.

### 2026-06-22

- FastAPI에 `GET /api/auth/user-id-availability`를 추가해 회원가입 전 ID 중복 확인을 수행한다.
- FastAPI에 `DELETE /api/auth/account`를 추가해 현재 로그인한 사용자의 Supabase Auth 계정 삭제를 요청한다.
- 회원 탈퇴는 2단계 확인 버튼으로 처리하고, 성공 시 이 기기의 사용자별 로컬 러닝 기록도 삭제한다.
- Supabase Auth Admin API가 필요한 작업은 서버에서만 수행한다.
- `SUPABASE_SERVICE_ROLE_KEY`는 `apps/api/.env`에만 저장하며, 브라우저에 노출되는 `apps/web/.env.local`에는 넣지 않는다.
- 클라이언트는 access token을 FastAPI에 전달하고, FastAPI가 토큰으로 현재 사용자를 확인한 뒤 service role key로 삭제를 수행한다.

## 완료 조건

- 로그인 없이도 로컬 기록 저장과 조회가 가능하다.
- 마이 페이지에서 로컬 프로필, 앱 설정, 위치 권한 상태를 확인할 수 있다.
- 인증 기능은 추후 확장안으로 문서화되어 현재 MVP 범위와 혼동되지 않는다.
