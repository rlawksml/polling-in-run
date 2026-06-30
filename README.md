# Polling In Run

> 러닝 전후와 러닝 중, 주변 공공 음수대와 화장실을 빠르게 찾고 러닝 기록을 남기는 모바일 중심 웹앱

[![Status](https://img.shields.io/badge/status-in%20development-2563eb)](#roadmap)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-3178c6)](#tech-stack)
[![Architecture](https://img.shields.io/badge/architecture-local--first%20iPhone%20prototype-009688)](#architecture)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## Overview

Polling In Run은 러닝을 하며 직접 겪은 불편에서 시작한 토이프로젝트입니다.

러닝 중 목이 마르거나 화장실이 필요할 때, 주변 공공시설 정보를 빠르게 찾기 어려웠습니다. Polling In Run은 현재 위치를 중심으로 공공 음수대와 화장실을 보여주고, 러닝 시작부터 종료 후 기록까지 이어지는 경험을 제공합니다.

이 프로젝트는 5년 차 프론트엔드 개발자가 기존 프론트엔드·퍼블리싱·디자인 경험을 바탕으로 AI와 협업하며 제품 판단, 모바일 UX, 위치 기반 기능을 검증하는 과정이기도 합니다.

## Problem

- 러닝 전후와 러닝 중 주변 음수대 및 화장실을 찾기 어렵습니다.
- 기존 러닝 앱은 러닝 기록에 집중하며 공공 편의시설 정보는 부족합니다.
- 공공데이터는 존재하지만 러너가 사용하기 편한 형태로 제공되지 않습니다.

## Solution

- 현재 위치 기반 지도
- 주변 공공 음수대 및 화장실 표시
- 러닝 시작과 종료
- 러닝 메모 및 기록 저장
- iPhone 중심 local-first 프로토타입

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
[TODO.md](./TODO.md), 지금까지의 진행 요약은 [현재 진행 정리](./docs/project-status.md),
페이지·기능별 구현 판단은 [docs/](./docs/README.md)에서 확인할 수 있습니다.

## Architecture

```text
Local-first iPhone prototype
├─ React + Capacitor
├─ Local facility data
├─ Local running records
├─ Native-friendly map strategy
└─ Optional backend expansion
   ├─ FastAPI public data normalizer
   └─ Supabase Auth/PostgreSQL
```

초기 목표는 서버 운영 비용과 복잡도를 줄이는 것입니다. 핵심 기능은 iPhone 안에서 가능한 한 로컬 데이터와 로컬 저장소로 검증하고, 서버는 추후 확장 옵션으로 둡니다.

- **React + Capacitor**: 지도 중심 사용자 경험과 iPhone 앱 프로토타입
- **Local data**: 정규화된 음수대·화장실 JSON과 러닝 기록 저장
- **Map strategy**: Kakao Maps JavaScript SDK 한계를 확인했으며 iPhone 앱은 Apple MapKit native를 우선 검토
- **FastAPI/Supabase**: 공공데이터 갱신, 계정, 기기 간 동기화가 필요해지는 시점의 확장안

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Server State | TanStack Query |
| Data Visualization | D3 |
| Optional Backend API | Python, FastAPI |
| Optional Database | Supabase PostgreSQL |
| Optional Authentication | Supabase Auth |
| PWA | Vite PWA Plugin |
| iOS App Preview | Capacitor |
| Map | Kakao Maps JavaScript API, Apple MapKit native 검토 |
| Design AI | Google Stitch, DESIGN.md |
| AI Collaboration | Codex, Claude |

## Why This Stack?

- React와 TypeScript로 기존 프론트엔드 역량을 명확히 보여줍니다.
- 로컬 우선 구조로 서버 운영 리소스를 줄이고 핵심 사용자 흐름을 먼저 검증합니다.
- FastAPI와 Supabase는 지금 당장 필수 기능이 아니라, 공공데이터 자동 갱신과 멀티 디바이스 동기화가 필요해질 때 확장합니다.
- iPhone 실기기에서 안정적으로 동작하는 지도 전략을 우선합니다.

## MVP Scope

- [x] 현재 위치 표시
- [x] 지도 컨트롤
- [x] 실제 서울 공원 음수대 표시
- [x] 실제 서울 공중화장실 표시
- [x] 시설 데이터 local-first JSON 생성과 로컬 조회
- [x] 시설 필터와 상세 카드
- [x] 카카오맵 길찾기 연결
- [x] 현재 지도 영역 기반 시설 조회
- [x] 지도 이동 후 현재 영역 재검색
- [x] 마커 클러스터링
- [x] 러닝 시작·일시정지·종료 상태 모델
- [x] 화면이 켜진 상태에서 러닝 위치 포인트 수집
- [x] GPS 기반 러닝 거리 계산
- [x] 러닝 결과 확인 화면
- [x] 러닝 메모 저장
- [x] 로컬 러닝 기록 저장 초안
- [x] 러닝 기록 목록과 상세 초안
- [x] 기록 페이지 필터·정렬·경로 미리보기 1차 구현
- [x] 마이 페이지 사용자 정보·설정 화면 초안
- [x] 마이 페이지 러닝 대시보드 1차 구현
- [x] 로그인/회원가입 기능은 추후 확장 범위로 축소

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

- [x] 러닝 시작·일시정지·종료 상태 모델
- [x] 화면이 켜진 상태에서 위치 추적
- [x] 거리와 페이스 계산
- [x] 러닝 결과 확인 화면
- [x] 기록과 메모 저장
- [x] 기록 목록 및 상세
- [x] 기록 필터, 정렬, 경로 미리보기

### Phase 4: Local-first Productization

- [x] 마이 페이지 화면 초안
- [x] 사용자 정보와 앱 설정 중심으로 마이 페이지 정리
- [x] 마이 페이지 러닝 대시보드 1차 구현: 목표 설정, 달력, D3 그래프
- [x] 시설 데이터 local-first JSON 구조 정리
- [ ] 로컬 러닝 기록 저장 구조 정리
- [x] 지도 전략 재검토: Kakao JS SDK 한계, Apple MapKit/Google Maps/OSM 비교
- [ ] PWA
- [ ] 테스트와 접근성 점검
- [ ] iPhone local-first 프로토타입 검증
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

현재 웹 MVP는 Kakao Maps 기반 홈 화면에서 현재 위치, 지도 컨트롤, 현재 영역 재검색, 실제 서울 공원 음수대 마커, 실제 서울 공중화장실 마커를 표시합니다. FastAPI는 서울 열린데이터광장 음수대 데이터와 공간데이터마켓 화장실 DBF 원본을 공통 `Facility` 모델로 정규화하고, `apps/web/public/data/facilities.json`으로 export합니다. 프론트는 이 로컬 JSON을 먼저 읽어 현재 지도 영역과 현재 위치 반경 안의 시설을 거리순으로 표시합니다. 시설이 밀집된 영역에서는 카카오맵 MarkerClusterer로 가까운 마커를 묶어 표시합니다.

마커를 선택하면 시설명, 주소, 거리 정보를 확인할 수 있으며 외부 지도 길찾기로 이동할 수 있습니다. 러닝 프로세스는 `idle → running → paused → finished` 상태 모델, 화면이 켜진 상태의 위치 포인트 수집, GPS 기반 거리·페이스 계산, 러닝 결과 확인 화면, 로컬 기록·메모 저장과 기록 목록/상세·삭제까지 구현했습니다. 기록 페이지는 메모 있는 러닝 필터, 월별 필터, 거리·시간·페이스 정렬, 경로 미리보기를 제공합니다. iPhone 앱에서는 기록 상세의 저장 경로를 Apple MapKit snapshot 이미지 위에 GPS 포인트 기반 경로로 그려 고정 미리보기처럼 표시하고, 웹에서는 SVG fallback을 사용합니다. 이후 방향은 서버 기능을 더 늘리기보다, 내 iPhone에서 안정적으로 돌아가는 local-first 프로토타입으로 범위를 줄이는 것입니다. 마이 페이지는 로그인보다 로컬 러닝 대시보드에 집중하며, 총 거리, 횟수, 목표 진행률, D3 기반 월간 거리·목표 비교 그래프, 러닝 날짜 달력을 보여줍니다. 인증·동기화는 추후 확장으로 분리합니다.

## Local Development

Polling In Run은 현재 local-first iPhone prototype을 우선합니다. 웹 MVP는 Vite 개발 서버에서 확인하고, iPhone 앱 검증은 Capacitor로 진행합니다.

### Web

```bash
npm --prefix apps/web install
npm run dev:web
```

- Web: http://localhost:5173

### Optional API

공공데이터를 FastAPI로 다시 수집·정규화하거나 API 경계를 실험할 때만 실행합니다.

```bash
python3 -m venv apps/api/.venv
apps/api/.venv/bin/pip install -r apps/api/requirements.txt
npm run dev:api
```

- API health: http://127.0.0.1:8000/api/health
- API docs: http://127.0.0.1:8000/docs

시설 JSON을 갱신할 때는 아래 명령을 실행합니다.

```bash
npm run export:facilities
```

### Environment

- `VITE_KAKAO_MAP_KEY`: Kakao Maps JavaScript SDK key
- `VITE_API_BASE_URL`: Capacitor 또는 배포 환경에서 FastAPI origin을 직접 지정할 때만 사용
- Supabase Auth 관련 값은 현재 MVP 필수 값이 아니며, 인증 확장 실험을 다시 켤 때만 사용

### iPhone Preview

```bash
npm run build:web
cd apps/web
npx cap sync ios
npx cap open ios
```

Kakao Maps JavaScript SDK는 등록된 Web 플랫폼 도메인에서만 동작합니다. Capacitor 정적 앱의 `capacitor://localhost` origin에서는 도메인 검증 문제가 생길 수 있어 iPhone 앱은 Apple MapKit native를 우선 검토합니다.

모바일 실기기에서 Vite dev server를 직접 볼 때는 iPhone과 Mac이 같은 네트워크에 있어야 하며, 내부 IP 주소를 Kakao Developers Web 플랫폼 도메인에 임시 등록해야 합니다.

모바일 브라우저에서 실제 위치, 시설 조회, 러닝 저장, 기록 조회를 확인할 때는
[`모바일 실기기 검증`](./docs/qa/mobile-real-device-check.md) 체크리스트를 사용합니다.

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
