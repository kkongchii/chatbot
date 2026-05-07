# pdf-chatbot 작업 현황

> **최종 업데이트**: 2026-05-07
> **저장소**: https://github.com/kkongchii/chatbot
> **현재 브랜치**: main

---

## 진행 단계

```
[Plan ✅] → [Design ✅] → [Do 🔄] → [Check ⏳] → [Deploy ⏳]
```

---

## 완료된 작업

### 1. Plan (`docs/01-plan/features/pdf-chatbot.plan.md`)
- 서비스 목표: 근로기준법 PDF 기반 노무 챗봇
- API: OpenAI `gpt-4o-mini`
- 배포 대상: Vercel (serverless)
- MVP 범위: 챗봇 UI + 답변 생성 + 로딩/에러 UX (대화 히스토리·파일 업로드 제외)

### 2. Design (`docs/02-design/features/pdf-chatbot.design.md`)
- **아키텍처**: Option C — Pragmatic (단일 `server.js` + 함수 분리)
- 핵심 함수: `loadPdfText()`, `extractRelevantChunks()`, `askOpenAI()`
- API 계약: `POST /api/chat` → `{ reply }` / `{ error }`

### 3. 구현 (`server.js`, `public/index.html`)

#### server.js
| 함수 | 역할 |
|------|------|
| `loadPdfText()` | PDF 파싱, 앞 50,000자 트리밍 (Vercel 메모리 대응) |
| `extractRelevantChunks()` | 질문 키워드로 관련 조문 구절 추출 (최대 3구간) |
| `askOpenAI()` | OpenAI `gpt-4o-mini` 호출, 관련 조문을 system 메시지로 전달 |
| `POST /api/chat` | 빈 메시지 → 400, API 오류 → 500, 성공 → `{ reply }` |

#### public/index.html
- 주황 테마 (`#FF6B35`) 랜딩 페이지
- 섹션: 네비 → 히어로 → 기능 소개 → 사용 후기 → 챗봇 → FAQ → 푸터
- 챗봇 UI: 로딩 스피너, 빠른 질문 버튼, Enter 전송, 에러 메시지
- 반응형 (모바일 768px breakpoint)

#### 의존성
```json
"express": "^4.18.2"
"pdf-parse": "^1.1.1"
"openai": "^4.0.0"
"dotenv": "^16.0.0"
```

---

## 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `5b06322` | feat: implement pdf-chatbot with OpenAI API and landing page UI |
| `77f96e2` | docs: switch API from Claude to OpenAI and add pdf-chatbot plan |
| `ac6ff80` | chore: initial project setup |

---

## 현재 알려진 문제

| 문제 | 원인 | 상태 |
|------|------|------|
| 연차·퇴직금 질문에 엉뚱한 답변 | `extractRelevantChunks()`의 키워드 매칭이 부정확 (띄어쓰기 불일치 등) | **미해결** |

---

## 남은 작업

- [ ] `extractRelevantChunks()` 개선 — 키워드 정규화 (띄어쓰기 제거, 유사어 확장)
- [ ] `vercel.json` 작성 — serverless 래핑 + `docs/**` includeFiles
- [ ] 로컬 테스트 전체 시나리오 통과 (T-01 ~ T-05)
- [ ] Vercel 환경변수(`OPENAI_API_KEY`) 설정 후 배포
- [ ] 배포 URL에서 실제 동작 확인

---

## 로컬 실행 방법

```bash
# 1. 의존성 설치 (최초 1회)
npm install

# 2. .env 파일 생성
cp .env.example .env
# .env에 OPENAI_API_KEY 입력

# 3. 서버 실행
node server.js
# → http://localhost:3000

# 포트 충돌 시 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID번호> /F
```

---

## 파일 구조

```
chatbot/
├── server.js                          # Express 서버 (메인 로직)
├── public/
│   └── index.html                     # 랜딩 + 챗봇 UI
├── docs/
│   ├── 근로기준법(법률)(제20520호)(20250223).pdf
│   ├── 01-plan/features/pdf-chatbot.plan.md
│   ├── 02-design/features/pdf-chatbot.design.md
│   └── progress.md                    # 이 문서
├── package.json
├── .env                               # Git 제외 (API 키)
├── .env.example                       # 환경변수 템플릿
├── .gitignore
└── CLAUDE.md
```
