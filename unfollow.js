const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');

const delay = ms => new Promise(res => setTimeout(res, ms));

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

// ENTER = skip
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let skipCurrent = false;

rl.on('line', () => {
  skipCurrent = true;
  console.log("⏭ Skip triggered");
});

// Load users
let users = fs.readFileSync('usernames.txt', 'utf-8')
  .split('\n')
  .map(x => x.trim())
  .filter(Boolean);

// Resume system
let progress = { done: [] };

if (fs.existsSync('progress.json')) {
  try {
    progress = JSON.parse(fs.readFileSync('progress.json', 'utf-8'));
  } catch {}
}

users = users.filter(u => !progress.done.includes(u));

function saveProgress() {
  fs.writeFileSync('progress.json', JSON.stringify(progress, null, 2));
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 130   // balanced speed
  });

  const context = await browser.newContext({
    storageState: 'state.json'
  });

  const page = await context.newPage();

  let doneCount = progress.done.length;

  for (const user of users) {
    skipCurrent = false;

    console.log(`\n→ ${user}`);
    console.log("   (ENTER = skip)");

    try {
      await page.goto(`https://www.instagram.com/${user}/`, {
        waitUntil: 'domcontentloaded'
      });

      // balanced page delay
      await delay(rand(3000, 6000));

      if (skipCurrent) {
        console.log(`⏭ Skipped early: ${user}`);
        continue;
      }

      const buttons = await page.locator('header button').all();

      let found = false;

      for (const btn of buttons) {
        const text = (await btn.textContent())?.trim();
        if (!text) continue;

        if (text.includes("Following") || text.includes("Requested")) {
          found = true;

          await btn.click();
          await delay(rand(1000, 2000));

          // menu UI
          if (await page.locator('text=Unfollow').count() > 0) {
            await page.locator('text=Unfollow').first().click();
          } else {
            // dialog UI
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor({ timeout: 5000 });

            const confirm = dialog.locator('button').filter({
              hasText: 'Unfollow'
            });

            await confirm.first().click();
          }

          console.log(`✔ Unfollowed ${user}`);

          progress.done.push(user);
          saveProgress();

          doneCount++;
          break;
        }
      }

      if (!found) {
        console.log(`✖ Not following: ${user}`);
      }

    } catch (e) {
      console.log(`✖ Skipped ${user} (reason: ${e.message})`);
    }

    // safer delay between users
    await delay(rand(8000, 16000));

    if (doneCount >= 60) {
      console.log("🛑 Daily limit reached.");
      break;
    }
  }

  rl.close();
  await browser.close();
})();
