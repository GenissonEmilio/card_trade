const fs = require('fs'),
  path = require('path');
const {
  chromium,
} = require('playwright');
const dir = path.join(__dirname, '.local');
const screens =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [
        'library',
        'wishlist',
        'decks',
        'settings',
        'profile',
        'community',
        'matches',
        'trades',
        'trade-detail',
        'marketplace',
        'seller',
        'orders',
        'order-detail',
        'admin',
        'moderation',
      ];
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.DUELINK_REVIEW_BROWSER || 'chrome',
  });
  const results = [];
  try {
    for (const screen of screens) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [],
        external = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (new URL(r.url()).origin !== 'http://127.0.0.1:3102' && !r.url().startsWith('data:'))
          external.push(r.url());
      });
      const role = ['admin', 'moderation'].includes(screen) ? 'admin' : 'user';
      const url = `http://127.0.0.1:3102/?screen=${screen}&role=${role}&state=populated`;
      await page.goto(url, { waitUntil: 'load', timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(750);
      const result = await page.evaluate(() => ({
        title: document.title,
        headings: [...document.querySelectorAll('h1,h2')].map((e) => e.textContent),
        loading: document.querySelectorAll('.loading-state').length,
        boundary: document.querySelector('[data-qa-error]')?.textContent || null,
        queries: window.__DUELINK_QA__?.log,
        images: [...document.images]
          .filter((i) => !i.complete || !i.naturalWidth)
          .map((i) => i.src),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      results.push({ screen, role, url, errors, external, ...result });
      await page.screenshot({ path: path.join(dir, screen + '.png'), fullPage: true });
      await page.close();
      fs.writeFileSync(path.join(dir, 'scan.json'), JSON.stringify(results, null, 2));
      console.log(
        JSON.stringify({
          screen,
          errors,
          boundary: result.boundary,
          loading: result.loading,
          headings: result.headings.slice(0, 3),
        }),
      );
    }
  } finally {
    const timer = setTimeout(() => process.exit(0), 5000);
    await browser.close();
    clearTimeout(timer);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
