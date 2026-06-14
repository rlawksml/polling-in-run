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

- [ ] 현재 위치 표시
- [ ] 주변 공공 화장실 표시
- [ ] 주변 공공 음수대 표시
- [ ] 러닝 시작 및 종료
- [ ] 러닝 메모 저장
- [ ] 러닝 기록 목록

## Roadmap

### Phase 1: Foundation

- [x] React + TypeScript + Vite 초기화
- [x] FastAPI 초기화 및 health check
- [x] 프론트엔드와 백엔드 개발 환경 구성

### Phase 2: Map and Public Data

- [x] 지도 API 선정
- [ ] 현재 위치 표시
- [ ] 공공 음수대·화장실 데이터 조사
- [ ] FastAPI 데이터 정규화 및 주변 시설 API

### Phase 3: Running Records

- [ ] Supabase 프로젝트 및 데이터 모델
- [ ] 러닝 시작·종료
- [ ] 기록과 메모 저장
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

React 앱과 FastAPI의 첫 수직 기능에 이어, Kakao Maps SDK 로더와 현재 위치의 로딩·허용·거부·오류 상태를 구현했습니다. Kakao Developers 웹 도메인 등록 후 실제 지도와 사용자 마커를 최종 확인하고 주변 편의시설 데이터를 연결합니다.

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

- Web: http://127.0.0.1:5173
- API health: http://127.0.0.1:8000/api/health
- API docs: http://127.0.0.1:8000/docs

## Verification

```bash
npm run test:web
npm run test:api
npm run lint:web
npm run build:web
```

## License

This project is licensed under the [MIT License](./LICENSE).
