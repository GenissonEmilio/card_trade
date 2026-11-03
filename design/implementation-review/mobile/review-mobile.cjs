const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:3000';
  const fixture = process.argv.includes('--fixture');
  const output = __dirname;
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  try {
    for (const width of [390, 360, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      if (fixture) {
        const featured = require('../../../src/lib/featured.json').data;
        const ids = ['89631139','44508094','74677422','23995346','10045474','46986414','55144522','12580477'];
        const data = ids.map(id => ({ ...featured.find(c => String(c.id) === id), id, game: 'yugioh' }));
        await page.route('**/api/cards?*', route => route.fulfill({ json: { data, total: 14617, hasMore: true, syncedAt: '2026-10-19T00:00:00Z', coverage: { imported: 14617, withPortugueseName: 10887 } } }));
      }
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(output, `${width}-top.png`) });
      const catalog = page.locator('#explorar');
      if (await catalog.count()) {
        await page.waitForFunction(() => !document.querySelector('.card-skeleton'), null, { timeout: 35000 }).catch(() => {});
        await catalog.evaluate(e => window.scrollTo(0, e.getBoundingClientRect().top + scrollY));
        await page.screenshot({ path: path.join(output, `${width}-catalog-controls.png`) });
      }
      const firstCard = page.locator('.card-tile, article.card').first();
      if (await firstCard.count()) {
        await firstCard.evaluate(e => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 10));
        await page.waitForFunction(() => [...document.querySelectorAll('.cards-grid .card-art')].slice(0, 4).every(e => e.complete && e.naturalWidth > 0), null, { timeout: 25000 }).catch(() => {});
        await page.evaluate(async () => {
          await Promise.race([new Promise(resolve => { const img = new Image(); img.onload = resolve; img.onerror = resolve; img.src = '/brand/pixel/panel-card.svg'; }), new Promise(resolve => setTimeout(resolve, 5000))]);
        });
        await page.screenshot({ path: path.join(output, `${width}-cards.png`) });
      }
      const footer = page.locator('footer').first();
      if (await footer.count()) { await footer.evaluate(e => window.scrollTo(0, e.getBoundingClientRect().top + scrollY)); await page.screenshot({ path: path.join(output, `${width}-footer.png`) }); }
      const report = await page.evaluate(() => {
        const rect = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, width: b.width, height: b.height, right: b.right, bottom: b.bottom + scrollY }; };
        const visible = e => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
        const cards = [...document.querySelectorAll('.card-tile, article.card')].slice(0, 8);
        return {
          width: innerWidth, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
          title: document.querySelector('h1')?.textContent,
          sections: [...document.querySelectorAll('.topbar,.nav,.hero,.stats-strip,.stats,#explorar,.bottom-cta,.closing,footer')].filter(visible).map(e => ({ class: e.className, ...rect(e) })),
          textOutside: [...document.querySelectorAll('h1,h2,h3,p,.button,.card-name,.card-bottom,.catalog-controls,.catalog-tabs')].filter(visible).filter(e => { const b = e.getBoundingClientRect(); return b.left < -1 || b.right > innerWidth + 1; }).map(e => ({ class: e.className, text: e.textContent.trim().slice(0, 100), ...rect(e) })),
          cards: cards.map(c => { const label = c.querySelector('.catalog-label,.card-bottom>div'); const add = c.querySelector('.card-add'); const bottom = c.querySelector('.card-bottom'); const name = c.querySelector('.card-name'); return { name: name?.textContent, card: rect(c), label: label ? rect(label) : null, action: add ? rect(add) : null, footer: bottom ? rect(bottom) : null, nameBox: name ? rect(name) : null }; }),
          unloadedImages: [...document.images].filter(visible).filter(e => !e.complete || e.naturalWidth === 0).map(e => e.getAttribute('src')),
          loadedFonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family),
        };
      });
      results.push({ fixture, ...report, errors });
      await page.close();
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
