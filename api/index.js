// api/index.js
// Vercel Serverless Function 진입점
// 주의: API 키 등 모든 비밀값은 여기 하드코딩되지 않고 Vercel의 Environment Variables(.env)를 통해 주입됩니다.

const app = require('../server/server.js');

module.exports = app;
