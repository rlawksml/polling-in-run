# 서울시 공원 음수대 데이터

## 원본

- 데이터셋: [서울시 공원음수대 정보 조회](https://data.seoul.go.kr/dataList/OA-20884/S/1/datasetView.do)
- 제공기관: 서울특별시 서울아리수본부
- Open API 서비스명: `TbViewGisArisu`
- 갱신주기: 매주 1회
- 확인한 데이터 수: 1,685건
- 라이선스: 공공누리 1유형, 출처표시 후 상업적 이용 및 변경 가능

## 활용 판단

Polling In Run의 음수대 핵심 데이터 소스로 사용한다.

API가 위도와 경도를 제공하므로 카카오맵 마커로 바로 변환할 수 있다. 하지만 인증키가
필요하고 API가 HTTP로 제공되어 HTTPS React 앱에서 직접 호출하면 Mixed Content 문제가
발생할 수 있다. 따라서 FastAPI가 서버에서 데이터를 가져와 정규화하고 캐시한다.

## 주요 원본 필드

| 원본 필드 | 의미 | 공통 모델 |
|---|---|---|
| `CN_ID` | 콘텐츠 ID | `source_id` |
| `CN_PARK_NM` | 공원명 | `name` |
| `LOTNO_ADDR` | 지번주소 | `address` |
| `ROAD_NM_ADDR` | 도로명주소 | `road_address` |
| `XCRD` | 경도 | `longitude` |
| `YCRD` | 위도 | `latitude` |
| 상세 필드 | 상세위치·사업소 등 | `details` |

## 호출 형태

```text
http://openapi.seoul.go.kr:8088/{KEY}/json/TbViewGisArisu/{START_INDEX}/{END_INDEX}/
```

- 한 번에 최대 1,000건을 요청할 수 있다.
- 전체 데이터는 최소 2회로 나눠 가져와야 한다.
- API 키는 `apps/api/.env`의 `SEOUL_OPEN_DATA_API_KEY`로 관리하고 GitHub에 올리지 않는다.

## 추천 수집 방식

```text
서울 Open API
→ FastAPI 수집 작업
→ 원본 필드 검증·정규화
→ 시설 저장소 캐시
→ /api/facilities?type=water&lat=...&lng=...
```

실시간으로 매 요청마다 서울 API를 호출하지 않는다. 원본 갱신주기가 주 1회이므로 하루
1회 이하로 동기화해도 충분하며, 장애 시 마지막 정상 데이터를 제공할 수 있어야 한다.

## 구현 상태

- `apps/api/.env`의 `SEOUL_OPEN_DATA_API_KEY`를 사용한다.
- 앱 시작 후 첫 시설 조회 시 서울 Open API를 호출하고 프로세스 메모리에 캐시한다.
- 전체 1,685건을 1,000건 단위로 나누어 수집한다.
- `XCRD`, `YCRD`를 검증하고 서울 범위 밖 좌표는 제외한다.
- 현재 위치와 반경이 전달되면 FastAPI가 거리 계산·필터·정렬 후 응답한다.

## 데이터 품질 확인

- `XCRD`, `YCRD`가 숫자인지 검증한다.
- 서울 범위를 벗어나는 좌표를 제외하거나 검토 대상으로 표시한다.
- 같은 `CN_ID`는 업데이트하고 중복 생성하지 않는다.
- 상세 필드명·값 구조는 정규화 전에 필요한 항목만 추출한다.
