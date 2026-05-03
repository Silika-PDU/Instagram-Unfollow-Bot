const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const page = await context.newPage();
  await page.goto('https://www.instagram.com');

  console.log("Login, then press ENTER...");

  process.stdin.once('data', async () => {
    await context.storageState({ path: 'state.json' });
    await browser.close();
  });
})();
