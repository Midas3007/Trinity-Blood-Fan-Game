const { Bot, closeBrowser } = require('./lib.cjs');
const FL = {
  paula: 'paula_defeated,relic:lacrima',
  kampfer: 'kampfer_defeated,crusnik',
  marchesa: 'marchesa_defeated,relic:sanguis',
  petros: 'petros_defeated,relic:cor_leonis',
  dietrich: 'dietrich_defeated,relic:vox',
};
const flags = (...keys) => 'flags=' + keys.map((k) => FL[k]).join(',');

const chapters = {
  // 1. The title (with a save, so the progress bar shows), a new game, the voiced opening, the first streets.
  async c01(b) {
    await b.open('scene=opening');
    // A save in progress, so the title shows Continue with its progress bar (then we start a new game).
    await b.page.evaluate(() => localStorage.setItem('trinity-blood.save', JSON.stringify({ version: 2, checkpoint: null, flags: ['paula_defeated', 'relic:lacrima', 'lore:ax_orders'], visited: ['istvan_station', 'old_town_lane', 'clock_alley', 'market_square', 'sewer_shaft', 'water_tunnels'], time: 'night', savedAt: Date.now() })));
    await b.page.reload(); await b.wait(1500);
    await b.startRec(['video']);
    await b.page.mouse.click(60, 60); await b.wait(400); // a tap on empty space starts the sound
    await b.startRec(['audio']);
    await b.wait(6000);
    await b.page.mouse.click(246, 392); await b.wait(700);
    await b.page.mouse.click(246, 392); await b.wait(2500);
    await b.watchCutscene();
    await b.wait(800);
    await b.explore(1, { maxMs: 70000, until: (s) => s.room === 'market_square' && s.player.x > 300 });
    b.note('reached ' + (await b.snap()).room);
  },
  // 2. Down the sewer grate, through the shaft, into the Water Tunnels.
  async c02(b) {
    await b.open('room=market_square');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    const where = async (l) => { const s = await b.snap(); b.note(`${l} ${s.room} x${Math.round(s.player.x)} y${Math.round(s.player.y)} hp${s.player.hp} ${s.player.state}`); };
    await b.walkTo(1048, 4); await where('grate');
    await b.climb(1); await where('ledge');
    await b.brawl({ maxMs: 15000 }); await where('after bats');
    await b.walkTo(200, 4); await where('ladder');
    await b.climb(1); await where('bottom');
    await b.explore(1, { maxMs: 30000, until: (s) => s.room === 'water_tunnels' && s.player.x > 300 }); await where('tunnels');
  },
  // 3. Sister Paula.
  async c03(b) {
    await b.open('room=water_tunnels');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight();
    b.note('paula ' + r + ' ' + JSON.stringify((await b.snap()).flags));
    await b.wait(9000); // the relic card and the blood meter waking
  },
  // 4. The priest's arts on the Danube Bridge: combo, crouch and air attacks, roll, parry, a drink, the revolver;
  // Methuselah blood fills the meter; then the Codex (Bestiary and Lore book) from the pause menu.
  async c04(b) {
    await b.open('room=great_hall&' + flags('paula'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    const used = new Set();
    for (let round = 0; round < 8; round++) {
      const s = await b.snap();
      if (!s.enemies.some((e) => e.hp > 0 && Math.abs(e.y - s.player.y) < 60)) break;
      (await b.brawl({ maxMs: 30000, arts: true })).forEach((u) => used.add(u));
    }
    const s = await b.snap();
    b.note('arts ' + [...used].join(', ') + ' | blood ' + s.player.crusnik.toFixed(2) + ' | flags ' + s.flags.join(','));
    // The Codex
    await b.press('Escape'); await b.wait(900);
    await b.page.mouse.click(480, 274); await b.wait(2500);
    for (const row of [0, 1, 2]) { await b.page.mouse.click(2 * 70, 2 * (50 + row * 19)); await b.wait(2500); }
    await b.page.mouse.click(2 * 172, 2 * 26); await b.wait(3500);
    await b.page.mouse.click(2 * 420, 2 * 240); await b.wait(600);
    await b.press('Escape'); await b.wait(1200);
  },
  // 5. The Magus: Abel's first transformation (forty percent).
  async c05(b) {
    await b.open('room=forgotten_reliquary&bossHp=160&' + flags('paula'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight({ lash: true });
    b.note('kampfer ' + r + ' ' + JSON.stringify((await b.snap()).flags));
    await b.wait(8000);
  },
  // 6. The Crusnik's arts: transform, scythe (ground, air, low), the chain lash, the high leap, the slide, the drain.
  async c06(b) {
    await b.open('room=great_hall&crusnik&flags=paula_defeated,relic:lacrima,kampfer_defeated,relic:crusnik');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.press('v'); await b.wait(1200);
    await b.press('Space', 260); await b.wait(900); // the high leap
    const used = new Set();
    for (let round = 0; round < 8; round++) {
      const s = await b.snap();
      if (!s.enemies.some((e) => e.hp > 0 && Math.abs(e.y - s.player.y) < 60)) break;
      if (s.player.form !== 'crusnik' && s.player.crusnikReady) { await b.press('v'); await b.wait(1000); }
      (await b.brawl({ maxMs: 30000, arts: true })).forEach((u) => used.add(u));
    }
    const s = await b.snap();
    b.note('crusnik arts ' + [...used].join(', ') + ' | form ' + s.player.form);
    await b.wait(1500);
  },
  // 7. The Marchesa.
  async c07(b) {
    await b.open('room=marchesa_ballroom&bossHp=250&' + flags('paula', 'kampfer'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight({ lash: true });
    b.note('marchesa ' + r + ' ' + JSON.stringify((await b.snap()).flags));
    await b.wait(8000);
  },
  // 8. Brother Petros.
  async c08(b) {
    await b.open('room=count_cellars&bossHp=200&' + flags('paula', 'kampfer', 'marchesa'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight({ lash: true });
    b.note('petros ' + r + ' ' + JSON.stringify((await b.snap()).flags));
    await b.wait(8000);
  },
  // 9. The cathedral portal, the nave, and Dietrich (the Grand Marionette, then himself).
  async c09(b) {
    await b.open('room=cathedral_square&bossHp=320&' + flags('paula', 'kampfer', 'marchesa', 'petros'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    await b.explore(1, { maxMs: 30000, until: (s) => Math.abs(s.player.x - 1112) < 10 });
    await b.walkTo(1112, 4);
    await b.key('ArrowUp', true); await b.wait(1500); await b.key('ArrowUp', false); await b.wait(1500);
    b.note('door ' + (await b.snap()).room);
    await b.explore(1, { maxMs: 90000, until: (s) => s.boss && s.boss.active });
    const r = await b.fight({ lash: true, maxMs: 300000 });
    b.note('dietrich ' + r + ' ' + JSON.stringify((await b.snap()).flags));
    await b.wait(8000);
  },
  // 10. Gyula and the Star of Sorrow; the eighty-percent wings; the ending, the credits, the next arc.
  async c10(b) {
    await b.open('room=star_chamber&bossHp=380&' + flags('paula', 'kampfer', 'marchesa', 'petros', 'dietrich'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight({ lash: true, maxMs: 360000 });
    b.note('gyula ' + r);
    // The ending, credits and teaser run as their own scenes: tap through cutscene lines, let the credits roll,
    // stop once the title is back.
    const t = Date.now();
    while (Date.now() - t < 300000) {
      const scenes = await b.page.evaluate(() => window.__tbScenes()).catch(() => []);
      if (scenes.includes('Menu')) { b.note('title again'); break; }
      if (scenes.includes('Cutscene')) { await b.wait(5200); await b.click(); continue; }
      await b.wait(1000);
    }
    await b.wait(5000);
  },
};

(async () => {
  for (const id of process.argv.slice(2)) {
    const b = new Bot(id);
    try { await chapters[id](b); } catch (e) { b.errors.push('chapter ' + e); console.log(e); }
    await b.close();
  }
  await closeBrowser();
})();
