const { webkit } = require('playwright');

// Console logging (simple)
const log = {
  step: (msg) => console.log(`[STEP] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function humanDelay(min = 1000, max = 3000) {
  return sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

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
      await page.goto('https://litefaucet.in/dashboard', { waitUntil: 'domcontentloaded' });
      await humanDelay();

      if (page.url().includes('/dashboard/adblock')) {
        log.error('Redirected to adblock page. Retrying...');
        await humanDelay(2000, 4000);
        continue;
      }

      log.success('Dashboard loaded successfully.');

      log.step('Visiting /smm/watch...');
      await page.goto('https://litefaucet.in/smm/watch', { waitUntil: 'domcontentloaded' });
      await humanDelay();

      if (page.url().includes('/dashboard/adblock')) {
        log.error('Blocked again on watch page. Retrying...');
        await humanDelay(2000, 4000);
        continue;
      }

      log.success('Watch page loaded.');

      log.step('Waiting for iframe...');
      const iframeElement = await page.waitForSelector('#youtube-player', { timeout: 15000 });
      const frame = await iframeElement.contentFrame();

      if (!frame) {
        log.error('Could not access iframe content.');
        continue;
      }

      log.step('Trying to click video play button...');
      await humanDelay(1000, 2500);
      await frame.click('button[aria-label="Play"], .ytp-large-play-button', { timeout: 8000 }).catch(() => {
        log.error('Play button not clickable or missing.');
      });

      log.success('Clicked video. Watching...');
      await humanDelay(25000, 35000); // Simulate watching

      success = true;
    } catch (err) {
      log.error(`Error: ${err.message}`);
      await humanDelay(2000, 4000);
    }
  }

  if (!success) {
    log.error('Failed after maximum retries.');
    process.exit(1);
  }

  log.success('Job complete.');
  await browser.close();
}

run();
