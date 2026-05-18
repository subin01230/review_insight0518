// server/routes/history.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // RPC를 호출하여 복호화된 데이터를 가져옴
    const { data, error } = await supabaseAdmin.rpc('get_sentiment_history_decrypted', {
      p_enc_key: process.env.ENCRYPTION_KEY
    });

    if (error) throw error;

    res.json({
      success: true,
      history: data
    });

  } catch (err) {
    console.error('History API Error:', err);
    res.status(500).json({ error: '기록을 가져오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
