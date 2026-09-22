// Run against an already-started Astro dev or preview server:
// node scripts/check-ai-development-page.mjs http://localhost:4321
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2];
assert(base, 'Supply the local Astro server URL.');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(new URL('/tutorials/ai-assisted-development-on-jetson/', base).href);
  assert.equal(response.status(), 200);
  await page.locator('#choose-an-agent [role="tablist"]').waitFor();
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('#ai-development h1').count(), 1);
  assert.equal(await page.locator('.agent-prompt').count(), 10);
  assert.equal(await page.locator('#f6 a', { hasText: 'Jetson Agent Skills guide' }).getAttribute('href'), '/tutorials/jetson-agent-skills/');
  const before = page.locator('[data-comparison="before"] .phase');
  const after = page.locator('[data-comparison="after"] .phase');
  assert.equal(await before.count(), 6);
  assert.deepEqual(await before.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))), [
    'Product design', 'Data & setup', 'Tools & experiments', 'Product implementation', 'Optimize & integrate', 'Validate & release',
  ]);
  assert.deepEqual(await before.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))),
    await after.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))));
  assert.equal(await page.locator('.impact-research a').count(), 3);
  assert((await page.locator('#impact-caption').textContent()).includes('not measured results or guaranteed time savings'));
  assert.deepEqual(await page.locator('iframe').evaluateAll((frames) => frames.map((frame) => frame.src)), [
    'https://www.youtube-nocookie.com/embed/un8h0gDTB60',
    'https://www.youtube-nocookie.com/embed/TJ6hXRGTRgA',
  ]);
  assert.equal(await page.locator('iframe[allowfullscreen][title][loading="lazy"]').count(), 2);

  const missing = await page.locator('#ai-development a[href^="#"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')).filter((hash) => !document.getElementById(hash.slice(1))));
  assert.deepEqual(missing, [], 'Broken on-page links');
  const ids = await page.locator('#ai-development [id]').evaluateAll((elements) => elements.map((el) => el.id));
  assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');

  const tabs = page.locator('#choose-an-agent [role="tab"]');
  assert.equal(await tabs.count(), 5);
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#agent-panel-0').isVisible(), false);
  await page.keyboard.press('Home');
  assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');

  // Exercise copying without relying on the test machine's clipboard permissions.
  await page.evaluate(() => {
    const capture = (value) => { window.__copiedPrompt = value; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => capture(value) } });
    document.execCommand = (command) => {
      if (command !== 'copy') return false;
      capture(document.activeElement.value);
      return true;
    };
  });
  for (let number = 1; number <= 10; number++) {
    const id = 'f' + number;
    assert.equal(await page.locator('#' + id + ' summary span').textContent(), 'Step ' + number);
    await page.locator('#' + id + ' summary').click();
    await page.locator('[data-copy-prompt="' + id + '"]').click();
    await page.waitForFunction((id) => document.querySelector('[data-copy-status="' + id + '"]').textContent.startsWith('Copied.'), id);
    assert.equal(await page.evaluate(() => window.__copiedPrompt), await page.locator('#' + id + '-text').textContent());
    await page.locator('#' + id + ' summary').click();
  }
  const wifiPrompt = await page.locator('#f2-text').textContent();
  assert(wifiPrompt.includes('locally, not in this chat'));
  await page.evaluate(() => { location.hash = 'f8'; });
  await page.waitForFunction(() => document.getElementById('f8').open);

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert(size.content <= size.viewport, 'Page overflows at ' + width + 'px');
    const figureSize = await page.locator('.impact-comparison').evaluate((el) => ({ content: el.scrollWidth, viewport: el.clientWidth }));
    assert(figureSize.content <= figureSize.viewport, 'Comparison figure overflows at ' + width + 'px');
    for (let index = 0; index < 6; index++) {
      const beforeWidth = (await before.nth(index).boundingBox()).width;
      const afterWidth = (await after.nth(index).boundingBox()).width;
      if ([0, 3, 5].includes(index)) assert(Math.abs(beforeWidth - afterWidth) < 1, 'Protected phase width changed');
      else assert(afterWidth < beforeWidth, 'Agent-assisted phase is not shorter');
    }
  }
  const internalPaths = await page.locator('#ai-development a[href^="/"]').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href').split('#')[0]))]);
  for (const path of internalPaths) {
    const result = await page.request.get(new URL(path, base).href);
    assert.equal(result.status(), 200, 'Broken internal link: ' + path);
  }
  for (const path of ['/tutorials/', '/tutorials/jetson-agent-skills/', '/tutorials/getting-started-with-jetson/']) {
    const result = await page.goto(new URL(path, base).href);
    assert.equal(result.status(), 200);
    const links = await page.locator('a[href]').evaluateAll((elements) => elements.map((el) => el.getAttribute('href').replace(/\/$/, '')));
    assert(links.includes('/tutorials/ai-assisted-development-on-jetson'), 'Missing landing-page link on ' + path);
  }
  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  console.log('PASS: two video embeds, ten prompt copies, tabs/keyboard, anchors, internal links, tutorial listing/crosslinks, mobile/tablet/desktop layout.');
  console.log('YouTube playback and captions must be checked manually on the presentation computer.');
} finally {
  await browser.close();
}
