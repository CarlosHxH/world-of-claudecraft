// Visual proof of PR #1965's crafted caster-stat (int/spi) gear: 3 common-tier
// pieces (Eastbrook Ritual Vestments / Druid's Hide / Warded Leggings) and 3
// hub-tier rares (Wardweave Cowl, Duskhide Wraps, Sootscale Mantle). Boots the
// offline game as a priest (cloth caster), drops all six new items into the
// bags, hovers each for a tooltip capture (stats visible: int/spi/armor), then
// equips the hub-tier cowl and shoots the character sheet paperdoll + stat
// panel to prove the equip path and stat totals both work end to end.
//   node scripts/caster_gear_shot.mjs    (needs `npm run dev` on :5173)
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

import { BROWSER_PATH as EDGE } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT_DIR ?? 'docs/screenshots/crafting-caster-gear';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=1600,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
const jsClick = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) throw new Error(`missing ${s}`);
    el.click();
  }, sel);
await wait(400);
await jsClick('#btn-offline');
await wait(300);
await page.type('#char-name', 'Wardweaver');
await jsClick('#offline-select .mini-class[data-class="priest"]');
await jsClick('#btn-start-offline');
await page.waitForFunction(() => window.__game?.sim?.player, { timeout: 90000 });
await wait(2000);

// Dismiss the new-adventurer tutorial overlay and the camera-choice prompt.
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /skip tutorial/i.test(b.textContent || ''),
  );
  btn?.click();
  document.querySelector('.camera-prompt-confirm')?.click();
});
await wait(400);

const NEW_ITEMS = [
  ['eastbrook_ritual_vestments', 'Eastbrook Ritual Vestments'],
  ['eastbrook_druids_hide', "Eastbrook Druid's Hide"],
  ['eastbrook_warded_leggings', 'Eastbrook Warded Leggings'],
  ['wardweave_cowl', 'Wardweave Cowl'],
  ['duskhide_wraps', 'Duskhide Wraps'],
  ['sootscale_mantle', 'Sootscale Mantle'],
];

const inv = await page.evaluate((ids) => {
  const sim = window.__game.sim;
  for (const [id] of ids) sim.addItem(id, 1, sim.player.id);
  return sim.inventory.map((s) => s.itemId);
}, NEW_ITEMS);
console.log('inventory set:', JSON.stringify(inv));

await page.keyboard.press('b');
await wait(700);
const bagCount = await page.evaluate(() => document.querySelectorAll('#bags .bag-item').length);
console.log('bag rows:', bagCount);

async function hoverItem(name, shot) {
  await page.mouse.move(10, 10);
  await wait(120);
  const ok = await page.evaluate((nm) => {
    const rows = [...document.querySelectorAll('#bags .bag-item')];
    const row = rows.find((r) => (r.getAttribute('aria-label') || '').includes(nm));
    if (!row) return false;
    const b = row.getBoundingClientRect();
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    for (const type of ['mouseenter', 'mouseover', 'mousemove']) {
      row.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
    }
    return true;
  }, name);
  if (!ok) {
    console.log('row not found:', name);
    return false;
  }
  await wait(300);
  const tip = await page.evaluate(() => {
    const tt = document.querySelector('#tooltip');
    return {
      shown: tt && tt.style.display === 'block',
      text: tt?.innerText?.replace(/\n/g, ' | '),
    };
  });
  console.log(`tooltip[${name}]:`, JSON.stringify(tip));
  if (!tip.shown) return false;
  // Comparison tooltips (an upgrade over currently-equipped gear) render a second
  // "if you equip this" block that can settle its final layout a beat after the
  // base tooltip's display flips to block; poll for a stable non-zero rect
  // instead of racing a fixed wait against that second layout pass.
  let box = { x: 0, y: 0, w: 0, h: 0 };
  for (let i = 0; i < 20; i++) {
    await wait(150);
    box = await page.evaluate(() => {
      const tt = document.querySelector('#tooltip');
      const b = tt.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    if (box.w > 0 && box.h > 0) break;
  }
  if (box.w === 0 || box.h === 0) {
    console.log(`tooltip[${name}]: box never settled, skipping`);
    return false;
  }
  const pad = 8;
  await page.screenshot({
    path: shot,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.w + pad * 2,
      height: box.h + pad * 2,
    },
  });
  return true;
}

for (const [id, name] of NEW_ITEMS) {
  const slug = id.replace(/_/g, '-');
  const shot = `${OUT}/after-tooltip-${slug}.png`;
  const ok = await hoverItem(name, shot);
  if (!ok) {
    console.log(`retrying ${name} once`);
    await hoverItem(name, shot);
  }
}

// Equip the hub-tier Wardweave Cowl and shoot the character sheet to prove the
// equip path and the paperdoll/stat panel both reflect the new int/spi gear.
// Wardweave Cowl is level-20-gated (item_level.ts), so bump the character to
// 20 first: this is the same offline dev lever the other shot scripts use.
await page.mouse.move(10, 10);
await wait(120);
const equipped = await page.evaluate(() => {
  const sim = window.__game.sim;
  sim.setPlayerLevel?.(20, sim.player.id);
  try {
    sim.equipItem?.('wardweave_cowl', sim.player.id);
  } catch {}
  return sim.equipment?.helmet === 'wardweave_cowl';
});
console.log('equipped wardweave_cowl:', equipped);

await page.evaluate(() => window.__game?.hud?.toggleBags?.()); // close bags
await wait(300);
// The camera-choice prompt can still be up at this point; clear it before the
// character window opens so the shot is not blocked by an unrelated dialog.
await page.evaluate(() => document.querySelector('.camera-prompt-confirm')?.click());
await wait(300);
await page.evaluate(() => window.__game?.hud?.toggleChar?.()); // open character sheet
await wait(700);
await page.evaluate(() => document.querySelector('.camera-prompt-confirm')?.click());
await wait(300);
const sheetOpen = await page.evaluate(() => {
  const el = document.querySelector('#char-window');
  return !!el && getComputedStyle(el).display !== 'none';
});
console.log('char sheet open:', sheetOpen);
if (sheetOpen) {
  await page.screenshot({
    path: `${OUT}/after-paperdoll-wardweave-cowl.png`,
    clip: await page.evaluate(() => {
      const b = document.querySelector('#char-window').getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }),
  });
} else {
  await page.screenshot({ path: `${OUT}/after-paperdoll-wardweave-cowl.png` });
}

await browser.close();
