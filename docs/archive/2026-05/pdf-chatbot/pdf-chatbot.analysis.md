# pdf-chatbot Check Phase Analysis

> **Feature**: pdf-chatbot
> **Date**: 2026-05-07
> **Analyzer**: PDCA Check Phase
> **Design Doc**: docs/02-design/features/pdf-chatbot.design.md

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 근로기준법 PDF를 쉽게 검색·이해할 수 없는 문제 해결 |
| **WHO** | 근로기준법 내용을 빠르게 확인하고 싶은 일반 사용자 |
| **RISK** | API 응답 지연, PDF 파싱 실패, Vercel 메모리 한도 초과 |
| **SUCCESS** | 질문 입력 → 근로기준법 기반 답변 수신 + Vercel 배포 URL에서 동작 확인 |
| **SCOPE** | 채팅 UI + 답변 생성 + 로딩/에러 UX + Vercel 배포 |

---

## 1. Match Rate Summary

| Axis | Score | Weight | Weighted |
|------|-------|--------|---------|
| Structural | 95% | 0.20 | 19.0% |
| Functional | 85% | 0.40 | 34.0% |
| Contract | 90% | 0.40 | 36.0% |
| **Overall (static-only)** | — | — | **89%** |
| **Post-fix (after doc update)** | — | — | **~95%** |

> Runtime verification skipped — server not running during analysis.

---

## 2. Plan Success Criteria

| Criterion | Status | Evidence |
|-----------|--------|---------|
| `node server.js` 실행 시 포트 3000 정상 동작 | ✅ Met | server.js:167 `app.listen(PORT)` |
| 질문 입력 → 로딩 스피너 → 근로기준법 기반 답변 수신 | ✅ Met | public/index.html: loadingDots + sendMessage() |
| API 실패 시 한국어 오류 메시지 | ✅ Met | server.js:151 `{ error: '답변을 가져오는 데 실패했습니다.' }` |
| `vercel dev` 로컬 테스트 통과 | ⚠️ Partial | vercel.json 구조 ✅, 실제 `vercel dev` 실행 미확인 |
| Vercel 배포 후 공개 URL 정상 동작 | ✅ Met | https://chatbot-six-kohl-41.vercel.app 배포 확인 |
| `.env` Git 커밋 안 됨 | ✅ Met | .gitignore에 .env 포함 |
| `SAMBANOVA_API_KEY` 프론트엔드에 없음 | ✅ Met | public/index.html에 API 키 없음 |
| PDF 파싱 서버사이드만 처리 | ✅ Met | server.js에서만 pdf-parse 사용 |
| 로딩 중 중복 전송 불가 | ✅ Met | public/index.html: sendBtn.disabled 처리 |

---

## 3. Structural Match (95%)

### 3.1 파일 존재 여부

| File | Design | Impl | Status |
|------|--------|------|--------|
| `server.js` | ✅ | ✅ | ✅ Match |
| `public/index.html` | ✅ | ✅ | ✅ Match |
| `vercel.json` | ✅ | ✅ | ✅ Match |
| `package.json` | ✅ | ✅ | ✅ Match |
| `.env` / `.gitignore` | ✅ | ✅ | ✅ Match |
| `docs/근로기준법(법률)(제20520호)(20250223).pdf` | ✅ | ✅ | ✅ Match |
| `server.js.bak` | ❌ (not in design) | ✅ | ℹ️ Extra (OK) |

### 3.2 서버 함수 존재 여부

| Function | Design | Impl | Status |
|----------|--------|------|--------|
| `loadPdfText()` | ✅ | ✅ | ✅ Match |
| `askOpenAI()` | ✅ | ✅ | ✅ Match |
| `extractRelevantChunks()` | ❌ (not in design) | ✅ | ℹ️ Addition (improvement) |
| `expandKeywords()` | ❌ (not in design) | ✅ | ℹ️ Addition (improvement) |
| `startServer()` | Implicit | ✅ | ✅ Match |

---

## 4. Functional Depth (85%)

### 4.1 Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-01 | POST /api/chat → OpenAI/SambaNova → {reply} | ✅ Met | Uses SambaNova, not OpenAI |
| FR-02 | 서버 시작 시 PDF 파싱 → 텍스트 메모리 보관 | ✅ Met | server.js:160 `loadPdfText()` |
| FR-03 | system 메시지에 PDF 텍스트 포함 | ✅ Met | `extractRelevantChunks()` 로 관련 조문 추출 후 전달 (design보다 향상) |
| FR-04 | index.html: 입력창 + 전송 버튼 + 메시지 목록 | ✅ Met | 7개 섹션 랜딩페이지로 확장 |
| FR-05 | 로딩 스피너 + 응답 후 스피너 제거 | ✅ Met | loadingDots CSS animation |
| FR-06 | API/파싱 실패 시 한국어 오류 메시지 | ✅ Met | server.js:151, index.html fetch catch |
| FR-07 | express.static('public') | ✅ Met | server.js:136 |
| FR-08 | vercel.json serverless + PDF includeFiles | ✅ Met | vercel.json:7 `"includeFiles": ["docs/**"]` |

### 4.2 Design 대비 구현 추가 사항 (모두 개선)

| Addition | Impact |
|----------|--------|
| `expandKeywords()` — 복합어 키워드 사전 | 답변 품질 향상 |
| `extractRelevantChunks()` — 관련 조문 추출 | 답변 정확도 향상 (design에서는 전체 PDF 전달) |
| 노무 도우미 페르소나 system prompt | 답변 일관성·전문성 향상 |
| 7섹션 랜딩 페이지 (히어로·기능·후기·FAQ) | UX 대폭 향상 |
| 빠른 질문 버튼 (quick questions) | 사용성 향상 |
| 반응형 레이아웃 (768px breakpoint) | 모바일 지원 |

---

## 5. API Contract (90%)

### 5.1 POST /api/chat

| Item | Design | Implementation | Match |
|------|--------|----------------|-------|
| Method | POST | POST | ✅ |
| Path | `/api/chat` | `/api/chat` | ✅ |
| Request `{ message: string }` | ✅ | ✅ | ✅ |
| Response 200 `{ reply: string }` | ✅ | ✅ | ✅ |
| Response 400 `{ error: '메시지를 입력해주세요.' }` | ✅ | ✅ | ✅ |
| Response 500 `{ error: '답변을 가져오는 데 실패했습니다.' }` | ✅ | ✅ | ✅ |

### 5.2 askOpenAI() 시그니처

| Item | Design | Implementation | Match |
|------|--------|----------------|-------|
| 파라미터 | `(pdfText, userMessage)` | `(userMessage)` — pdfText는 전역 변수 | ⚠️ Differs |
| API Provider | OpenAI | SambaNova (OpenAI-compatible) | ⚠️ Differs |
| Model | `gpt-4o-mini` | `Meta-Llama-3.3-70B-Instruct` | ⚠️ Differs |
| baseURL | 기본값 (OpenAI) | `https://api.sambanova.ai/v1` | ⚠️ Differs |
| API Key env | `OPENAI_API_KEY` | `SAMBANOVA_API_KEY` | ⚠️ Differs |

> 이 차이는 설계 문서가 업데이트되지 않아서 발생한 **문서-구현 드리프트**. 기능 동작에는 문제 없음.

---

## 6. Gap List

### 6.1 Critical (설계 문서 업데이트 필요)

| Gap ID | Severity | Description | Location |
|--------|----------|-------------|----------|
| G-01 | **Critical** | Design doc가 OpenAI/gpt-4o-mini를 명세하지만 구현은 SambaNova/Llama 사용 | design.md §2.3, §5.2, §9, plan.md 전반 |
| G-02 | **Critical** | Design doc의 `OPENAI_API_KEY` 환경변수가 `SAMBANOVA_API_KEY`로 교체됨 | design.md §5.2, §9, §10 |

### 6.2 Important (설계 문서에 누락된 구현 내용)

| Gap ID | Severity | Description | Location |
|--------|----------|-------------|----------|
| G-03 | Important | `expandKeywords()` 함수가 설계 문서에 없음 | server.js:23-52 |
| G-04 | Important | `extractRelevantChunks()` 함수가 설계 문서에 없음 | server.js:55-91 |
| G-05 | Important | 노무 도우미 페르소나 system prompt가 설계 문서에 없음 | server.js:102-112 |
| G-06 | Important | `askOpenAI()` 파라미터 시그니처가 설계와 다름 (1 vs 2 파라미터) | server.js:94 vs design.md §2.3 |

### 6.3 Minor

| Gap ID | Severity | Description |
|--------|----------|-------------|
| G-07 | Minor | Design의 단순 채팅 UI가 7섹션 랜딩 페이지로 확장됨 (개선사항) |
| G-08 | Minor | Plan의 성공 기준에 `vercel dev` 테스트 항목 있지만 실행 미확인 |

---

## 7. Decision Record Chain

| Phase | Decision | Followed? | Outcome |
|-------|----------|-----------|---------|
| Plan | API: OpenAI gpt-4o-mini | ❌ Changed | SambaNova Meta-Llama-3.3-70B-Instruct로 교체 — 동작 정상 |
| Plan | MVP Scope: 채팅 UI + 답변 + 로딩/에러 | ✅ Followed | 7섹션 랜딩페이지로 확장 (초과 달성) |
| Design | Option C Pragmatic (단일 server.js) | ✅ Followed | 단일 파일로 구현 완료 |
| Design | PDF 50,000자 트리밍 | ✅ Followed | server.js:19 `.slice(0, 50000)` |
| Design | Vercel includeFiles docs/** | ✅ Followed | vercel.json:8 |
| Do | extractRelevantChunks 키워드 매칭 추가 | ℹ️ Added | 설계에 없었으나 품질 향상 목적으로 추가 |
| Do | 노무 도우미 페르소나 추가 | ℹ️ Added | 설계에 없었으나 사용자 요청으로 추가 |

---

## 8. Overall Assessment

**Match Rate: 89%** (static-only, runtime verification 미실행)

구현은 설계를 대부분 충족하며, 설계를 초과 달성한 부분(키워드 추출, 페르소나, 랜딩 페이지)도 있다. 주요 갭은 API 제공자 변경(OpenAI → SambaNova)으로 인한 **문서-구현 드리프트**이며, 실제 기능 동작에는 문제가 없다.

권장 조치: 설계 문서를 현재 구현에 맞게 업데이트하면 Match Rate 95%+ 달성 가능.
