// Start the site, then run: node scripts/check-liquid-d1-models.mjs http://127.0.0.1:4321
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const base = process.argv[2];
assert(base, 'Supply the local Astro server URL.');
const models = ['d1-3b', 'd1-omni-600m'];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mkdir('.screenshots/liquid-d1', { recursive: true });
  await page.goto(new URL('/models/', base).href);
  assert.equal(await page.locator('.model-family-group').first().getAttribute('data-family'), 'Liquid AI d1');
  const featured = page.locator('#featured-models-section .model-catalog-card');
  assert.deepEqual(await featured.evaluateAll((cards) => cards.map((card) => card.dataset.name)), [
    'd1-3b', 'd1-omni-600m', 'flux 3 action', 'qwen3.8 flash next',
  ]);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await featured.first().locator('..').evaluate((row) => { row.scrollLeft = 0; });
    const first = await featured.first().boundingBox();
    assert(first.x >= 0 && first.x + first.width <= width, `First featured model is clipped at ${width}px`);
    await featured.last().scrollIntoViewIfNeeded();
    const last = await featured.last().boundingBox();
    assert(last.x >= 0 && last.x + last.width <= width, `Last featured model is unreachable at ${width}px`);
  }
  await featured.first().scrollIntoViewIfNeeded();
  await page.locator('#featured-models-section').screenshot({ path: '.screenshots/liquid-d1/featured.png' });
  await page.locator('#model-search-cards').fill('d1');
  const family = page.locator('[data-family="Liquid AI d1"]');
  assert(await family.isVisible(), 'New family missing from filtered catalog');
  assert.equal(await page.locator('.model-card:visible').count(), 2);
  for (const slug of models) {
    assert(await family.locator(`a[href="/models/${slug}"]`).isVisible());
  }
  await family.screenshot({ path: '.screenshots/liquid-d1/family.png' });
  await page.locator('[data-view="table"]').click();
  assert.equal(await page.locator('.model-table-row:visible').count(), 2);
  for (const slug of models) {
    await page.locator(`#models-table-body a[href="/models/${slug}"]`).click();
    assert.equal(new URL(page.url()).pathname.replace(/\/$/, ''), `/models/${slug}`);
    assert.equal(await page.locator('h1').count(), 1);
    const content = page.locator('#model-details');
    assert(await content.getByRole('heading', { name: '1. Prerequisites' }).isVisible());

    // Check exactly what a reader copies, including the Python indentation.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => { window.__copiedCode = text; } },
      });
    });
    const blocks = content.locator('pre');
    for (const block of await blocks.all()) {
      const code = await block.locator('code').textContent();
      await block.locator('..').getByRole('button', { name: 'Copy to clipboard' }).click();
      assert.equal(await page.evaluate(() => window.__copiedCode), code);
      const lang = await block.getAttribute('data-language');
      const check = lang === 'python'
        ? spawnSync('python3', ['-c', 'import ast, sys; ast.parse(sys.stdin.read())'], { input: code, encoding: 'utf8' })
        : lang === 'bash'
          ? spawnSync('bash', ['-n'], { input: code, encoding: 'utf8' })
          : null;
      if (check) assert.equal(check.status, 0, check.stderr);
    }
    const internalLinks = await content.locator('a[href^="/"]').evaluateAll((links) =>
      [...new Set(links.map((link) => link.getAttribute('href')))]);
    for (const link of internalLinks) {
      assert.equal((await page.request.get(new URL(link, base).href)).status(), 200, link);
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${slug} overflows at ${width}px`);
      await page.screenshot({ path: `.screenshots/liquid-d1/${slug}-${width}.png`, fullPage: true });
    }
    await page.goto(new URL('/models/', base).href);
    await page.locator('[data-view="table"]').click();
  }
  const index = await page.request.get(new URL('/llms.txt', base).href);
  const text = await index.text();
  assert(text.includes('### Liquid AI Models'));
  for (const slug of models) assert(text.includes(`/models/${slug}/`));
  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  console.log('PASS: family cards, catalog search/table links, model pages, code copying/syntax, sibling links, mobile/desktop layout, llms.txt.');
  console.log('Screenshots: .screenshots/liquid-d1/. Jetson GPU inference was not executed by this check.');
} finally {
  await browser.close();
}
