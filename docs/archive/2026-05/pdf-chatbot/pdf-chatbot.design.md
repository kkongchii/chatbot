# pdf-chatbot Design Document

> **Feature**: pdf-chatbot
> **Project**: chatbot
> **Version**: 0.2.0
> **Author**: kkongchii
> **Date**: 2026-05-07
> **Status**: Draft
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 근로기준법 PDF를 쉽게 검색·이해할 수 없는 문제 해결 |
| **WHO** | 근로기준법 내용을 빠르게 확인하고 싶은 일반 사용자 |
| **RISK** | SambaNova API 응답 지연, PDF 파싱 실패, Vercel 메모리 한도 초과 |
| **SUCCESS** | 질문 입력 → 근로기준법 기반 답변 수신 + Vercel 배포 URL에서 동작 확인 |
| **SCOPE** | 채팅 UI + 답변 생성 + 로딩/에러 UX + Vercel 배포 (대화 히스토리·파일 업로드 제외) |

---

## 1. Overview

### 1.1 Architecture Decision

**Option C — Pragmatic Balance** 채택.

`server.js` 단일 파일 내에서 `loadPdfText()`, `expandKeywords()`, `extractRelevantChunks()`, `askOpenAI()` 함수를 명확히 분리한다. 별도 `lib/` 디렉토리 없이 Starter 수준을 유지하면서도, 각 관심사(PDF 파싱 / 키워드 추출 / SambaNova API 호출 / 라우팅)를 함수 단위로 분리해 가독성을 확보한다.

### 1.2 File Structure

```
chatbot/
├── server.js              # Express 서버 + loadPdfText() + askOpenAI() + POST /api/chat
├── public/
│   └── index.html         # 채팅 UI (HTML + CSS + JS 인라인)
├── docs/
│   └── 근로기준법(법률)(제20520호)(20250223).pdf
├── package.json
├── vercel.json
├── .env                   # SAMBANOVA_API_KEY, HF_MODEL, PORT (Git 제외)
└── .gitignore
```

---

## 2. server.js 설계

### 2.1 모듈 구조

```
server.js
├── [imports]               require('express'), require('pdf-parse'), require('openai'), require('fs'), require('path'), require('dotenv')
├── loadPdfText()           PDF 파일 읽기 → pdf-parse → 텍스트 반환 (async, 50,000자 트리밍)
├── expandKeywords()        질문 키워드 정규화·복합어 분리 (sync)
├── extractRelevantChunks() 키워드 기반 관련 조문 구절 추출 (sync)
├── askOpenAI()             SambaNova ChatCompletion 호출 → 답변 문자열 반환 (async)
├── [서버 초기화]           Express 앱 생성, 미들웨어 설정, PDF 로드
└── POST /api/chat          요청 수신 → askOpenAI() 호출 → { reply } 응답
```

### 2.2 `loadPdfText()` 상세

```js
// 서버 시작 시 1회 호출, 결과를 모듈 스코프 변수에 보관
async function loadPdfText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  // Vercel 메모리 한도 대응: 앞 50,000자만 사용
  return data.text.slice(0, 50000);
}
```

- 실패 시 `throw` → 서버 시작 단계에서 catch하여 `pdfText = ''` 로 폴백
- `pdfText`는 모듈 최상단 `let pdfText = ''`에 저장

### 2.3 `expandKeywords()` 상세

```js
// 질문 키워드를 정규화하여 확장 (띄어쓰기 분리 + 동의어)
function expandKeywords(query) {
  // 구두점 제거 후 복합어 사전으로 확장
  // 예: '연차유급휴가' → ['연차', '유급휴가', '연차휴가']
  // 반환: 중복 제거된 키워드 배열
}
```

### 2.4 `extractRelevantChunks()` 상세

```js
// 질문과 관련된 PDF 구절을 추출 (최대 4개 구간 병합)
function extractRelevantChunks(text, query) {
  // 1. expandKeywords()로 키워드 추출
  // 2. PDF 내 키워드 위치 탐색 (최대 9개 위치)
  // 3. 매칭 없으면 전체 PDF 반환 (폴백)
  // 4. 위치 정렬 후 500자 이내 근접 구간 병합
  // 5. 병합 구간 slice (±500/1000자) 반환
}
```

### 2.5 `askOpenAI()` 상세

```js
async function askOpenAI(userMessage) {
  const client = new OpenAI({
    apiKey: process.env.SAMBANOVA_API_KEY,
    baseURL: 'https://api.sambanova.ai/v1',
  });
  const context = pdfText ? extractRelevantChunks(pdfText, userMessage) : '';
  // 노무 도우미 페르소나 system prompt + 관련 조문 포함
  const response = await client.chat.completions.create({
    model: process.env.HF_MODEL || 'Meta-Llama-3.3-70B-Instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 1000,
    temperature: 0.3
  });
  return response.choices[0].message.content;
}
```

**페르소나 원칙:**
1. 관련 법령 조문 번호(예: 근로기준법 제60조) 근거 제시
2. 불확실한 내용은 노무사·고용노동부 확인 안내
3. 답변 말미 "본 답변은 참고용이며 법적 효력이 없습니다" 명시
4. 질문자 상황에 공감하며 실질적 정보 제공

### 2.6 `POST /api/chat` 핸들러

```
요청: POST /api/chat
Body: { "message": "연차 며칠 받을 수 있나요?" }

처리 순서:
1. req.body.message 추출 및 유효성 검사 (빈 문자열 → 400)
2. askOpenAI(message) 호출
3. 성공: res.json({ reply })
4. 실패: res.status(500).json({ error: '답변을 가져오는 데 실패했습니다.' })

응답 성공: { "reply": "..." }
응답 실패: { "error": "답변을 가져오는 데 실패했습니다." }
```

### 2.7 서버 초기화 순서

```
1. dotenv.config()
2. Express 앱 생성
3. express.json() 미들웨어
4. express.static('public') 미들웨어
5. loadPdfText() 호출 (try/catch → 실패 시 pdfText = '', 경고 로그)
6. POST /api/chat 라우터 등록
7. app.listen(PORT)
```

---

## 3. public/index.html 설계

### 3.1 레이아웃 구조 (7섹션 랜딩 페이지)

```
<body>
  <nav>                          <!-- 스티키 네비게이션 -->
  <section#hero>                 <!-- 히어로 + 목업 프리뷰 -->
  <section#features>             <!-- 기능 소개 (6카드, 3열 그리드) -->
  <section#reviews>              <!-- 사용 후기 (3카드) -->
  <section#chat>                 <!-- 실제 챗봇 UI -->
    <div#chatMessages>           <!-- 메시지 목록 스크롤 영역 -->
    <div.quick-questions>        <!-- 빠른 질문 버튼 -->
    <div.input-area>             <!-- 입력창 + 전송 버튼 + 리셋 버튼 -->
  <section#faq>                  <!-- FAQ 아코디언 -->
  <footer>                       <!-- 푸터 -->
</body>
```

**주황 테마**: `--primary: #FF6B35`, `--gradient: linear-gradient(135deg, #FF6B35, #FF9A5C)`

### 3.2 JS 동작 흐름

```
sendMessage() 호출 시:
1. userInput.value 추출 및 trim() 빈값 체크
2. 사용자 메시지를 #chatMessages에 .message.user로 추가
3. sendBtn.disabled = true, userInput.disabled = true
4. 로딩 스피너 메시지(.message.bot.loading)를 #chatMessages에 추가
5. fetch('POST /api/chat', { message })
6a. 성공: 스피너 제거 → reply를 .message.bot으로 추가
6b. 실패: 스피너 제거 → 에러 메시지를 .message.bot.error로 추가
7. sendBtn.disabled = false, userInput.disabled = false
8. #chatMessages 하단으로 스크롤
```

### 3.3 이벤트 바인딩

| 이벤트 | 처리 |
|--------|------|
| `sendBtn` click | `sendMessage()` 호출 |
| `userInput` keydown Enter (Shift 미입력) | `sendMessage()` 호출 |
| Shift+Enter | 줄바꿈 |
| 빠른 질문 버튼 click | `quickSend(text)` 호출 |
| 리셋 버튼 click | `resetChat()` 호출 |
| FAQ 항목 click | `toggleFaq(index)` 호출 |

### 3.4 CSS 주요 스타일

| 요소 | 스타일 |
|------|--------|
| `.message.user` | 오른쪽 정렬, 파란색 배경 |
| `.message.bot` | 왼쪽 정렬, 회색 배경 |
| `.message.error` | 왼쪽 정렬, 빨간색 텍스트 |
| 로딩 스피너 | `...` 텍스트 또는 CSS 애니메이션 dots |

---

## 4. API Contract

### 4.1 POST /api/chat

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/chat` |
| Content-Type | `application/json` |
| Request Body | `{ "message": string }` |
| Response 200 | `{ "reply": string }` |
| Response 400 | `{ "error": "메시지를 입력해주세요." }` |
| Response 500 | `{ "error": "답변을 가져오는 데 실패했습니다." }` |

---

## 5. 의존성

### 5.1 package.json dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pdf-parse": "^1.1.1",
    "openai": "^4.0.0",
    "dotenv": "^16.0.0"
  }
}
```

### 5.2 .env

```
SAMBANOVA_API_KEY=...
HF_MODEL=Meta-Llama-3.3-70B-Instruct
PORT=3000
```

---

## 6. vercel.json 설계

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["docs/**"]
      }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "server.js" }
  ]
}
```

- `includeFiles: ["docs/**"]`: PDF 파일을 serverless function 번들에 포함
- 모든 경로를 `server.js`로 라우팅 (정적 파일은 `express.static`이 처리)

---

## 7. 에러 처리 전략

| 시나리오 | 처리 방식 | 사용자 메시지 |
|----------|-----------|---------------|
| PDF 파일 없음 / 파싱 실패 | 서버 시작 시 경고 로그, `pdfText = ''` | (API 호출은 가능, 답변 품질 저하) |
| `SAMBANOVA_API_KEY` 미설정 | `askOpenAI()` 내 500 에러 | "답변을 가져오는 데 실패했습니다." |
| SambaNova API 타임아웃 / 오류 | try/catch → 500 응답 | "답변을 가져오는 데 실패했습니다." |
| 빈 message 전송 | 400 응답 | "메시지를 입력해주세요." |
| 네트워크 오류 (프론트) | fetch catch → 에러 메시지 표시 | "서버와 연결할 수 없습니다." |

---

## 8. 테스트 계획

### 8.1 수동 테스트 시나리오

| ID | 시나리오 | 기대 결과 |
|----|----------|-----------|
| T-01 | 정상 질문 전송 ("연차는 며칠인가요?") | 근로기준법 기반 답변 수신, 로딩 스피너 동작 |
| T-02 | 빈 메시지 전송 | 전송 차단 또는 "메시지를 입력해주세요." 표시 |
| T-03 | 로딩 중 전송 버튼 재클릭 | 버튼 비활성화로 중복 전송 방지 |
| T-04 | 잘못된 API 키로 서버 실행 | 챗봇에서 에러 메시지 표시, 서버 크래시 없음 |
| T-05 | `vercel dev` 실행 후 질문 | 로컬 serverless 환경에서 정상 동작 |

---

## 9. 보안 체크리스트

- [x] `SAMBANOVA_API_KEY`는 `server.js`의 `process.env`에서만 참조
- [x] `public/index.html`에 API 키 문자열 없음
- [x] `.env` 파일 `.gitignore`에 포함됨
- [x] PDF 파싱은 `server.js`에서만 수행 (프론트엔드에서 직접 접근 불가)

---

## 10. Vercel 배포 체크리스트

- [x] Vercel 대시보드 → Settings → Environment Variables에 `SAMBANOVA_API_KEY`, `HF_MODEL` 설정
- [x] `vercel.json`의 `includeFiles`에 `docs/**` 포함 확인
- [x] `vercel deploy` 후 공개 URL에서 T-01 시나리오 테스트 — https://chatbot-six-kohl-41.vercel.app

---

## 11. Implementation Guide

### 11.1 구현 순서

1. `package.json` 생성 및 `npm install`
2. `.env` 파일 생성 (`OPENAI_API_KEY`, `PORT=3000`)
3. `.gitignore` 확인 (`.env` 포함 여부)
4. `server.js` 구현
   - 4-1. imports + dotenv.config()
   - 4-2. `loadPdfText()` 함수
   - 4-3. `askOpenAI()` 함수
   - 4-4. Express 앱 초기화 + 미들웨어
   - 4-5. `POST /api/chat` 핸들러
   - 4-6. 서버 시작 (PDF 로드 → listen)
5. `public/index.html` 구현
   - 5-1. HTML 구조 + CSS 스타일
   - 5-2. JS: `sendMessage()` + 이벤트 바인딩
6. `vercel.json` 생성
7. `node server.js`로 로컬 테스트 (T-01 ~ T-04)
8. `vercel dev`로 serverless 환경 테스트 (T-05)

### 11.2 핵심 의존성 설치 명령어

```bash
npm init -y
npm install express pdf-parse openai dotenv
```

### 11.3 Session Guide

#### Module Map

| Module | 파일 | 주요 작업 | 예상 소요 |
|--------|------|-----------|-----------|
| M1: 서버 기반 | `server.js` (4-1 ~ 4-4) | imports, loadPdfText, askOpenAI, Express 초기화 | 20분 |
| M2: API 엔드포인트 | `server.js` (4-5 ~ 4-6) | POST /api/chat 핸들러, 서버 시작 | 15분 |
| M3: 채팅 UI | `public/index.html` | HTML 구조, CSS, JS sendMessage | 20분 |
| M4: 배포 설정 | `vercel.json`, 환경변수 | Vercel 설정, 로컬 테스트 | 10분 |

#### Recommended Session Plan

- **Session 1** (단일 세션 권장): M1 → M2 → M3 → M4 순서로 전체 구현
- `--scope` 예시: `/pdca do pdf-chatbot --scope M1,M2` (서버만 먼저 구현 후 테스트)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-07 | Initial design — Option C Pragmatic 채택 | kkongchii |
| 0.2 | 2026-05-07 | API 변경 반영: OpenAI → SambaNova (Meta-Llama-3.3-70B-Instruct), expandKeywords/extractRelevantChunks/페르소나 추가, 7섹션 랜딩 페이지 반영 | kkongchii |
