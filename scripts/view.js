const { webkit } = require('playwright');

// Logging
const log = {
  step: (msg) => console.log(`[STEP] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
};

// Sleep helpers
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function humanDelay(min = 1000, max = 3000) {
  return sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

// Cookie parser for Playwright
function parseCookies(cookieStr) {
  return cookieStr.split(';').map(c => {
    const [name, ...rest] = c.trim().split('=');
    return {
      name,
      value: rest.join('='),
      domain: 'litefaucet.in',
      path: '/',
    };
  });
}

async function run() {
  const cookiesRaw = process.env.LITEFAUCET_COOKIES;
  if (!cookiesRaw) {
    log.error('Missing LITEFAUCET_COOKIES environment variable!');
    process.exit(1);
  }

  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const cookies = parseCookies(cookiesRaw);
  await context.addCookies(cookies);

  let maxRetries = 5;
  let attempt = 0;
  let success = false;

  while (attempt < maxRetries && !success) {
    attempt++;
    log.step(`Attempt ${attempt}: Visiting dashboard...`);

    try {
      await page.goto('https://litefaucet.in/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay();

      if (page.url().includes('/dashboard/adblock')) {
        log.error('Redirected to adblock page. Retrying...');
        await humanDelay(2000, 4000);
        continue;
      }

      log.success('Dashboard loaded successfully.');

      log.step('Visiting /smm/watch...');
      await page.goto('https://litefaucet.in/smm/watch', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await humanDelay();

      if (page.url().includes('/dashboard/adblock')) {
        log.error('Blocked again on watch page. Retrying...');
        await humanDelay(2000, 4000);
        continue;
      }

      log.success('Watch page loaded.');

      log.step('Waiting for iframe...');
      try {
        const iframeElement = await page.waitForSelector('#youtube-player', {
          timeout: 30000,
          state: 'attached',
        });

        const frame = await iframeElement.contentFrame();

        if (!frame) {
          log.error('Iframe found but could not get frame context.');
          continue;
        }

        log.step('Clicking play button in iframe...');
        await humanDelay(1000, 2500);

        await frame.click('button[aria-label="Play"], .ytp-large-play-button', { timeout: 10000 })
          .catch(() => {
            log.error('Play button not found or not clickable.');
          });

        log.success('Clicked video. Watching...');
        await humanDelay(25000, 35000);
        success = true;

      } catch (iframeErr) {
        log.error(`Iframe not found or load error: ${iframeErr.message}`);

        // Debug info: show all iframes on page
        const iframeHandles = await page.$$('iframe');
        log.step(`Found ${iframeHandles.length} iframe(s) on page.`);
        for (const iframe of iframeHandles) {
          const id = await iframe.getAttribute('id');
          const src = await iframe.getAttribute('src');
          log.step(` - iframe ID: ${id || '(none)'}, src: ${src || '(none)'}`);
        }

        await humanDelay(2000, 4000);
        continue;
      }

    } catch (err) {
      log.error(`Navigation error: ${err.message}`);
      await humanDelay(2000, 4000);
    }
  }

  if (!success) {
    log.error('Failed after maximum retries.');
    await browser.close();
    process.exit(1);
  }

  log.success('Script completed successfully.');
  await browser.close();
}

run();
