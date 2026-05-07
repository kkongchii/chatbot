# pdf-chatbot Planning Document

> **Summary**: 근로기준법 PDF를 기반으로 사용자 질문에 답변하는 Node.js + SambaNova API 챗봇
>
> **Project**: chatbot
> **Version**: 0.3.0
> **Author**: kkongchii
> **Date**: 2026-05-07
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 근로기준법 문서를 직접 읽기 어려운 사용자가 원하는 정보를 빠르게 찾지 못한다 |
| **Solution** | 근로기준법 PDF를 서버에서 파싱하고 SambaNova API (Meta-Llama-3.3-70B-Instruct)로 자연어 질의응답하는 챗봇 제공 |
| **Function/UX Effect** | 채팅 UI에서 질문 입력 → 로딩 스피너 → 근거 있는 답변 수신, 오류 시 친절한 메시지 표시 |
| **Core Value** | 법률 문서 접근 장벽을 낮춰 누구나 근로기준법 내용을 대화하듯 이해할 수 있게 함 |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 근로기준법 PDF를 쉽게 검색·이해할 수 없는 문제 해결 |
| **WHO** | 근로기준법 내용을 빠르게 확인하고 싶은 일반 사용자 |
| **RISK** | SambaNova API 응답 지연, PDF 파싱 실패, Vercel 메모리 한도 초과 |
| **SUCCESS** | 질문 입력 → 근로기준법 기반 답변 수신 + Vercel 배포 URL에서 동작 확인 |
| **SCOPE** | 채팅 UI + 답변 생성 + 로딩/에러 UX + Vercel 배포 (대화 히스토리·파일 업로드 제외) |

---

## 1. Overview

### 1.1 Purpose

`docs/` 폴더의 근로기준법 PDF를 서버 시작 시 파싱하여 텍스트를 메모리에 보관한다. 사용자가 채팅 UI에서 질문을 보내면 `POST /api/chat`이 PDF 텍스트와 질문을 OpenAI API에 전달하고 답변을 반환한다.

### 1.2 Background

법률 문서는 방대하고 읽기 어렵다. 챗봇 인터페이스로 특정 조항이나 내용을 빠르게 찾아주면 실용적 가치가 높다. Node.js + Express + OpenAI API 조합은 빠른 MVP 구현에 적합하며, Vercel serverless 배포로 무료 호스팅이 가능하다.

### 1.3 Related Documents

- CLAUDE.md (프로젝트 구조 및 규칙)
- docs/근로기준법(법률)(제20520호)(20250223).pdf

---

## 2. Scope

### 2.1 In Scope

- [x] `server.js`: Express 서버, `POST /api/chat` 엔드포인트
- [x] PDF 파싱: `docs/근로기준법(법률)(제20520호)(20250223).pdf` 서버 시작 시 로드
- [x] OpenAI API 연동: `gpt-4o-mini` 모델 사용
- [x] `public/index.html`: 채팅 UI — 입력창 + 전송 버튼 + 메시지 목록
- [x] 로딩 스피너: API 응답 대기 중 표시
- [x] 에러 메시지: API 실패 / PDF 파싱 실패 시 사용자에게 친절한 오류 표시
- [x] `vercel.json`: Vercel serverless 배포 설정 + PDF 번들 포함

### 2.2 Out of Scope

- 사용자 인증/로그인
- 대화 히스토리 저장 (DB 없음, 단발성 질의응답)
- 사용자가 직접 PDF 업로드하는 기능
- 모바일 최적화 (기본 반응형 정도)
- 스트리밍 응답 (단순 응답 방식으로 MVP 구현)
- 여러 문서 선택/전환 기능

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `POST /api/chat`: `{ message }` 수신 → SambaNova API 호출 → `{ reply }` 응답 반환 | High | Done ✅ |
| FR-02 | 서버 시작 시 `docs/근로기준법(법률)(제20520호)(20250223).pdf` 파싱 → 텍스트 메모리 보관 | High | Done ✅ |
| FR-03 | SambaNova API system 메시지에 관련 조문 포함 (키워드 기반 추출), user 메시지에 사용자 질문 전달 | High | Done ✅ |
| FR-04 | `public/index.html`: 7섹션 랜딩 페이지 + 챗봇 UI (입력창 + 전송 버튼 + 메시지 목록) | High | Done ✅ |
| FR-05 | 전송 버튼 클릭/Enter 시 로딩 스피너 표시, 응답 수신 후 스피너 제거 | Medium | Done ✅ |
| FR-06 | API 실패 / PDF 파싱 실패 시 사용자에게 친절한 한국어 오류 메시지 표시 | Medium | Done ✅ |
| FR-07 | 정적 파일(`public/`) 서빙 (`express.static`) | Medium | Done ✅ |
| FR-08 | `vercel.json`으로 Express → serverless function 래핑 + PDF `includeFiles` 설정 | Medium | Done ✅ |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | OpenAI API 응답 포함 전체 응답 < 15초 | 브라우저 Network 탭 |
| Security | `SAMBANOVA_API_KEY` 서버사이드만 참조, 프론트엔드 코드에 노출 금지 | 코드 리뷰, 빌드 결과물 확인 |
| Reliability | PDF 파싱 실패 시 서버 크래시 없이 JSON 에러 응답 반환 | 수동 테스트 |
| UX | 로딩 중 입력 비활성화, 응답 후 재활성화 | 브라우저 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] `node server.js` 실행 시 포트 3000에서 정상 동작
- [x] 브라우저에서 질문 입력 → 로딩 스피너 → 근로기준법 기반 답변 수신
- [x] API 실패 시 "답변을 가져오는 데 실패했습니다." 등 한국어 오류 표시
- [ ] `vercel dev` 로컬 테스트 통과 (미확인)
- [x] Vercel 배포 후 공개 URL에서 정상 동작 확인 — https://chatbot-six-kohl-41.vercel.app

### 4.2 Quality Criteria

- [x] `.env` 파일 Git 커밋 안 됨 (`.gitignore` 확인)
- [x] `SAMBANOVA_API_KEY` 프론트엔드 코드(`public/`)에 없음
- [x] PDF 파싱 서버사이드(`server.js`)에서만 처리됨
- [x] 로딩 중 사용자가 중복 전송 불가 (버튼/입력 비활성화)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| PDF 파일이 크거나 `pdf-parse` 라이브러리 이슈 | High | Medium | 파싱 실패 시 try/catch → 에러 로그 + fallback 메시지 ✅ 적용됨 |
| SambaNova API 응답 지연 (>15초) | Medium | Low | 로딩 스피너 UI ✅ 적용됨 |
| Vercel serverless 함수 메모리 한도 (PDF 전체 로드) | Medium | Medium | PDF 텍스트 앞 50,000자 트리밍 ✅ 적용됨 |
| `SAMBANOVA_API_KEY` 미설정 시 배포 실패 | High | Low | Vercel 대시보드 환경변수 설정 완료 ✅ |
| PDF 파일명 특수문자로 인한 경로 문제 | Low | Low | `path.join(__dirname, 'docs', ...)` 사용 ✅ 적용됨 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `server.js` | 새 파일 | Express 진입점: PDF 파싱 + OpenAI API 호출 + 라우팅 |
| `public/index.html` | 새 파일 | 채팅 UI: 입력창 + 로딩 스피너 + 메시지 목록 |
| `vercel.json` | 새 파일 | Vercel serverless 래핑 + PDF includeFiles |
| `package.json` | 새 파일 또는 수정 | express, pdf-parse, openai 의존성 |
| `.gitignore` | 수정 | .env 제외 확인 |

### 6.2 Current Consumers

현재 코드가 없는 신규 프로젝트이므로 기존 소비자 없음.

### 6.3 Verification

- [ ] PDF 파일 경로 `docs/근로기준법(법률)(제20520호)(20250223).pdf` 정확히 참조
- [ ] `.env` 파일 `.gitignore`에 포함됨
- [ ] `vercel.json`의 `includeFiles`에 `docs/**` 포함

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 구조, 빠른 MVP | 정적 사이트, 소형 챗봇 | ☑ |
| **Dynamic** | Feature 모듈, BaaS 연동 | 인증·DB 있는 웹앱 | ☐ |
| **Enterprise** | 계층 분리, DI, 마이크로서비스 | 대용량 시스템 | ☐ |

> MVP이므로 Starter 수준의 단순 구조 채택. 파일 2개(`server.js`, `public/index.html`)로 전체 기능 구현.

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Server | Express / Fastify | Express | 가장 보편적, Vercel 래핑 예제 다수 |
| PDF 파싱 | pdf-parse / pdfjs-dist | pdf-parse | 서버사이드 Node.js에 적합, 간단한 API |
| OpenAI API | openai SDK / fetch | openai | 공식 SDK, 타입 지원 |
| Frontend | React / 순수 HTML | 순수 HTML/CSS/JS | 빌드 불필요, MVP 빠른 구현 |
| 배포 | Vercel / Netlify | Vercel | 무료, serverless function, 간단 설정 |
| PDF 컨텍스트 | 전체 / 앞 N자 | 앞 50,000자 트리밍 | Vercel 메모리 한도 대응 |

### 7.3 File Structure

```
chatbot/
├── server.js          # Express 서버 (PDF 파싱 + OpenAI API + 라우팅)
├── public/
│   └── index.html     # 채팅 UI (HTML + CSS + JS 인라인)
├── docs/
│   └── 근로기준법(법률)(제20520호)(20250223).pdf
├── package.json
├── vercel.json
├── .env               # 환경변수 (Git 제외)
└── .gitignore
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`에 코딩 규칙 있음 (주석 한국어, camelCase)
- [ ] ESLint 미설정 (MVP이므로 생략)
- [ ] TypeScript 미사용 (순수 JS)

### 8.2 Conventions to Define/Verify

| Category | Current State | Convention | Priority |
|----------|---------------|------------|:--------:|
| 주석 언어 | CLAUDE.md에 정의됨 | 한국어 주석 | High |
| 변수명 | CLAUDE.md에 정의됨 | camelCase | High |
| 에러 처리 | 미정의 | try/catch + `{ error: '...' }` JSON 응답 | Medium |
| 로딩 UX | 미정의 | 전송 시 버튼·입력 `disabled`, 응답 후 `enabled` | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | Status |
|----------|---------|-------|--------|
| `SAMBANOVA_API_KEY` | SambaNova API 인증 | Server only | ☑ .env + Vercel 설정 완료 |
| `HF_MODEL` | 사용 모델명 (기본: Meta-Llama-3.3-70B-Instruct) | Server only | ☑ .env + Vercel 설정 완료 |
| `PORT` | 서버 포트 (기본 3000) | Server only | ☑ .env에 있음 |

---

## 9. Next Steps

1. [ ] `/pdca design pdf-chatbot` — 설계 문서 작성
2. [ ] `/pdca do pdf-chatbot` — 구현 시작
3. [ ] `vercel dev` 로컬 테스트
4. [ ] Vercel 배포 후 `/pdca analyze pdf-chatbot` — 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-07 | Initial draft | kkongchii |
| 0.2 | 2026-05-07 | 사용자 확인 후 재작성: 로딩/에러 UX 추가, 대화 히스토리 제외 명시, PDF 컨텍스트 트리밍 전략 추가 | kkongchii |
| 0.3 | 2026-05-07 | API 변경: Claude API → OpenAI API (gpt-4o-mini), ANTHROPIC_API_KEY → OPENAI_API_KEY | kkongchii |
| 0.3.0 | 2026-05-07 | PDCA Check 반영: OpenAI → SambaNova (Meta-Llama-3.3-70B-Instruct), FR 상태 업데이트, Success Criteria 체크 | kkongchii |
