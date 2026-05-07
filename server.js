require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// 파싱된 PDF 텍스트를 메모리에 보관
let pdfText = '';

// PDF 파일을 읽어 텍스트로 변환
async function loadPdfText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  // Vercel 메모리 한도 대응: 앞 50,000자만 사용
  return data.text.slice(0, 50000);
}

// 질문 키워드를 정규화하여 확장 (띄어쓰기 분리 + 동의어)
function expandKeywords(query) {
  const cleaned = query.replace(/[?？!！。.,]/g, ' ').replace(/\s+/g, ' ').trim();

  // 붙여쓴 복합어를 분리 (예: 연차유급휴가 → 연차, 유급휴가)
  const splits = {
    '연차유급휴가': ['연차', '유급휴가', '연차휴가'],
    '연차휴가': ['연차', '유급휴가'],
    '퇴직금': ['퇴직금', '퇴직'],
    '부당해고': ['부당해고', '해고'],
    '육아휴직': ['육아휴직', '육아'],
    '출산휴가': ['출산휴가', '출산'],
    '야간수당': ['야간수당', '야간', '가산임금'],
    '연장근로': ['연장근로', '초과근무', '연장'],
    '최저임금': ['최저임금', '최저'],
    '수습기간': ['수습기간', '수습'],
    '근로계약': ['근로계약', '계약서'],
    '해고예고': ['해고예고', '해고', '예고'],
  };

  const keywords = new Set();
  // 원본 토큰 추가
  cleaned.split(/\s+/).filter(w => w.length >= 2).forEach(w => keywords.add(w));
  // 복합어 분리 추가
  for (const [compound, parts] of Object.entries(splits)) {
    if (cleaned.includes(compound) || cleaned.replace(/\s/g, '').includes(compound)) {
      parts.forEach(p => keywords.add(p));
    }
  }
  return [...keywords];
}

// 질문과 관련된 PDF 구절을 추출
function extractRelevantChunks(text, query) {
  const keywords = expandKeywords(query);
  const positions = [];

  for (const kw of keywords) {
    let start = 0;
    while (positions.length < 9) {
      const idx = text.indexOf(kw, start);
      if (idx === -1) break;
      positions.push(idx);
      start = idx + 1;
    }
  }

  // 매칭 없으면 PDF 전체 반환 (47,200자로 이미 컨텍스트 내 수용 가능)
  if (positions.length === 0) return text;

  // 위치 정렬 후 근접한 구간 병합 (500자 이내면 하나로 합침)
  const sorted = [...new Set(positions)].sort((a, b) => a - b);
  const merged = [];
  let rangeStart = Math.max(0, sorted[0] - 500);
  let rangeEnd = Math.min(text.length, sorted[0] + 1000);

  for (let i = 1; i < sorted.length && merged.length < 4; i++) {
    const s = Math.max(0, sorted[i] - 500);
    if (s <= rangeEnd) {
      rangeEnd = Math.min(text.length, sorted[i] + 1000);
    } else {
      merged.push(text.slice(rangeStart, rangeEnd));
      rangeStart = s;
      rangeEnd = Math.min(text.length, sorted[i] + 1000);
    }
  }
  merged.push(text.slice(rangeStart, rangeEnd));

  return merged.join('\n\n...(중략)...\n\n');
}

// SambaNova API에 질문을 전달하고 답변을 반환
async function askOpenAI(userMessage) {
  const client = new OpenAI({
    apiKey: process.env.SAMBANOVA_API_KEY,
    baseURL: 'https://api.sambanova.ai/v1',
  });

  const context = pdfText ? extractRelevantChunks(pdfText, userMessage) : '';

  const systemPrompt = context
    ? `당신은 근로기준법 전문 노무 상담 도우미입니다.
아래 [관련 조문]은 사용자 질문과 관련된 근로기준법 원문입니다.
반드시 이 내용을 바탕으로 구체적이고 친절하게 답변하세요.
관련 조문 번호(예: 제60조)를 명시하고, 핵심 내용을 빠짐없이 설명하세요.
본 서비스는 법적 효력이 없는 참고용 정보임을 필요 시 안내하세요.

[관련 조문]
${context}`
    : `당신은 근로기준법 전문 노무 상담 도우미입니다.
근로기준법에 관한 질문에 구체적이고 친절하게 답변하세요.
본 서비스는 법적 효력이 없는 참고용 정보임을 필요 시 안내하세요.`;

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

// 미들웨어 설정
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/chat — 챗봇 엔드포인트
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: '메시지를 입력해주세요.' });
  }

  try {
    const reply = await askOpenAI(message.trim());
    res.json({ reply });
  } catch (err) {
    console.error('SambaNova API 오류:', err.message);
    res.status(500).json({ error: '답변을 가져오는 데 실패했습니다.' });
  }
});

// 서버 시작
async function startServer() {
  // PDF 로드
  const pdfPath = path.join(__dirname, 'docs', '근로기준법(법률)(제20520호)(20250223).pdf');
  try {
    pdfText = await loadPdfText(pdfPath);
    console.log(`PDF 로드 완료 (${pdfText.length}자)`);
  } catch (err) {
    console.warn('PDF 로드 실패 — 기본 모드로 동작합니다:', err.message);
    pdfText = '';
  }

  app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
  });
}

startServer();
