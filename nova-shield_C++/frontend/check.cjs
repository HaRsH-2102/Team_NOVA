const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to local dev server...");
  try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
      try {
          await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 5000 });
      } catch(e2) {
         console.log("Failed to connect to dev server.");
      }
  }

  await browser.close();
})();
