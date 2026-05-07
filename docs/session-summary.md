# 세션 작업 요약

> **작성일**: 2026-05-07
> **저장소**: https://github.com/kkongchii/chatbot
> **배포 URL**: https://chatbot-six-kohl-41.vercel.app

---

## 최종 상태

```
[Plan ✅] → [Design ✅] → [Do ✅] → [Deploy ✅]
```

**모델**: SambaNova `Meta-Llama-3.3-70B-Instruct`
**스택**: Node.js + Express + pdf-parse + openai SDK + Vercel serverless

---

## 작업 흐름 요약

### 1단계 — 기획 (Plan)
- 서비스 정의: 근로기준법 PDF 기반 노무 상담 챗봇
- 최초 Claude API로 기획 → **OpenAI API로 변경** → 최종 **SambaNova API로 교체**
- 산출물: `docs/01-plan/features/pdf-chatbot.plan.md` (v0.3)

### 2단계 — 설계 (Design)
- 3가지 아키텍처 옵션 검토 후 **Option C (Pragmatic)** 채택
  - 단일 `server.js` + 함수 분리 (별도 lib/ 없음)
- 핵심 설계 결정:
  - PDF 50,000자 트리밍 (Vercel 메모리 한도 대응)
  - 키워드 기반 관련 조문 추출 (`extractRelevantChunks`)
- 산출물: `docs/02-design/features/pdf-chatbot.design.md`

### 3단계 — 구현 (Do)

#### server.js
| 함수 | 역할 |
|------|------|
| `loadPdfText()` | PDF → 텍스트 변환, 앞 50,000자 트리밍 |
| `extractRelevantChunks()` | 질문 키워드로 관련 조문 구절 추출 |
| `askOpenAI()` | SambaNova API 호출 (openai SDK 호환) |
| `POST /api/chat` | 챗봇 엔드포인트 |

#### public/index.html
- 주황 테마(`#FF6B35`) 단일 페이지
- 랜딩(히어로·기능·후기·FAQ) + 실제 챗봇 UI 통합
- 로딩 스피너, 빠른 질문 버튼, 반응형(768px)

### 4단계 — 배포 (Deploy)
- `vercel.json` 작성: PDF `docs/**` includeFiles 포함
- Vercel 환경변수 등록: `SAMBANOVA_API_KEY`, `HF_MODEL`
- 배포 후 API 테스트 통과 (`Meta-Llama-3.3-70B-Instruct` 응답 확인)

---

## API 변경 이력

| 단계 | API | 모델 | 사유 |
|------|-----|------|------|
| 초기 | Claude (Anthropic) | `claude-haiku-4-5-20251001` | 최초 기획 |
| 변경 1 | OpenAI | `gpt-4o-mini` | 사용자 요청 |
| 변경 2 | SambaNova | `Meta-Llama-3.3-70B-Instruct` | 사용자 요청 |

---

## 커밋 히스토리

| 해시 | 내용 |
|------|------|
| `70e40ac` | docs: update progress.md — SambaNova deployed |
| `aa14d5c` | feat: switch to SambaNova API and add vercel.json |
| `fec7f22` | docs: add progress.md |
| `5b06322` | feat: implement pdf-chatbot (OpenAI + landing page UI) |
| `77f96e2` | docs: switch API Claude → OpenAI, add plan |
| `ac6ff80` | chore: initial project setup |

---

## 파일 구조

```
chatbot/
├── server.js              # 메인 서버 (SambaNova API)
├── server.js.bak          # OpenAI 버전 백업
├── public/index.html      # 랜딩 + 챗봇 UI
├── vercel.json            # Vercel serverless 설정
├── package.json           # 의존성
├── .env                   # API 키 (Git 제외)
├── .env.example           # 환경변수 템플릿
├── CLAUDE.md              # 프로젝트 가이드
└── docs/
    ├── 근로기준법(...).pdf          # 원본 PDF
    ├── 01-plan/features/pdf-chatbot.plan.md
    ├── 02-design/features/pdf-chatbot.design.md
    ├── progress.md                  # 진행 현황
    └── session-summary.md           # 이 문서
```

---

## 환경변수

| 변수 | 값 | 설정 위치 |
|------|-----|-----------|
| `SAMBANOVA_API_KEY` | (비공개) | `.env` + Vercel |
| `HF_MODEL` | `Meta-Llama-3.3-70B-Instruct` | `.env` + Vercel |
| `PORT` | `3000` | `.env` (로컬만) |

---

## 미해결 과제

| 항목 | 내용 |
|------|------|
| 답변 품질 | `extractRelevantChunks()` 키워드 매칭 부정확 — 띄어쓰기 불일치로 관련 조문 추출 실패 시 엉뚱한 답변 |

---

## 로컬 실행

```bash
npm install
cp .env.example .env   # API 키 입력
node server.js         # http://localhost:3000
```
