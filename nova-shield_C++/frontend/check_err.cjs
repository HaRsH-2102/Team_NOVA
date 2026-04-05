const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      const text = await page.$eval('#error-boundary-msg', el => el.innerHTML);
      fs.writeFileSync('err.txt', text);
  } catch(e) {
      fs.writeFileSync('err.txt', 'No error boundary');
  }
  await browser.close();
})();
