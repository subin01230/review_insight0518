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
app.use('/api/analyze', require('./routes/analyze'));
app.use('/api/history', require('./routes/history'));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
