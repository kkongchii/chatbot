# Markdown Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 봇 답변에만 마크다운 렌더링을 적용해 법령 조문, 목록, 볼드체 등이 시각적으로 표시되게 한다.

**Architecture:** `public/index.html` 단일 파일만 수정한다. CDN으로 marked.js(파싱)와 DOMPurify(XSS 새니타이징)를 로드하고, `addMessage()` 함수에서 `type === 'bot'`일 때만 `innerHTML`로 렌더링한다. 사용자 메시지와 에러 메시지는 기존 `textContent` 방식을 유지한다.

**Tech Stack:** marked.js (CDN), DOMPurify (CDN), vanilla JS, CSS

---

## 파일 구조

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `public/index.html` | 수정 | CDN 스크립트 추가, CSS 추가, `addMessage()` 수정 |

---

### Task 1: CDN 스크립트 추가

**Files:**
- Modify: `public/index.html` — `</head>` 바로 앞에 두 줄 추가

- [ ] **Step 1: `</head>` 태그 바로 앞에 CDN 스크립트 삽입**

`public/index.html`의 `</head>` 직전(현재 521번째 줄 `</style>` 다음, `</head>` 전)에 아래를 추가:

```html
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
```

결과적으로 `</head>` 바로 앞 두 줄이 위와 같이 되어야 한다.

- [ ] **Step 2: 브라우저에서 라이브러리 로드 확인**

터미널에서 서버 실행:
```
node server.js
```
브라우저에서 `http://localhost:3000` 열고 콘솔(`F12 → Console`)에서 확인:
```js
typeof marked   // "object" 여야 함
typeof DOMPurify // "object" 여야 함
```
두 값이 모두 `"object"`이면 정상.

- [ ] **Step 3: 커밋**

```bash
git add public/index.html
git commit -m "feat: add marked.js and DOMPurify CDN scripts"
```

---

### Task 2: 봇 버블 마크다운 CSS 추가

**Files:**
- Modify: `public/index.html` — `<style>` 블록 내 `/* ── 애니메이션 ── */` 주석 바로 위에 CSS 추가

- [ ] **Step 1: 마크다운 스타일 CSS 삽입**

`public/index.html`의 `<style>` 블록 안, `/* ── 애니메이션 ── */` 주석 바로 앞에 아래 CSS를 추가:

```css
    /* ── 봇 답변 마크다운 ── */
    .message-row.bot .message-bubble p { margin-bottom: 8px; }
    .message-row.bot .message-bubble p:last-child { margin-bottom: 0; }
    .message-row.bot .message-bubble ul,
    .message-row.bot .message-bubble ol { padding-left: 20px; margin-bottom: 8px; }
    .message-row.bot .message-bubble li { margin-bottom: 4px; }
    .message-row.bot .message-bubble strong { font-weight: 700; color: var(--text-dark); }
    .message-row.bot .message-bubble code {
      background: rgba(0,0,0,0.07);
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 13px;
      font-family: monospace;
    }
    .message-row.bot .message-bubble h1,
    .message-row.bot .message-bubble h2,
    .message-row.bot .message-bubble h3 {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 6px;
      color: var(--text-dark);
    }
```

- [ ] **Step 2: 커밋**

```bash
git add public/index.html
git commit -m "feat: add markdown styles for bot message bubbles"
```

---

### Task 3: `addMessage()` 함수 수정

**Files:**
- Modify: `public/index.html` — `<script>` 블록 내 `addMessage()` 함수

- [ ] **Step 1: `addMessage()` 함수 수정**

현재 코드(약 749~761번째 줄):
```js
  function addMessage(text, type) {
    const box = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = `message-row ${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    row.appendChild(bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }
```

아래로 교체:
```js
  function addMessage(text, type) {
    const box = document.getElementById('chatMessages');
    const row = document.createElement('div');
    row.className = `message-row ${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (type === 'bot') {
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
      bubble.textContent = text;
    }

    row.appendChild(bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }
```

- [ ] **Step 2: 동작 수동 확인**

서버 실행(`node server.js`) 후 `http://localhost:3000` 접속.

챗봇에 아래 질문을 입력하고 답변 형식 확인:
- `연차 계산 방법` — 목록(`-`)이나 볼드(`**`)가 렌더링되는지 확인
- 봇 답변에 `**굵은 글씨**`가 `<strong>` 태그로 표시되어야 함

- [ ] **Step 3: XSS 방어 확인**

브라우저 콘솔에서 직접 실행:
```js
addMessage('<script>alert("xss")</script>**볼드**', 'bot')
```
- `alert` 팝업이 뜨지 않아야 함
- `**볼드**`는 `<strong>볼드</strong>`로 렌더링되어야 함

- [ ] **Step 4: 사용자 메시지 변화 없음 확인**

입력창에 `<b>테스트</b>` 입력 후 전송.
- 사용자 말풍선에 `<b>테스트</b>` 텍스트 그대로 표시되어야 함 (HTML 렌더링 안 됨)

- [ ] **Step 5: 커밋**

```bash
git add public/index.html
git commit -m "feat: render markdown in bot message bubbles using marked.js + DOMPurify"
```

---

## 자체 검토

**스펙 커버리지:**
- CDN 추가 → Task 1 ✓
- CSS 스타일 → Task 2 ✓
- `addMessage()` 수정 → Task 3 ✓
- XSS 방어 확인 → Task 3 Step 3 ✓
- 사용자/에러 메시지 불변 → Task 3 Step 4 ✓

**플레이스홀더:** 없음. 모든 단계에 실제 코드 포함.

**타입 일관성:** `addMessage(text, type)` 시그니처가 전 태스크에서 동일.
