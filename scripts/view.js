const { webkit } = require('playwright');
const chalk = require('chalk');

function logStep(msg) {
  console.log(chalk.blue(`[STEP] ${msg}`));
}

function logError(msg) {
  console.error(chalk.red(`[ERROR] ${msg}`));
}

function logSuccess(msg) {
  console.log(chalk.green(`[SUCCESS] ${msg}`));
}

// Convert raw cookie string to Playwright-compatible array
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

// Random human-like delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(delay);
}

async function run() {
  logStep('Launching browser (WebKit)...');
  const browser = await webkit.launch({ headless: true });

  const context = await browser.newContext();

  const cookieString = process.env.LITEFAUCET_COOKIES;
  if (!cookieString) {
    logError('Environment variable LITEFAUCET_COOKIES is missing!');
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
    logStep(`Navigating to dashboard (Attempt ${attempt})...`);
    try {
      await page.goto('https://litefaucet.in/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay();
      if (page.url().includes('/dashboard/adblock')) {
        logError('Redirected to adblock page, retrying...');
        continue;
      }

      logSuccess('Dashboard loaded successfully.');

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

      logStep('Clicking play button...');
      await humanDelay(1000, 2500);
      await frame.click('button[aria-label="Play"], .ytp-large-play-button', { timeout: 10000 }).catch(() => {
        logError('Play button not found or failed to click.');
      });

      logSuccess('Video clicked successfully.');
      logStep('Watching for ~30 seconds...');
      await humanDelay(25000, 35000); // Let the video play

      success = true;
    } catch (error) {
      logError(`Exception: ${error.message}`);
      await humanDelay(2000, 4000);
    }
  }

  if (!success) {
    logError('Max attempts reached. Exiting script with failure.');
    process.exit(1);
  }

  logSuccess('Finished job. Closing browser...');
  await browser.close();
}

run();
