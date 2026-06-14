# Polling In Run TODO

이 문서는 현재 개발 우선순위와 완료 조건을 관리한다. 장기 방향은
[`README.md`](./README.md), 화면과 기능의 상세 맥락은 [`docs/`](./docs/README.md)를 참고한다.

## 현재 목표

### M1. 지도와 현재 위치

- [x] 지도 제공자로 Kakao Maps 선택
- [x] Kakao Developers 앱 생성 및 JavaScript SDK 도메인 등록
- [x] `apps/web/.env.local`에 `VITE_KAKAO_MAP_KEY` 입력
- [x] 카카오맵 SDK 로더 구현
- [x] 홈 화면에 전체 화면 지도 표시
- [x] 현재 위치 권한 요청과 사용자 마커 구현
- [x] 위치 로딩·거부·오류·미지원 상태 처리
- [ ] 모바일 브라우저에서 실제 위치 확인

현재 확인 사항:

- `http://localhost:5173`과 `http://127.0.0.1:5173`의 SDK 요청과 실제 지도 렌더링을 확인했다.
- 브라우저 위치 권한이 꺼진 상태에서는 위치 안내와 재시도 UI가 표시된다.

완료 조건:

- 사용자가 앱을 열면 지도와 현재 위치를 확인할 수 있다.
- 위치 권한을 거부해도 앱 사용 방법을 안내받을 수 있다.
- API 키는 GitHub에 커밋되지 않는다.

관련 문서:

- [`홈 지도`](./docs/pages/home-map.md)
- [`카카오맵과 현재 위치`](./docs/features/kakao-map-and-location.md)

### M2. 주변 편의시설

- [x] 공공 화장실·음수대 데이터 출처 조사
- [x] 시설 데이터 공통 모델 초안 정의
- [ ] 샘플 시설 데이터와 FastAPI 정적 시설 API 구현
- [ ] 서울 열린데이터광장 API 키 발급 및 `apps/api/.env` 설정
- [ ] 서울 음수대 Open API 수집·정규화·캐시 구현
- [ ] 공간데이터마켓 화장실 데이터 다운로드 승인 및 원본 검증
- [ ] FastAPI 주변 시설 API 구현
- [x] 샘플 시설 API를 지도 종류별 마커로 표시
- [ ] 실제 원본 데이터를 지도 종류별 마커로 표시
- [ ] 밀집 지역 마커 클러스터링
- [ ] 시설 필터와 상세 정보 구현

완료 조건:

- 현재 위치 주변 시설을 종류별로 구분해 볼 수 있다.
- 외부 데이터 형식은 FastAPI 내부에서 공통 모델로 정규화된다.

관련 문서:

- [`주변 편의시설`](./docs/features/facility-search.md)

### M3. 러닝 기록

- [ ] 러닝 시작·일시정지·종료 상태 모델 정의
- [ ] 화면이 켜진 상태에서 이동 경로 추적 실험
- [ ] 거리와 시간 계산
- [ ] 러닝 결과 확인 화면 구현
- [ ] 기록과 메모 저장

완료 조건:

- 사용자가 러닝을 시작하고 종료한 뒤 거리, 시간, 메모를 저장할 수 있다.
- 모바일 웹 백그라운드 위치 추적 한계를 문서화한다.

관련 문서:

- [`러닝 진행`](./docs/pages/running.md)
- [`러닝 결과`](./docs/pages/running-result.md)
- [`러닝 추적`](./docs/features/run-tracking.md)
- [`기록 저장`](./docs/features/record-storage.md)

## 이후 목표

- [ ] 기록 목록과 상세 화면
- [ ] Supabase PostgreSQL 연결
- [ ] Supabase Auth
- [ ] PWA 설치 경험
- [ ] 접근성·성능·배포 점검
- [ ] Problem → Solution → Result 포트폴리오 회고

## 완료된 기반 작업

- [x] React + TypeScript + Vite 초기화
- [x] FastAPI 초기화
- [x] React에서 FastAPI health API 호출
- [x] 프론트엔드 테스트·린트·빌드 구성
- [x] 백엔드 테스트 구성
