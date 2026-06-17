# Restroom Raw Data

공간데이터마켓에서 받은 서울시 공중화장실 원본 파일을 두는 로컬 전용 폴더다.

## Expected Files

- `seoul-public-restrooms.xlsx`: 실제 화장실 행 데이터 또는 원본 데이터 파일
- `seoul-public-restrooms/Toilet_seoul.dbf`: 실제 화장실 속성 행 데이터
- `seoul-public-restrooms/Toilet_seoul.shp`: 공간데이터 원본
- `seoul-public-restrooms.zip`: XLSX에 좌표가 없거나 검증이 필요할 때만 추가로 보관

## Git Policy

원본 XLSX/ZIP 파일은 용량, 라이선스, 갱신주기 문제 때문에 GitHub에 커밋하지 않는다.
이 폴더에서는 이 README만 추적한다.

## Current Note

2026-06-17에 확인한 `seoul-public-restrooms.xlsx`는 실제 시설 행 데이터가 아니라 컬럼 정의서였다.
실제 마커 연결에는 `TOILET_NM`, `LAT`, `LON`, 주소, 개방시간이 포함된 행 데이터 파일이 필요하다.

같은 날 추가된 `seoul-public-restrooms/Toilet_seoul.dbf`는 4,799건의 실제 화장실 행 데이터를 포함한다.
