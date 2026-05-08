# 설계 스펙: AI 답변 마크다운 렌더링

**날짜:** 2026-05-08  
**상태:** 승인됨

## 목표

AI(봇) 답변에 마크다운 렌더링을 적용해 법령 조문 번호, 목록, 볼드체 등이 시각적으로 강조되어 가독성을 높인다.

## 범위

- **변경 파일:** `public/index.html` 단일 파일
- **적용 대상:** AI 봇 답변 말풍선(`type === 'bot'`)만
- **변경하지 않는 것:** `server.js`, 사용자 말풍선, 에러 메시지, 빠른 질문 버튼

## 라이브러리

| 라이브러리 | 용도 | 출처 |
|---|---|---|
| `marked.js` | 마크다운 → HTML 파싱 | jsDelivr CDN |
| `DOMPurify` | XSS 방지용 HTML 새니타이징 | jsDelivr CDN |

두 라이브러리 모두 `<head>` 끝에 `<script>` 태그로 추가.

## 구현 상세

### 1. CDN 추가 (`<head>`)

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
```

### 2. `addMessage()` 수정

현재:
```js
bubble.textContent = text;
```

변경 후:
```js
if (type === 'bot') {
  bubble.innerHTML = DOMPurify.sanitize(marked.parse(text));
} else {
  bubble.textContent = text;
}
```

### 3. CSS 추가

봇 버블(`#F0F0F0` 배경) 내부 마크다운 요소 스타일:

```css
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
```

## 데이터 흐름

```
AI 응답 텍스트
  → marked.parse()   # 마크다운 → HTML 문자열
  → DOMPurify.sanitize()  # XSS 위험 태그 제거
  → bubble.innerHTML  # DOM에 삽입
```

## 보안

- `DOMPurify.sanitize()`로 `<script>`, `onerror` 등 위험 속성 자동 제거
- 사용자 입력(`textContent`)은 기존과 동일하게 이스케이프 처리 유지

## 성공 기준

- 봇 답변의 `**볼드**`, `- 목록`, `# 제목` 등이 HTML로 렌더링됨
- 사용자 메시지와 에러 메시지는 변화 없음
- XSS 페이로드(`<script>alert(1)</script>`)가 봇 답변에 포함되어도 실행되지 않음
