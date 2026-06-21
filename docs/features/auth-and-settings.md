# 인증과 설정

## 해결하려는 문제

사용자별 러닝 기록을 분리하고 언어·권한 안내 같은 개인 설정을 관리해야 한다.

## 선택 방향

Supabase Auth로 인증을 처리하고 FastAPI는 전달받은 사용자 토큰과 권한을 검증한다.

MVP에서는 사용자가 입력하는 ID를 내부 인증 이메일로 변환해 Supabase email/password Auth에 연결한다.

```text
runner-id → runner-id@polling-in-run.local
```

이 방식은 화면에서는 ID/PW 경험을 유지하면서 Supabase의 기본 Auth API를 사용할 수 있게 한다. 단, 실제 이메일 인증과 비밀번호 찾기는 MVP 범위에서 제외한다.

## Supabase Auth를 선택한 이유

### 장점

- 인증 서버를 직접 구축하는 시간을 줄인다.
- PostgreSQL과 사용자 데이터를 연결하기 쉽다.
- 이메일과 소셜 로그인 확장이 가능하다.

### 단점

- Supabase의 인증 방식과 토큰 수명주기를 이해해야 한다.
- React와 FastAPI 양쪽에서 세션·권한 경계를 설계해야 한다.
- Supabase Auth의 기본 비밀번호 인증은 email/password 또는 phone/password 중심이라 순수 ID/PW는 별도 매핑 규칙이 필요하다.

## 구현 시점

현재 위치와 러닝 기록 흐름을 먼저 검증한다. 사용자별 기록 저장이 필요해지는 시점에 인증을 추가한다.

## 구현 기록

### 2026-06-21

- 마이 페이지에 ID/PW 로그인과 회원가입 화면 초안을 추가했다.
- ID 4자 이상, 비밀번호 8자 이상, 회원가입 비밀번호 확인 일치 여부를 검증한다.
- Supabase Auth 연결 전 단계이므로 비밀번호를 로컬에 저장하지 않는다.
- 비밀번호 찾기, 이메일 인증, 소셜 로그인은 MVP 범위에서 제외한다는 안내를 화면에 표시한다.
- `@supabase/supabase-js`를 추가하고 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 기반 클라이언트를 구성했다.
- `signUp`, `signInWithPassword`, `getSession`, `onAuthStateChange`, `signOut` 흐름을 마이 페이지와 연결했다.
- Supabase 환경변수가 없으면 인증 요청을 보내지 않고 설정 안내를 표시한다.
- 사용자가 입력한 ID는 소문자 ID로 정규화한 뒤 `VITE_AUTH_EMAIL_DOMAIN`을 붙인 내부 인증 이메일로 변환한다.

## 완료 조건

- 로그인 전후 사용자 경험이 명확하다.
- FastAPI가 인증되지 않은 기록 요청을 거부한다.
- 로그아웃 후 개인 기록이 화면에 남지 않는다.
