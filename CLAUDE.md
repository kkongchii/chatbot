# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

PDF 문서를 읽어 사용자 질문에 답변하는 챗봇 서비스. Node.js + Express 서버가 PDF를 파싱하고 OpenAI API로 답변을 생성하며, Vercel에 배포한다.

## 개발 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 3000)
node server.js

# Vercel 로컬 개발 (serverless 환경 시뮬레이션)
vercel dev
```

## 아키텍처

```
chatbot/
├── server.js      # Express 진입점 — PDF 파싱 + OpenAI API 호출
├── public/        # 프론트엔드 (HTML/CSS/JS) — 정적 파일 서빙
├── docs/          # PDF 문서 보관 (서버에서만 읽음)
└── vercel.json    # Express → serverless function 래핑 설정
```

**데이터 흐름:** 브라우저 → `POST /api/chat` → `server.js`에서 `docs/` PDF 파싱 → OpenAI API (`gpt-4o-mini`) 호출 → 응답 반환

## 핵심 규칙

### 보안
- `.env`는 **절대 수정하거나 Git에 커밋하지 말 것**
- `OPENAI_API_KEY`는 `server.js`에서만 `process.env`로 참조 — 프론트엔드 노출 금지
- PDF 파싱은 반드시 서버 사이드에서만 처리

### 코드 스타일
- 주석은 **한국어**로 작성
- 변수명·함수명은 영어 camelCase 사용

## 환경변수 (`.env`)

```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

## Vercel 배포

- `vercel.json`으로 Express를 serverless function으로 래핑
- 환경변수는 Vercel 대시보드 → Settings → Environment Variables에서 설정
- `docs/` 폴더 PDF가 빌드 번들에 포함되어야 함 (`vercel.json`의 `includeFiles` 또는 `functions` 설정 확인)
