// server/routes/analyze.js
const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// 1. 초기화
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // RPC 호출 및 암호화 처리를 위해 서비스 롤 사용
);

router.post('/', async (req, res) => {
  const { text, userId } = req.body;

  if (!text || !userId) {
    return res.status(400).json({ error: '텍스트와 사용자 ID가 필요합니다.' });
  }

  try {
    // 2. Claude(Anthropic) 감정 분석 요청
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: "당신은 감정 분석 전문가입니다. 입력된 텍스트의 감정을 분석하여 오직 JSON 형식으로만 응답하세요. 백틱이나 마크다운 없이 JSON만 출력하세요. 응답 필드: sentiment (긍정, 부정, 중립 중 하나), confidence (0-100 정수), reason (한 문장으로 된 분석 이유).",
      messages: [
        { role: "user", content: text },
        { role: "assistant", content: "{" }
      ]
    });

    const responseText = "{" + msg.content[0].text;
    const analysis = JSON.parse(responseText);

    // 3. Supabase RPC를 통한 암호화 저장 (PRD 명세 준수)
    const { error: dbError } = await supabaseAdmin.rpc('insert_sentiment_log_encrypted', {
      p_user_id: userId,
      p_input_text: text,
      p_sentiment: analysis.sentiment,
      p_confidence: analysis.confidence,
      p_reason: analysis.reason,
      p_enc_key: process.env.ENCRYPTION_KEY
    });

    if (dbError) throw dbError;

    res.json({
      success: true,
      result: analysis
    });

  } catch (err) {
    console.error('Analyze API Error:', err);
    res.status(500).json({ error: '분석 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
