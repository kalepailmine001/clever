const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Add cookies
  await context.addCookies([
    { name: '_ga', value: 'GA1.1.1977291753.1752922789', domain: 'litefaucet.in', path: '/' },
    { name: 'bitmedia_fid', value: 'eyJmaWQiOiI5ZTkwN2M2NmYyYjZmMzRhNjY3OGQwNWVjOWQwNjEyZCIsImZpZG5vdWEiOiJkYzIyYzQ1OGMzMThmYzdkNjgxMTIyMjMzZWRiMzNkNCJ9', domain: 'litefaucet.in', path: '/' },
    { name: 'ci_session', value: 'ook7gk7g3h1gm5jknd8nif4hea0i85s6', domain: 'litefaucet.in', path: '/' },
    { name: 'csrf_cookie_name', value: '8ee60ed5107f1f2f5e909226e263a5e4', domain: 'litefaucet.in', path: '/' },
    { name: '_ga_3J1CNV3M98', value: 'GS2.1.s1753082926$o7$g1$t1753082964$j22$l0$h0', domain: 'litefaucet.in', path: '/' },
  ]);

  const page = await context.newPage();
  await page.goto('https://litefaucet.in/smm/watch');

  // Wait for the network to be idle (all requests done)
  await page.waitForLoadState('networkidle');

  // Try to find iframe and play button inside
  const frames = page.frames();
  const ytFrame = frames.find(f => f.url().includes('youtube.com/embed'));

  if (ytFrame) {
    try {
      await ytFrame.waitForSelector('.ytp-large-play-button', { timeout: 10000 });
      await ytFrame.click('.ytp-large-play-button');
      console.log('✅ Play button clicked!');
    } catch (e) {
      console.log('❌ Play button not found inside iframe.');
    }
  } else {
    console.log('❌ YouTube iframe not found.');
  }

  await page.waitForTimeout(5000);
  await browser.close();
})();
