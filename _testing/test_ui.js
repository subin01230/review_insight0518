const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // 콘솔 로그 수집
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  const filePath = `file:///${path.resolve(__dirname, 'client/index.html').replace(/\\/g, '/')}`;
  console.log(`Navigating to ${filePath}`);
  
  await page.goto(filePath, { waitUntil: 'networkidle0' });
  
  // HTML 확인
  const content = await page.content();
  console.log('HTML Length:', content.length);
  
  // login-section 클래스 확인
  const loginClass = await page.$eval('#login-section', el => el.className);
  console.log('#login-section classes:', loginClass);
  
  await browser.close();
})();
