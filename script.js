const { webkit } = require('playwright'); // ✅ switched back to webkit

const cookieArgIndex = process.argv.indexOf('-i');
if (cookieArgIndex === -1 || !process.argv[cookieArgIndex + 1]) {
  console.error("❌ Usage: node script.js -i \"<raw_cookie_string>\"");
  process.exit(1);
}

const rawCookieString = process.argv[cookieArgIndex + 1].trim();
if (!rawCookieString.includes('=')) {
  console.error("❌ Invalid cookie string.");
  process.exit(1);
}

const cookiePairs = rawCookieString.split(';').map(cookie => {
  const [name, ...rest] = cookie.trim().split('=');
  return { name, value: rest.join('='), domain: 'litefaucet.in', path: '/' };
});

function humanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(res => setTimeout(res, delay));
}

async function waitForTimerStart(page) {
  console.log("⏳ Waiting for timer to start (not '--- sec')...");
  const maxWaitMs = 60 * 1000;
  const pollInterval = 1000;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const timerText = await page.$eval('#secTimer', el => el.innerText.trim());
      if (!timerText.startsWith('---')) {
        console.log(`✅ Timer started: ${timerText}`);
        return true;
      }
    } catch (e) {
      console.warn("⚠️ Couldn't read #secTimer yet.");
    }
    await new Promise(res => setTimeout(res, pollInterval));
  }

  console.warn("⚠️ Timer did not start within 60 seconds.");
  return false;
}

async function logTimerEvery30Seconds(page, duration = 5 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < duration) {
    try {
      const timerText = await page.$eval('#secTimer', el => el.innerText.trim());
      console.log(`⏱️ Timer: ${timerText}`);
    } catch {
      console.warn("⚠️ Failed to read timer.");
    }
    await new Promise(res => setTimeout(res, 30000));
  }
}

async function run() {
  const MAX_RETRIES = 10;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`\n🔁 Attempt #${attempt}`);

    const browser = await webkit.launch({ headless: true }); // ✅ headless webkit
    const context = await browser.newContext();
    await context.addCookies(cookiePairs);
    const page = await context.newPage();

    try {
      console.log("🚀 Navigating to dashboard...");
      await page.goto('https://litefaucet.in/dashboard', { waitUntil: 'domcontentloaded' });

      await humanDelay(1500, 3000);

      console.log("🎯 Navigating to /smm/watch...");
      await page.goto('https://litefaucet.in/smm/watch', { waitUntil: 'domcontentloaded' });

      console.log("📍 Current URL:", page.url());
      if (!page.url().includes('/smm/watch')) {
        console.warn("⚠️ Redirected to:", page.url());
        await browser.close();
        const wait = Math.floor(Math.random() * 4000) + 2000;
        console.warn(`⏳ Waiting ${wait}ms before retry...`);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }

      console.log("✅ Arrived at /smm/watch!");
      await humanDelay(1500, 3000);

      console.log("🧩 Waiting for iframe...");
      const frameElement = await page.waitForSelector('iframe#youtube-player', { timeout: 5000 });
      const frame = await frameElement.contentFrame();

      if (frame) {
        console.log("👆 Hovering before clicking...");
        await frame.hover('body');
        await humanDelay(500, 1500);

        console.log("▶️ Clicking YouTube player...");
        await frame.click('body');

        console.log("🎥 Waiting for video to trigger timer...");
        const timerStarted = await waitForTimerStart(page);

        if (timerStarted) {
          await logTimerEvery30Seconds(page, 5 * 60 * 1000);
        }
      } else {
        console.warn("❌ Could not find iframe.");
      }

      await browser.close();
      return;

    } catch (err) {
      console.error("❌ Error:", err.message);
    }

    await browser.close();
    console.log("🧹 Browser closed. Retrying...");
  }

  console.error(`💥 Failed after ${MAX_RETRIES} attempts.`);
  process.exit(1);
}

run();
