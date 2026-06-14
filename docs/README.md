# Polling In Run 개발 문서

이 폴더는 구현 과정에서 판단 근거와 완료 조건을 잃지 않기 위한 문서 모음이다.

## 문서 역할

| 문서 | 역할 |
|---|---|
| [`../README.md`](../README.md) | 프로젝트 소개, 기술 스택, 실행 방법 |
| [`../DESIGN.md`](../DESIGN.md) | 제품 디자인 원칙과 전체 화면 정의 |
| [`../TODO.md`](../TODO.md) | 현재 우선순위와 작업 체크리스트 |
| `pages/` | 사용자가 보는 화면별 목적과 상태 |
| `features/` | 여러 화면을 가로지르는 기능과 기술 결정 |

## Pages

- [`홈 지도`](./pages/home-map.md)
- [`러닝 진행`](./pages/running.md)
- [`러닝 결과`](./pages/running-result.md)
- [`기록`](./pages/records.md)
- [`마이 페이지`](./pages/my-page.md)

## Features

- [`카카오맵과 현재 위치`](./features/kakao-map-and-location.md)
- [`주변 편의시설`](./features/facility-search.md)
- [`러닝 추적`](./features/run-tracking.md)
- [`기록 저장`](./features/record-storage.md)
- [`인증과 설정`](./features/auth-and-settings.md)

## 문서 작성 규칙

- 구현 전에 문제, 선택 이유, 완료 조건을 먼저 적는다.
- 기술 선택에는 장점, 단점, 대안을 함께 기록한다.
- 실제 구현이 달라지면 문서도 같은 커밋에서 갱신한다.
- 완료 여부는 `TODO.md`에서 관리하고 상세 설명을 중복 작성하지 않는다.
