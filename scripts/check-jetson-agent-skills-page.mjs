// Run against an already-started Astro dev or preview server:
// node scripts/check-jetson-agent-skills-page.mjs http://localhost:4321
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2];
assert(base, 'Supply the local Astro server URL.');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(new URL('/tutorials/jetson-agent-skills/', base).href);
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('#agent-skills-page h1').count(), 1);
  assert.equal(await page.locator('#catalog').count(), 0);

  const missingAnchors = await page.locator('#agent-skills-page a[href^="#"]').evaluateAll((links) =>
    links
      .map((link) => link.getAttribute('href'))
      .filter((hash) => !document.getElementById(hash.slice(1))));
  assert.deepEqual(missingAnchors, [], 'Broken on-page links');

  const tabs = page.locator('[data-install-tab]');
  assert.equal(await tabs.count(), 3);
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('[data-install-panel="codex"]').isVisible(), true);
  await page.keyboard.press('End');
  assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => { window.__copiedSkillCommand = value; } },
    });
  });
  await page.locator('[data-install-panel="claude"] [data-copy-value]').click();
  assert((await page.evaluate(() => window.__copiedSkillCommand)).includes('./install.sh --targets claude'));
  assert.equal(await page.locator('[data-install-panel="claude"] [data-copy-value]').textContent(), 'COPIED');

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    assert(dimensions.content <= dimensions.viewport, `Page overflows at ${width}px`);
  }

  for (const path of [
    '/tutorials/',
    '/tutorials/ai-assisted-development-on-jetson/',
    '/tutorials/reachy-mini-jetson-assistant/',
  ]) {
    const result = await page.request.get(new URL(path, base).href);
    assert.equal(result.status(), 200, `Broken internal link: ${path}`);
  }

  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  console.log('PASS: compact page, install tabs, copy actions, anchors, links, and responsive layout.');
} finally {
  await browser.close();
}
