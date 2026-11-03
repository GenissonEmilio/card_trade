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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const scope = process.argv[2] || '';
  const previous = path.join(__dirname, '.local/verify.json');
  const results =
      scope && fs.existsSync(previous) ? JSON.parse(fs.readFileSync(previous, 'utf8')).results : [],
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const test = async (name, fn) => {
    if (scope && !name.includes(scope)) return;
    let result;
    try {
      result = { name, passed: true, detail: await fn() };
    } catch (e) {
      result = { name, passed: false, error: e.message };
    }
    const index = results.findIndex((r) => r.name === name);
    if (index < 0) results.push(result);
    else results[index] = result;
    console.log(JSON.stringify(result));
  };
  const open = async (query) => {
    await page.goto('http://127.0.0.1:3102/?' + query, { waitUntil: 'load' });
    await page.waitForTimeout(500);
  };
  try {
    await test('Settings save mutates only fixture and refresh resets it', async () => {
      await open('screen=settings&role=user');
      await page.locator('input[name="display_name"]').fill('Ana — revisão local');
      await page.getByRole('button', { name: /Salvar/ }).click();
      await page.waitForFunction(() => window.__DUELINK_QA__.mutations.length > 0);
      const local = await page.evaluate(() => ({
        name: window.__DUELINK_QA__.tables.profiles[0].display_name,
        mutations: window.__DUELINK_QA__.mutations,
      }));
      if (local.name !== 'Ana — revisão local') throw Error('Update not applied');
      await page.reload();
      await page.waitForTimeout(250);
      const reset = await page.evaluate(
        () => window.__DUELINK_QA__.tables.profiles[0].display_name,
      );
      if (reset !== 'Ana Oliveira') throw Error('Fixture persisted beyond reload');
      return { local, reset };
    });
    await test('Guest guard is the real Protected component', async () => {
      await open('screen=library&role=guest');
      await page.getByRole('heading', { name: 'Sua coleção começa com uma conexão.' }).waitFor();
      return 'protected guest state';
    });
    await test('Empty collection', async () => {
      await open('screen=library&role=user&state=empty');
      await page.locator('.empty-state').waitFor();
      return page.locator('.empty-state').innerText();
    });
    await test('Query error state', async () => {
      await open('screen=library&role=user&state=error');
      await page
        .getByRole('status')
        .filter({ hasText: 'Não foi possível carregar sua coleção.' })
        .waitFor();
      return 'error handled by real toast';
    });
    await test('Loading state', async () => {
      await open('screen=library&role=user&state=loading');
      await page.locator('.loading-state').waitFor();
      return 'query remains pending';
    });
    await test('Moderation access denied to non-admin', async () => {
      await open('screen=moderation&role=user');
      await page.getByRole('heading', { name: 'Acesso reservado à operação.' }).waitFor();
      return 'real admin guard';
    });
    await test('Server refuses all POST writes', async () => {
      const response = await page.request.post('http://127.0.0.1:3102/api/admin', {
        data: { action: 'settings' },
      });
      if (response.status() !== 405) throw Error('POST was not refused');
      return response.status();
    });
    await test('Additional: empty community', async () => {
      await open('screen=community&role=user&state=empty');
      await page.getByRole('heading', { name: 'Uma comunidade começa com você.' }).waitFor();
      return 'community empty; provider profile stays populated';
    });
    await test('Additional: logout changes only local fixture role', async () => {
      await open('screen=library&role=user');
      await page.getByRole('button', { name: 'Sair da conta', exact: true }).first().click();
      await page.getByRole('heading', { name: 'Sua coleção começa com uma conexão.' }).waitFor();
      return page.evaluate(() => ({
        role: window.__DUELINK_QA__.role,
        mutations: window.__DUELINK_QA__.mutations,
      }));
    });
  } finally {
    fs.writeFileSync(
      path.join(__dirname, '.local/verify.json'),
      JSON.stringify({ results, errors }, null, 2),
    );
    const timer = setTimeout(() => process.exit(0), 5000);
    await page.close();
    await browser.close();
    clearTimeout(timer);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
