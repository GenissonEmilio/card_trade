const fs = require('fs'),
  path = require('path');
const {
  chromium,
} = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.DUELINK_REVIEW_BROWSER || 'chrome',
  });
  const results = [];
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto('http://127.0.0.1:3102/?screen=components&role=user');
      await page.evaluate(() => document.fonts.ready);
      const primary = page.locator('[data-qa-variant="primary-regular"]');
      await primary.click();
      await primary.click();
      if ((await page.locator('[data-qa-counter]').innerText()) !== 'Cliques locais: 2')
        throw Error('Primary handlers did not execute twice');
      const result = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        headings: [...document.querySelectorAll('main h1, main h2')].map((e) => e.textContent),
        variants: document.querySelectorAll('[data-qa-variant]').length,
        panels: document.querySelectorAll('[data-qa-panel]').length,
        badges: document.querySelectorAll('[data-qa-badge]').length,
        actions: [...document.querySelectorAll('[data-qa-variant], [data-qa-link]')].map((e) => ({
          variant: e.dataset.qaVariant || e.dataset.qaLink,
          tag: e.tagName,
          color: getComputedStyle(e).color,
          background: getComputedStyle(e, '::before').backgroundImage,
        })),
        clickCounter: document.querySelector('[data-qa-counter]').textContent,
        expectedPrimaryColor: (() => {
          const token = document.createElement('span');
          token.style.color = 'var(--ds-ink)';
          document.body.append(token);
          const color = getComputedStyle(token).color;
          token.remove();
          return color;
        })(),
        clipped: [...document.querySelectorAll('main button, main a, main input')]
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && (b.left < 0 || b.right > innerWidth);
          })
          .map((e) => e.textContent),
      }));
      for (const action of result.actions.filter((a) => a.variant.startsWith('primary'))) {
        if (!action.background.includes('ribbon-primary.svg'))
          throw Error('Primary background mismatch at ' + width);
        if (action.color !== result.expectedPrimaryColor)
          throw Error('Primary foreground mismatch: ' + action.color);
      }
      await page.screenshot({
        path: path.join(__dirname, `.local/components-${width}.png`),
        fullPage: true,
      });
      results.push(result);
      await page.close();
    }
  } finally {
    fs.writeFileSync(
      path.join(__dirname, '.local/components-review.json'),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
    const timer = setTimeout(() => process.exit(0), 5000);
    await browser.close();
    clearTimeout(timer);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
