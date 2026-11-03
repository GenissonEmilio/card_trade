const fs = require('fs'),
  path = require('path');
const {
  chromium,
} = require('playwright');
const output = path.join(__dirname, '.local/interactions');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.DUELINK_REVIEW_BROWSER || 'chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  const filters = process.argv.slice(2);
  const resultFile = path.join(output, 'results.json');
  const results =
      filters.length && fs.existsSync(resultFile)
        ? JSON.parse(fs.readFileSync(resultFile, 'utf8')).results
        : [],
    errors = [],
    external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1:3102') && !r.url().startsWith('data:'))
      external.push(r.url());
  });
  const open = async (query) => {
    await page.goto('http://127.0.0.1:3102/?' + query, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
  };
  const assert = (value, message) => {
    if (!value) throw Error(message);
  };
  const type = async (button) => {
    assert((await button.evaluate((e) => e.type)) === 'submit', 'Expected native submit button');
    return 'submit';
  };
  const mutated = async (predicate) => page.waitForFunction(predicate);
  const iconClick = async (button) => {
    await button.scrollIntoViewIfNeeded();
    const icon = await button.locator('.ds-action-icon').boundingBox();
    assert(icon, 'Icon wrapper missing');
    await page.mouse.click(icon.x + icon.width / 2, icon.y + icon.height / 2);
  };
  const test = async (name, fn) => {
    if (filters.length && !filters.some((filter) => name.includes(filter))) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let result;
    try {
      result = { name, passed: true, detail: await fn() };
      await page.screenshot({ path: path.join(output, key + '.png') });
    } catch (e) {
      result = { name, passed: false, error: e.message };
      await page.screenshot({ path: path.join(output, key + '-FAIL.png') }).catch(() => {});
    }
    const previous = results.findIndex((r) => r.name === name);
    if (previous < 0) results.push(result);
    else results[previous] = result;
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ results, errors, external }, null, 2),
    );
    console.log(JSON.stringify(result));
  };
  try {
    await test('Auth forgot and reset use interior shell', async () => {
      const routes = [];
      for (const screen of ['forgot', 'reset']) {
        await open(`screen=${screen}&role=guest`);
        routes.push(
          await page
            .locator('main')
            .evaluate((e) => ({ route: e.dataset.route, classes: e.className })),
        );
        assert((await page.locator('.ds-main').count()) === 1, 'Auth missing ds-main');
      }
      return routes;
    });
    await test('DS variants labels icon handlers and disabled', async () => {
      await open('screen=components&role=user');
      assert((await page.locator('[data-qa-variant]').count()) === 8, 'Missing action variants');
      assert((await page.locator('[data-qa-panel]').count()) === 3, 'Missing panels');
      assert((await page.locator('[data-qa-badge]').count()) === 5, 'Missing badges');
      const button = page.locator('[data-qa-variant="primary-regular"]');
      await iconClick(button);
      await page.getByRole('status').filter({ hasText: 'Cliques locais: 1' }).waitFor();
      await page.locator('[data-qa-disabled]').evaluate((e) => e.click());
      assert(
        (await page.locator('[data-qa-counter]').innerText()) === 'Cliques locais: 1',
        'Disabled handler fired',
      );
      await button.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const focus = await button.evaluate((e) => getComputedStyle(e).outlineStyle);
      assert(focus !== 'none', 'No visible keyboard focus');
      const labels = await page
        .locator('[data-qa-variant]')
        .evaluateAll((es) => es.map((e) => ({ label: e.textContent, disabled: e.disabled })));
      return { variants: labels, focus, disabledBlocked: true };
    });
    await test('DS form submit and modal keyboard close', async () => {
      const submit = page.getByRole('button', { name: 'Enviar formulário local' });
      await type(submit);
      await page.getByLabel('Nome local', { exact: true }).fill('Revisão local');
      await page.getByLabel('Nome local', { exact: true }).press('Enter');
      await page
        .getByRole('status')
        .filter({ hasText: 'Formulário local enviado: Revisão local' })
        .waitFor();
      for (const close of ['Escape', 'X', 'backdrop']) {
        await page.getByRole('button', { name: 'Abrir diálogo default' }).click();
        await page.getByRole('dialog').waitFor();
        assert(
          (await page.evaluate(() => document.body.style.overflow)) === 'hidden',
          'Background scroll not locked',
        );
        if (close === 'Escape') await page.keyboard.press('Escape');
        if (close === 'X') await page.getByRole('button', { name: 'Fechar', exact: true }).click();
        if (close === 'backdrop') await page.mouse.click(3, 3);
        await page.locator('dialog[open]').waitFor({ state: 'hidden' });
        assert(
          (await page.evaluate(() => document.body.style.overflow)) !== 'hidden',
          'Background remains locked',
        );
      }
      return { submit: 'submit', close: ['Escape', 'X', 'backdrop'] };
    });
    await test('DS ActionLink navigation', async () => {
      await page.locator('[data-qa-link="primary"]').click();
      await page.waitForURL('**screen=library**');
      await page.getByRole('heading', { name: 'Sua coleção, seu universo.' }).waitFor();
      return page.url();
    });
    await test('Library picker Enter submit and collection save', async () => {
      await open('screen=library&role=user');
      await page.getByRole('button', { name: 'Adicionar carta', exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.waitFor();
      const input = page.getByRole('textbox', { name: 'Nome ou código da carta' });
      await input.fill('Blue-Eyes');
      await input.press('Enter');
      await page.locator('.search-result').first().waitFor();
      await page.locator('.search-result').first().click();
      await page.getByRole('heading', { name: 'Uma nova carta na sua coleção' }).waitFor();
      const submit = page.getByRole('button', { name: 'Adicionar à coleção', exact: true });
      await type(submit);
      await page.getByLabel('Quantidade', { exact: true }).fill('2');
      await iconClick(submit);
      await mutated(() =>
        window.__DUELINK_QA__.mutations.some(
          (m) => m.table === 'collection_items' && m.kind === 'insert',
        ),
      );
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      return page.evaluate(() => window.__DUELINK_QA__.mutations);
    });
    await test('Deck create and save forms submit', async () => {
      await open('screen=decks&role=user');
      await page.getByRole('button', { name: 'Criar deck', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await type(dialog.getByRole('button', { name: 'Criar deck', exact: true }));
      await dialog.getByRole('textbox', { name: 'Nome do deck' }).fill('Deck de revisão');
      await dialog.getByRole('textbox', { name: 'Nome do deck' }).press('Enter');
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      await page.locator('input[name="name"]').fill('Deck revisado');
      const save = page.getByRole('button', { name: 'Salvar deck', exact: true });
      await type(save);
      await save.click();
      await mutated(() =>
        window.__DUELINK_QA__.tables.decks.some((d) => d.name === 'Deck revisado'),
      );
      return page.evaluate(() => window.__DUELINK_QA__.mutations);
    });
    await test('Deck mutation error and busy disabled', async () => {
      await open('screen=decks&role=user&state=mutation-error');
      await page.getByRole('button', { name: 'Criar deck', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Nome do deck' }).fill('Erro local');
      await dialog.getByRole('button', { name: 'Criar deck', exact: true }).click();
      await dialog.getByRole('alert').waitFor();
      const message = await dialog.getByRole('alert').innerText();
      assert(await dialog.isVisible(), 'Error unexpectedly closed dialog');
      await page.evaluate(() => {
        window.__DUELINK_QA__.state = 'loading';
      });
      await dialog.getByRole('button', { name: 'Criar deck', exact: true }).click();
      assert(
        await dialog.getByRole('button', { name: 'Criar deck', exact: true }).isDisabled(),
        'Pending action not disabled',
      );
      return { message, pendingDisabled: true };
    });
    await test('Settings submit via icon wrapper', async () => {
      await open('screen=settings&role=user');
      await page.getByLabel('Seu nome', { exact: true }).fill('Ana revisão do DS');
      const save = page.getByRole('button', { name: 'Salvar alterações', exact: true });
      await type(save);
      await iconClick(save);
      await mutated(
        () => window.__DUELINK_QA__.tables.profiles[0].display_name === 'Ana revisão do DS',
      );
      return page.evaluate(() => window.__DUELINK_QA__.mutations);
    });
    await test('Trade message submit accept and confirm', async () => {
      await open('screen=trade-detail&role=user&status=pending');
      const send = page.getByRole('button', { name: 'Enviar mensagem', exact: true });
      assert(await send.isDisabled(), 'Empty message send enabled');
      await type(send);
      await page
        .getByRole('textbox', { name: 'Sua mensagem', exact: true })
        .fill('Mensagem local de revisão');
      await page.getByRole('textbox', { name: 'Sua mensagem', exact: true }).press('Enter');
      await mutated(() =>
        window.__DUELINK_QA__.tables.messages.some(
          (m) => m.content === 'Mensagem local de revisão',
        ),
      );
      await page.getByRole('button', { name: 'Aceitar troca', exact: true }).click();
      await page
        .getByRole('button', { name: 'Confirmar que recebi a carta', exact: true })
        .waitFor();
      await page.getByRole('button', { name: 'Confirmar que recebi a carta', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Confirmar que recebi a carta', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirmar', exact: true })
        .click();
      await page.getByRole('button', { name: 'Sua entrega foi confirmada', exact: true }).waitFor();
      assert(
        await page
          .getByRole('button', { name: 'Sua entrega foi confirmada', exact: true })
          .isDisabled(),
        'Confirmed action not disabled',
      );
      return page.evaluate(() => window.__DUELINK_QA__.mutations);
    });
    await test('Marketplace quantity disabled and add form', async () => {
      await open('screen=marketplace&role=user');
      await page.getByRole('button', { name: 'Ver exemplar', exact: true }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const qty = dialog.getByRole('spinbutton', { name: 'Quantidade' }),
        submit = dialog.getByRole('button', { name: 'Adicionar ao carrinho', exact: true });
      await type(submit);
      await qty.fill('0');
      assert(await submit.isDisabled(), 'Quantity zero submit enabled');
      await qty.fill('1');
      await iconClick(submit);
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      const cart = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('duelink.marketplace.cart.v1')),
      );
      assert(cart.length > 0, 'Cart not updated');
      return { submit: 'submit', cart };
    });
    await test('Moderation approve submit and correction button', async () => {
      await open('screen=moderation&role=admin');
      await page.getByRole('button', { name: 'Conferir exemplar', exact: true }).first().click();
      let dialog = page.getByRole('dialog');
      let approve = dialog.getByRole('button', { name: 'Aprovar anúncio', exact: true });
      await type(approve);
      assert(await approve.isDisabled(), 'Unchecked approval enabled');
      await dialog.getByRole('checkbox').check();
      assert(await approve.isEnabled(), 'Checked complete listing cannot be approved');
      await approve.click();
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Conferir exemplar', exact: true }).first().click();
      dialog = page.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'Motivo da revisão ou observação' })
        .fill('A foto do verso precisa ficar mais nítida.');
      const correct = dialog.getByRole('button', { name: 'Solicitar correção', exact: true });
      assert(
        (await correct.evaluate((e) => e.type)) === 'button',
        'Correction action accidentally submits approval',
      );
      await correct.click();
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      const mutations = await page.evaluate(() => window.__DUELINK_QA__.mutations);
      assert(
        mutations.some((m) => m.rpc === 'admin_moderate_listing' && m.args.p_approved === true),
        'Approval RPC missing',
      );
      assert(
        mutations.some((m) => m.rpc === 'admin_moderate_listing' && m.args.p_approved === false),
        'Correction RPC missing',
      );
      return mutations;
    });
    await test('Admin settings form submit and role action', async () => {
      await open('screen=admin&role=admin');
      const save = page.getByRole('button', { name: 'Salvar configurações', exact: true });
      await type(save);
      await page.getByLabel(/^Comissão da plataforma em %/).fill('12.5');
      await iconClick(save);
      await mutated(() =>
        window.__DUELINK_QA__.mutations.some(
          (m) => m.api === '/api/admin' && m.body.commission_bps === 1250,
        ),
      );
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Tornar admin', exact: true }).first().click();
      await mutated(() =>
        window.__DUELINK_QA__.mutations.some(
          (m) => m.api === '/api/admin' && m.body.action === 'role',
        ),
      );
      return page.evaluate(() => window.__DUELINK_QA__.mutations);
    });
    await test('Admin mutation error remains recoverable', async () => {
      await open('screen=admin&role=admin&state=mutation-error');
      const save = page.getByRole('button', { name: 'Salvar configurações', exact: true });
      await save.click();
      await page.getByRole('alert').first().waitFor();
      assert(await save.isEnabled(), 'Failed save remains disabled');
      return page.getByRole('alert').first().innerText();
    });
  } finally {
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ results, errors, external }, null, 2),
    );
    console.log(
      JSON.stringify({
        passed: results.filter((r) => r.passed).length,
        total: results.length,
        errors,
        external,
      }),
    );
    const timeout = setTimeout(() => process.exit(0), 5000);
    await page.close();
    await browser.close();
    clearTimeout(timeout);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
