# Polling In Run

> 러닝 전후와 러닝 중, 주변 공공 음수대와 화장실을 빠르게 찾고 러닝 기록을 남기는 모바일 중심 웹앱

[![Status](https://img.shields.io/badge/status-in%20development-2563eb)](#roadmap)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-3178c6)](#tech-stack)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%2B%20Python-009688)](#tech-stack)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## Overview

Polling In Run은 러닝을 하며 직접 겪은 불편에서 시작한 토이프로젝트입니다.

러닝 중 목이 마르거나 화장실이 필요할 때, 주변 공공시설 정보를 빠르게 찾기 어려웠습니다. Polling In Run은 현재 위치를 중심으로 공공 음수대와 화장실을 보여주고, 러닝 시작부터 종료 후 기록까지 이어지는 경험을 제공합니다.

이 프로젝트는 5년 차 프론트엔드 개발자가 기존 프론트엔드·퍼블리싱·디자인 경험을 바탕으로 AI와 협업하며 풀스택 제품을 완성하는 과정이기도 합니다.

## Problem

- 러닝 전후와 러닝 중 주변 음수대 및 화장실을 찾기 어렵습니다.
- 기존 러닝 앱은 러닝 기록에 집중하며 공공 편의시설 정보는 부족합니다.
- 공공데이터는 존재하지만 러너가 사용하기 편한 형태로 제공되지 않습니다.

## Solution

- 현재 위치 기반 지도
- 주변 공공 음수대 및 화장실 표시
- 러닝 시작과 종료
- 러닝 메모 및 기록 저장
- 모바일 우선 PWA

## User Flow

```text
앱 실행
→ 현재 위치와 주변 시설 확인
→ 러닝 시작
→ 러닝 진행
→ 러닝 종료
→ 메모 및 기록 저장
→ 이전 기록 조회
```

## Design Principles

- Mobile First
- 지도 중심 UI
- 최소한의 화면 깊이
- 러닝 중에도 누르기 쉬운 큰 버튼
- 현재 위치와 주변 시설을 우선하는 정보 구조
- 한국어 및 영어 지원 고려

상세한 화면 정의와 시각 원칙은 [DESIGN.md](./DESIGN.md), 현재 우선순위는
[TODO.md](./TODO.md), 페이지·기능별 구현 판단은 [docs/](./docs/README.md)에서 확인할 수 있습니다.

## Architecture

```text
React PWA
├─ Supabase Auth
└─ FastAPI
   ├─ Supabase PostgreSQL
   ├─ Supabase Storage
   └─ Public Data APIs
```

Supabase와 FastAPI 중 하나만 선택하지 않고 역할을 분리합니다.

- **Supabase**: PostgreSQL, 인증, 이미지 스토리지
- **FastAPI**: 공공데이터 정규화, 주변 시설 검색, 러닝 기록 규칙, 권한 검증
- **React**: 지도 중심 사용자 경험과 PWA

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Server State | TanStack Query |
| Backend API | Python, FastAPI |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| PWA | Vite PWA Plugin |
| Map | Kakao Maps JavaScript API |
| Design AI | Google Stitch, DESIGN.md |
| AI Collaboration | Codex, Claude |

## Why This Stack?

- React와 TypeScript로 기존 프론트엔드 역량을 명확히 보여줍니다.
- FastAPI와 Python으로 API 설계와 백엔드 경계를 학습합니다.
- Supabase로 인증·DB·스토리지 구축 시간을 줄이면서 PostgreSQL을 활용합니다.
- FastAPI를 단순 프록시가 아닌 외부 데이터 통합과 비즈니스 규칙 계층으로 사용합니다.

## MVP Scope

- [x] 현재 위치 표시
- [x] 지도 컨트롤
- [x] 실제 서울 공원 음수대 표시
- [x] 실제 서울 공중화장실 표시
- [x] 시설 필터와 상세 카드
- [x] 카카오맵 길찾기 연결
- [x] 현재 지도 영역 기반 시설 조회
- [x] 마커 클러스터링
- [x] 러닝 시작·일시정지·종료 상태 모델
- [x] 화면이 켜진 상태에서 러닝 위치 포인트 수집
- [x] GPS 기반 러닝 거리 계산
- [x] 러닝 결과 확인 화면
- [x] 러닝 메모 저장
- [x] 로컬 러닝 기록 저장 초안
- [ ] 러닝 기록 목록

## Roadmap

### Phase 1: Foundation

- [x] React + TypeScript + Vite 초기화
- [x] FastAPI 초기화 및 health check
- [x] 프론트엔드와 백엔드 개발 환경 구성

### Phase 2: Map and Public Data

- [x] 지도 API 선정
- [x] 현재 위치 표시
- [x] 공공 음수대·화장실 데이터 조사
- [x] FastAPI 데이터 정규화 및 주변 시설 API
- [x] 서울 공원 음수대 Open API 연결
- [x] 마커 상세 카드와 카카오맵 길찾기 연결
- [x] 화장실 DBF 원본 검증 및 실제 데이터 연결
- [x] 지도 영역 기반 시설 조회
- [x] 마커 클러스터링

### Phase 3: Running Records

- [ ] Supabase 프로젝트 및 데이터 모델
- [x] 러닝 시작·일시정지·종료 상태 모델
- [x] 화면이 켜진 상태에서 위치 추적
- [x] 거리와 페이스 계산
- [x] 러닝 결과 확인 화면
- [x] 기록과 메모 저장
- [ ] 기록 목록 및 상세

### Phase 4: Productization

- [ ] Supabase Auth
- [ ] PWA
- [ ] 테스트와 접근성 점검
- [ ] 프론트엔드 및 백엔드 배포
- [ ] Problem → Solution → Result 회고

## AI Collaboration

이 프로젝트에서는 AI가 코드를 대신 작성했다는 사실보다, AI와 협업하며 내린 판단과 검증 과정을 기록합니다.

- Codex와 Claude를 활용한 기획 및 개발
- Google Stitch와 `DESIGN.md`를 활용한 UI 시각화
- AI가 생성한 코드와 설계의 동작 원리 및 위험 검증
- 시행착오와 기술 결정을 LLM Wiki와 Velog에 기록

## Project Journal

- [Part 1: 풀스택 개자이너가 되 feat.AI](https://velog.io/@rlawksml/토이-프로젝트-러닝-웹앱-만들기-폴링-인-런-기획)
- [Part 2: 풀스택 개자이너가 되 feat.UIUX](https://velog.io/@rlawksml/풀스택-개자이너가-되-feat.UIUX-토이프로젝트-Polling-In-Run-part-2)
- [Part 3: 풀스택 개자이너가 되 feat.Design AI](https://velog.io/@rlawksml/풀스택-개자이너가-되-feat.Design-AI-토이프로젝트-Polling-In-Run-part-3)

## Current Status

Kakao Maps 기반 홈 화면에서 현재 위치, 지도 컨트롤, 실제 서울 공원 음수대 마커, 실제 서울 공중화장실 마커를 표시합니다. FastAPI는 서울 열린데이터광장 음수대 데이터와 공간데이터마켓 화장실 DBF 원본을 공통 `Facility` 모델로 정규화하고, 현재 지도 영역과 현재 위치 반경 안의 시설을 거리순으로 반환합니다. 시설이 밀집된 영역에서는 카카오맵 MarkerClusterer로 가까운 마커를 묶어 표시합니다.

마커를 선택하면 시설명, 주소, 거리 정보를 확인할 수 있으며 카카오맵 길찾기로 이동할 수 있습니다. 러닝 프로세스는 `idle → running → paused → finished` 상태 모델, 화면이 켜진 상태의 위치 포인트 수집, GPS 기반 거리·페이스 계산, 러닝 결과 확인 화면, 로컬 기록·메모 저장 초안까지 구현했습니다. 다음 큰 작업은 모바일 실제 위치 검증과 기록 목록/상세 화면입니다.

## Local Development

```bash
# API
python3 -m venv apps/api/.venv
apps/api/.venv/bin/pip install -r apps/api/requirements.txt
npm run dev:api

# Web (새 터미널)
npm --prefix apps/web install
npm run dev:web
```

- Web: http://localhost:5173
- API health: http://127.0.0.1:8000/api/health
- API docs: http://127.0.0.1:8000/docs

Kakao Maps JavaScript SDK는 등록된 Web 플랫폼 도메인에서만 동작합니다. 로컬 개발은 `http://localhost:5173`을 기준으로 확인하고, 모바일 실기기에서 내부 IP로 접속하려면 해당 IP 주소를 Kakao Developers에 추가 등록해야 합니다.

## Documentation Maintenance

기능 추가, 삭제, 기술 선택 변경이 생기면 코드와 함께 문서를 갱신합니다.

- 프로젝트 소개와 현재 상태가 바뀌면 이 `README.md`를 갱신합니다.
- 작업 우선순위와 완료 여부는 [`TODO.md`](./TODO.md)에 반영합니다.
- 화면·기능별 판단은 [`docs/`](./docs/README.md)에 기록합니다.
- 블로그나 포트폴리오 글감은 [`docs/blog/`](./docs/blog/README.md)에 초안으로 남깁니다.

## Verification

```bash
npm run test:web
npm run test:api
npm run lint:web
npm run build:web
```

## License

This project is licensed under the [MIT License](./LICENSE).
