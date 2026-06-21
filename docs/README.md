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
| `data-sources/` | 외부 데이터 출처, 라이선스, 수집·정규화 방식 |
| `qa/` | 모바일 실기기, 배포 전 동작 확인 체크리스트 |
| `blog/` | 개발 과정을 블로그·포트폴리오 글로 옮기기 위한 초안 |

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

## Data Sources

- [`서울시 공원 음수대`](./data-sources/seoul-park-water-fountains.md)
- [`서울시 공중화장실`](./data-sources/seoul-public-restrooms.md)

## QA

- [`모바일 실기기 검증`](./qa/mobile-real-device-check.md)

## Blog Drafts

- [`카카오맵과 공공데이터로 러닝 편의시설 지도 만들기`](./blog/카카오맵과_공공데이터로_러닝_편의시설_지도_만들기.md)

## 문서 작성 규칙

- 구현 전에 문제, 선택 이유, 완료 조건을 먼저 적는다.
- 기술 선택에는 장점, 단점, 대안을 함께 기록한다.
- 실제 구현이 달라지면 문서도 같은 커밋에서 갱신한다.
- 완료 여부는 `TODO.md`에서 관리하고 상세 설명을 중복 작성하지 않는다.
