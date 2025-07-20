const { webkit } = require('playwright');

// Log helpers (no colors)
function logStep(msg) {
  console.log(`[STEP] ${msg}`);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
}

function logSuccess(msg) {
  console.log(`[SUCCESS] ${msg}`);
}

// Convert cookie string into Playwright cookie format
function parseCookies(cookieString) {
  return cookieString.split(';').map(cookie => {
    const [name, ...val] = cookie.trim().split('=');
    return {
      name,
      value: val.join('='),
      domain: 'litefaucet.in',
      path: '/',
    };
  });
}

// Human-like delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
}

async function run() {
  logStep('Launching WebKit browser...');
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext();

  const cookieString = process.env.LITEFAUCET_COOKIES;
  if (!cookieString) {
    logError('Missing LITEFAUCET_COOKIES environment variable.');
    process.exit(1);
  }

  const cookies = parseCookies(cookieString);
  await context.addCookies(cookies);

  const page = await context.newPage();

  let maxAttempts = 5;
  let attempt = 0;
  let success = false;

  while (attempt < maxAttempts && !success) {
    attempt++;
    logStep(`Attempt ${attempt}: Navigating to dashboard...`);
    try {
      await page.goto('https://litefaucet.in/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay();

      if (page.url().includes('/dashboard/adblock')) {
        logError('Redirected to adblock page, retrying...');
        continue;
      }

      logSuccess('Dashboard loaded.');

      logStep('Navigating to watch page...');
      await page.goto('https://litefaucet.in/smm/watch', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay();

      if (page.url().includes('/dashboard/adblock')) {
        logError('Blocked again on watch page, retrying...');
        continue;
      }

      logSuccess('Watch page loaded.');

      logStep('Waiting for YouTube iframe...');
      const iframeElement = await page.waitForSelector('#youtube-player', { timeout: 15000 });

      const frame = await iframeElement.contentFrame();

      if (!frame) {
        logError('Failed to access YouTube iframe.');
        continue;
      }

      logStep('Trying to click play on video...');
      await humanDelay(1000, 2500);
      await frame.click('button[aria-label="Play"], .ytp-large-play-button').catch(() => {
        logError('Play button not found or not clickable.');
      });

      logSuccess('Clicked video. Watching...');
      await humanDelay(25000, 35000);

      success = true;
    } catch (err) {
      logError(`Exception: ${err.message}`);
      await humanDelay(2000, 4000);
    }
  }

  if (!success) {
    logError('Max retries reached. Exiting...');
    process.exit(1);
  }

  logSuccess('Script completed successfully.');
  await browser.close();
}

run();
