const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const BASE = 'http://localhost:4173/';
const OUT = __dirname + '/out';
fs.mkdirSync(OUT, { recursive: true });
let browser = null;
async function getBrowser() {
  if (!browser) browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  return browser;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Bot {
  constructor(name) { this.name = name; this.log = []; this.errors = []; }
  async open(query) {
    const b = await getBrowser();
    this.ctx = await b.newContext({ viewport: { width: +(process.env.VW || 960), height: +(process.env.VH || 540) } });
    this.page = await this.ctx.newPage();
    this.files = { video: `${OUT}/${this.name}.video.webm`, audio: `${OUT}/${this.name}.audio.webm` };
    for (const f of Object.values(this.files)) fs.writeFileSync(f, Buffer.alloc(0));
    await this.page.exposeFunction('__tbSave', (kind, b64) => { fs.appendFileSync(this.files[kind], Buffer.from(b64, 'base64')); });
    this.page.on('pageerror', (e) => this.errors.push(String(e)));
    this.page.on('console', (m) => { if (m.type() === 'error') this.errors.push(m.text()); });
    await this.page.goto(BASE + '?test' + (query ? '&' + query : ''));
    await this.page.waitForTimeout(900);
  }
  /** Starts recording ('video', 'audio' or both); the start times line the two up in the final cut. */
  async startRec(kinds = ['video', 'audio'], bits = 1500000) {
    const t = await this.page.evaluate(([k, bb]) => window.__tbRec.start(k, bb), [kinds, bits]);
    this.times = this.times || {};
    for (const k of kinds) this.times[k] = t;
  }
  async close() {
    try { await this.page.evaluate(() => window.__tbRec.stop()); } catch (e) { this.errors.push('rec stop ' + e); }
    await this.ctx.close();
    fs.writeFileSync(`${OUT}/${this.name}.json`, JSON.stringify({ times: this.times, errors: this.errors, log: this.log, cuts: this.cuts || [] }, null, 1));
    console.log(this.name, 'errors', JSON.stringify(this.errors.slice(0, 5)), 'bytes', fs.statSync(this.files.video).size, fs.statSync(this.files.audio).size);
  }
  note(s) { this.log.push(s); console.log(this.name, s); }
  async snap() {
    for (let i = 0; i < 50; i++) {
      const s = await this.page.evaluate(() => { try { return window.__tb ? window.__tb.snapshot() : null; } catch { return null; } }).catch(() => null);
      if (s) return s;
      await this.page.waitForTimeout(100);
    }
    return null;
  }
  wait(ms) { return this.page.waitForTimeout(ms); }
  async hold(key, ms) { await this.page.keyboard.down(key); await this.wait(ms); await this.page.keyboard.up(key); }
  async press(key, ms = 60) { await this.hold(key, ms); }
  async click() { await this.page.mouse.click(480, 200); }
  /** Marks where a cutscene begins (no tap). */
  async tapLineMark(scene) {
    const t = await this.page.evaluate(() => Date.now()).catch(() => null);
    (this.cuts = this.cuts || []).push({ t, scene, start: true });
  }
  /** A tap that turns a cutscene line, logged with its page time (the montage cuts on these, so no line is cut short). */
  async tapLine(scene) {
    const t = await this.page.evaluate(() => Date.now()).catch(() => null);
    (this.cuts = this.cuts || []).push({ t, scene });
    await this.click();
  }
  /** Plays out a cutscene: waits for each line's voice, then taps on. */
  async watchCutscene(maxMs = 120000) {
    const t = Date.now();
    while (Date.now() - t < maxMs) {
      const s = await this.snap();
      if (!s || !s.cutscene) return;
      if (!this.cuts || this.cuts.at(-1)?.scene !== s.cutscene) await this.tapLineMark(s.cutscene);
      // One tap every few seconds: lines finish typing and their voices finish before the page turns.
      await this.wait(5200);
      await this.tapLine(s.cutscene);
    }
  }
  async walk(dir, ms) { await this.hold(dir > 0 ? 'ArrowRight' : 'ArrowLeft', ms); }
  async walkTo(x, tol = 6, maxMs = 20000) {
    const t = Date.now();
    while (Date.now() - t < maxMs) {
      const s = await this.snap();
      const dx = x - s.player.x;
      if (Math.abs(dx) <= tol) return true;
      await this.walk(Math.sign(dx), Math.abs(dx) > 40 ? 150 : 30);
    }
    return false;
  }
  async key(k, down) { if (down) await this.page.keyboard.down(k); else await this.page.keyboard.up(k); }
  /** Walk one way across rooms: jump when blocked or at a gap; stop when the room or a condition says so. */
  async explore(dir, { maxMs = 30000, until = null } = {}) {
    const k = dir > 0 ? 'ArrowRight' : 'ArrowLeft';
    const t = Date.now();
    let lastX = null, stuck = 0;
    await this.key(k, true);
    while (Date.now() - t < maxMs) {
      await this.wait(50); // fine-grained: running jumps over water have a narrow take-off window
      const s = await this.snap();
      if (!s) continue;
      if (until && until(s)) break;
      if (s.cutscene) { await this.key(k, false); await this.watchCutscene(); await this.key(k, true); continue; }
      if (s.room !== this.lastRoom) { this.note(`  -> ${s.room} hp${s.player.hp}`); this.lastRoom = s.room; await this.key(k, false); await this.wait(150); await this.key(k, true); lastX = null; continue; }
      if (lastX !== null && Math.abs(s.player.x - lastX) < 2) stuck++; else stuck = 0;
      lastX = s.player.x;
      if (stuck >= 2 || s.player.gapAhead) { await this.press('Space', stuck > 4 || s.player.gapAhead ? 280 : 180); stuck = 0; }
    }
    await this.key(k, false);
  }
  /** Walks on in `dir`, stopping to fight anything close on the same level, until `until` holds. */
  async advance(dir, { maxMs = 120000, until = null } = {}) {
    const t = Date.now();
    const near = (s) => s.enemies.some((e) => e.hp > 0 && Math.abs(e.x - s.player.x) < 130 && Math.abs(e.y - s.player.y) < 50);
    while (Date.now() - t < maxMs) {
      const s = await this.snap();
      if (!s) continue;
      if (until && until(s)) return true;
      if (s.cutscene) { await this.watchCutscene(); continue; }
      if (near(s)) { await this.brawl({ maxMs: 15000, until: (q) => !near(q) }); continue; }
      await this.explore(dir, { maxMs: 2500, until: (q) => (until && until(q)) || near(q) || !!q.cutscene });
    }
    return false;
  }
  /** Fights the room's ordinary enemies; with `arts`, cycles through every move the current form has. */
  async brawl({ maxMs = 60000, arts = false, until = null } = {}) {
    const t = Date.now();
    let i = 0;
    const used = new Set();
    while (Date.now() - t < maxMs) {
      i++;
      const s = await this.snap();
      if (!s) break;
      if (until && until(s)) break;
      if (s.cutscene) { await this.watchCutscene(); continue; }
      const p = s.player;
      const foes = s.enemies.filter((e) => e.hp > 0 && Math.abs(e.y - p.y) < 60);
      if (!foes.length) break;
      foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
      const e = foes[0];
      const dx = e.x - p.x, dist = Math.abs(dx);
      const toward = dx > 0 ? 'ArrowRight' : 'ArrowLeft', away = dx > 0 ? 'ArrowLeft' : 'ArrowRight';
      if (p.hp < p.maxHp * 0.45 && p.flasks > 0) { if (await this.drink()) used.add('heal'); continue; }
      if (e.state === 'staggered' && dist < 40) { await this.hold(toward, 30); await this.press('x'); used.add('finisher'); await this.wait(900); continue; }
      if (p.gapAhead && dist > 30) { await this.press('Space', 200); }
      if (dist > 30) {
        if (arts && p.form === 'crusnik' && dist < 150 && !used.has('lash')) { await this.hold(toward, 30); await this.press('v'); await this.wait(60); await this.press('v'); used.add('lash'); await this.wait(500); continue; }
        await this.hold(toward, dist > 80 ? 160 : 60); continue;
      }
      if (e.state === 'attack' && i % 2 === 0) { await this.press('b'); used.add('parry'); await this.wait(200); await this.press('x'); continue; }
      if (arts) {
        const step = i % 6;
        if (step === 1) { await this.key('ArrowDown', true); await this.press('x'); await this.wait(250); await this.key('ArrowDown', false); used.add('crouch attack'); continue; }
        if (step === 3) { await this.press('Space', 120); await this.wait(120); await this.press('x'); used.add('air attack'); await this.wait(350); continue; }
        if (step === 5) { await this.key(away, true); await this.press('c'); await this.key(away, false); used.add(p.form === 'crusnik' ? 'slide' : 'roll'); await this.wait(350); continue; }
      }
      await this.press('x'); used.add('combo'); await this.wait(140);
    }
    return [...used];
  }
  /** Climb a ladder up (dir -1) or down (dir 1) until standing again (or the room changes). */
  async climb(dir, maxMs = 15000) {
    const k = dir < 0 ? 'ArrowUp' : 'ArrowDown';
    const t = Date.now();
    const room = (await this.snap()).room;
    await this.key(k, true);
    let climbing = false;
    while (Date.now() - t < maxMs) {
      await this.wait(120);
      const s = await this.snap();
      if (s.room !== room) { await this.key(k, false); await this.wait(150); await this.key(k, true); }
      if (s.player.state === 'climb') climbing = true;
      else if (climbing && (s.player.state === 'idle' || s.player.state === 'run')) break;
    }
    await this.key(k, false);
    await this.wait(200);
  }
  /** Drink a flask: only possible standing or running, so wait for that first. */
  async drink() {
    for (let k = 0; k < 12; k++) {
      const s = await this.snap();
      if (['idle', 'run', 'levitate'].includes(s.player.state)) { await this.press('f', 80); await this.wait(900); return true; }
      await this.wait(80);
    }
    return false;
  }
  /** A simple fighter: close in, combo, parry or dodge telegraphs, drink when low, transform when the blood allows. */
  async fight({ maxMs = 240000, lash = false } = {}) {
    const t = Date.now();
    let i = 0, room = null, lastLog = 0;
    while (Date.now() - t < maxMs) {
      i++;
      const s = await this.snap();
      if (!s) return 'nosnap';
      room = room || s.room;
      if (s.room !== room) return 'died';
      if (s.cutscene) { await this.watchCutscene(); continue; }
      const boss = s.boss;
      if (Date.now() - lastLog > 15000) { lastLog = Date.now(); this.note(`  t${Math.round((Date.now() - t) / 1000)}s hp${s.player.hp}/${s.player.maxHp} flasks${s.player.flasks} form${s.player.form} boss${boss ? ' ' + boss.state + ' ' + boss.hp.toFixed(2) + ' p' + boss.phase : ' none'}`); }
      if (!boss) return 'won';
      if (boss.state === 'defeated' || boss.hp <= 0) { await this.wait(500); continue; }
      const p = s.player;
      const dx = boss.x - p.x;
      const dist = Math.abs(dx);
      const toward = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      const away = dx > 0 ? 'ArrowLeft' : 'ArrowRight';
      if (!boss.active) { await this.hold(toward, 200); continue; }
      if (p.hp < p.maxHp * 0.5 && p.flasks > 0) { if (dist < 70) { await this.key(away, true); await this.press('c'); await this.key(away, false); await this.wait(250); } await this.drink(); continue; }
      if (p.crusnikReady && p.form !== 'crusnik') { await this.press('v'); await this.wait(800); continue; }
      // The Marchesa's own moves: parry her slashes and charge, jump her dive's impact.
      if (['slash1', 'slash2', 'charge'].includes(boss.state) && dist < 110) { await this.press('b'); await this.wait(220); await this.press('x'); continue; }
      if (['impact', 'dive'].includes(boss.state)) { await this.press('Space', 160); await this.wait(200); continue; }
      if (boss.state === 'telegraph' && dist < 90) {
        if (i % 3 === 0) { await this.page.keyboard.down(away); await this.press('c'); await this.page.keyboard.up(away); }
        else { await this.press('b'); await this.wait(120); await this.press('x'); }
        continue;
      }
      if (lash && p.form === 'crusnik' && dist > 60 && dist < 160 && i % 4 === 0) { await this.press('v'); await this.wait(60); await this.press('v'); await this.wait(250); continue; }
      if (p.hp < p.maxHp * 0.3 && dist < 50) { await this.page.keyboard.down(away); await this.press('c'); await this.page.keyboard.up(away); continue; }
      if (dist > 34) { await this.hold(toward, dist > 80 ? 160 : 70); continue; }
      if (i % 7 === 0) { await this.press('Space'); await this.wait(150); await this.press('x'); await this.wait(250); continue; }
      await this.press('x'); await this.wait(110);
    }
    return 'timeout';
  }
}
module.exports = { Bot, sleep, getBrowser, closeBrowser: async () => { if (browser) await browser.close(); } };
