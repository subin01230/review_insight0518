// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// 클라이언트 정적 파일 서비스
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 3. API 라우터 연결
// Vercel 환경에서 req.url이 /analyze 등 prefix가 잘린 형태로 들어올 수 있으므로 두 경로 모두 처리
app.use(['/api/analyze', '/analyze'], require('./routes/analyze'));
app.use(['/api/history', '/history'], require('./routes/history'));

// 로컬 환경에서 직접 실행 시에만 포트 리슨 (Vercel에서는 제외)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Vercel 배포를 위한 모듈 내보내기
module.exports = app;
