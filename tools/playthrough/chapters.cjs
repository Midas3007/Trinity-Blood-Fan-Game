const { Bot, closeBrowser } = require('./lib.cjs');
const FL = {
  paula: 'paula_defeated,relic:lacrima',
  kampfer: 'kampfer_defeated,crusnik',
  marchesa: 'marchesa_defeated,relic:sanguis',
  petros: 'petros_defeated,relic:cor_leonis',
  dietrich: 'dietrich_defeated,relic:vox',
  gyula: 'gyula_defeated,relic:finis,item:sword',
  arrival: 'scene:empire_arrival,harbour_gate',
  market: 'scene:ion_meeting,scene:bazaar_murder,scene:phase_step,ability:dash',
  janissary: 'janissary_defeated,relic:fides,item:spear',
  under: 'scene:cistern_child,scene:undercity_ion',
  palace: 'scene:empress_audience',
  radu: 'radu_defeated,relic:ignis',
};
const ACT1 = ['paula', 'kampfer', 'marchesa', 'petros', 'dietrich', 'gyula'];
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
    // The slots: I holds a game in progress; start a new game in slot II.
    await b.page.mouse.click(250, 340); await b.wait(2500);
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
      if (scenes.includes('Cutscene')) { await b.wait(5200); await b.tapLine('end'); continue; }
      await b.wait(1000);
    }
    await b.wait(5000);
  },
  // 2b. The Atoner's Blade: through the Hunter's Crypt to the sword, then its combo, air and low slashes.
  async c02s(b) {
    await b.open('room=hunters_crypt');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    for (let k = 0; k < 12; k++) {
      const s = await b.snap();
      if (s.flags.includes('item:sword')) break;
      const near = s.enemies.some((e) => e.hp > 0 && Math.abs(e.x - s.player.x) < 120 && Math.abs(e.y - s.player.y) < 60);
      if (near) await b.brawl({ maxMs: 12000, until: (t) => !t.enemies.some((e) => e.hp > 0 && Math.abs(e.x - t.player.x) < 140 && Math.abs(e.y - t.player.y) < 60) });
      else await b.walkTo(Math.min(1864, s.player.x + 200), 6, 4000);
    }
    await b.walkTo(1864, 6, 20000);
    await b.wait(4500); // the card
    // A few swings with the new blade: the three-cut combo, an air slash, a low slash.
    for (let i = 0; i < 3; i++) { await b.press('x'); await b.wait(200); }
    await b.wait(700);
    await b.press('Space', 140); await b.wait(120); await b.press('x'); await b.wait(900);
    await b.key('ArrowDown', true); await b.wait(100); await b.press('x'); await b.wait(500); await b.key('ArrowDown', false); await b.wait(800);
    const used = await b.brawl({ maxMs: 30000, arts: true, until: (t) => t.room !== 'hunters_crypt' || !t.enemies.some((e) => e.hp > 0 && Math.abs(e.x - t.player.x) < 400 && Math.abs(e.y - t.player.y) < 60) });
    const s = await b.snap();
    b.note('sword ' + s.player.weapon + ' arts ' + used.join(','));
    await b.wait(1500);
  },
  // 4b. The blade's arts in the Great Hall, ending in the sword execution.
  async c04s(b) {
    await b.open('room=great_hall&' + flags('paula') + ',item:sword');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    const used = new Set();
    for (let round = 0; round < 8; round++) {
      const s = await b.snap();
      if (!s.enemies.some((e) => e.hp > 0 && Math.abs(e.y - s.player.y) < 60)) break;
      (await b.brawl({ maxMs: 30000, arts: true })).forEach((u) => used.add(u));
    }
    b.note('blade arts ' + [...used].join(', '));
    await b.wait(1200);
  },
  // 8b. Rest and travel: the map (hidden items marked), Options (difficulty, accessibility, keys, touch layout),
  // the Codex's items, then fast travel from the fountain altar to the Chapel of Bones.
  async c08t(b) {
    await b.open('room=market_square&peaceful&' + flags('paula', 'kampfer', 'marchesa', 'petros') + ',item:sword,item:heart1,item:tea1,altar:market_square:fountain_altar,altar:market_square:tavern_altar,altar:chapel_of_bones:chapel_altar');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    const g = (x, y) => b.page.mouse.click(2 * x, 2 * y);
    await b.press('m'); await b.wait(3500); await b.press('m'); await b.wait(600);
    await b.press('Escape'); await b.wait(1500);
    await g(240, 28 + 90); await b.wait(1200); // weapon switch: fists
    await g(240, 28 + 90); await b.wait(1200); // and back to the sword
    await g(240, 28 + 142); await b.wait(2500); // Options
    await g(240, 46); await b.wait(900); await g(240, 46); await b.wait(900); await g(240, 46); await b.wait(900); // difficulty round
    await g(240, 46 + 21); await b.wait(900); await g(240, 46 + 21); await b.wait(700); // parry assist on/off
    await g(240, 46 + 6 * 21); await b.wait(2500); await g(240, 46 + 7 * 21); await b.wait(900); // keys page, back
    await g(240, 46 + 7 * 21); await b.wait(1500); // touch layout
    await b.page.mouse.move(2 * 384, 2 * 210.6); await b.page.mouse.down(); await b.page.mouse.move(2 * 340, 2 * 200, { steps: 15 }); await b.page.mouse.up(); await b.wait(600);
    await g(240 + 66, 135 - 16); await b.wait(500); await g(240 + 66, 135 - 16); await b.wait(900);
    await g(240 - 66, 135 + 10); await b.wait(1200); // reset (back to defaults for the rest of the film)
    await g(240, 46 + 8 * 21); await b.wait(800); // back to pause
    await g(240, 28 + 116); await b.wait(1500); // Codex
    await g(212 + 16, 26); await b.wait(2500); // Items tab
    await g(420, 240); await b.wait(700); // close
    await g(240, 28 + 64); await b.wait(800); // resume
    await b.walkTo(1304, 4, 30000); await b.wait(800);
    await b.key('ArrowUp', true); await b.wait(300); await b.key('ArrowUp', false); await b.wait(2200);
    // the travel list (2 destinations): frame h = 30 + 2*22 + 34, centred in 14..256; rows from top + 41
    await b.page.mouse.click(480, 2 * (14 + (242 - 108) / 2 + 41 + 1 * 22)); await b.wait(3000);
    b.note('travel ' + (await b.snap()).room);
  },
  // ---------------- The Empire arc ----------------
  // E1. The airship berth at Istvan Station, the docks of Byzantium, the harbour gate's winch on the customs roof.
  async e01(b) {
    await b.open('room=istvan_station&' + flags(...ACT1));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.walkTo(56, 6, 20000);
    await b.key('ArrowUp', true); await b.wait(900); await b.key('ArrowUp', false); await b.wait(1800);
    b.note('berth -> ' + (await b.snap()).room);
    await b.explore(1, { maxMs: 30000, until: (s) => s.player.x > 600 });
    await b.watchCutscene();
    // pray at the dock altar, then up the customs house to the winch
    await b.walkTo(34 * 16 + 8, 6); await b.key('ArrowUp', true); await b.wait(400); await b.key('ArrowUp', false); await b.wait(2500);
    await b.brawl({ maxMs: 25000, until: (s) => !s.enemies.some((e) => e.hp > 0 && Math.abs(e.x - s.player.x) < 160 && Math.abs(e.y - s.player.y) < 50) });
    // the customs house: ladders alternate floor by floor (columns 54, 63, 54) up to the roof hatch; then the winch
    for (const [col, floorY] of [[54, 25 * 16], [63, 19 * 16], [54, 13 * 16]]) {
      for (let k = 0; k < 12; k++) {
        const s = await b.snap();
        if (s.player.y < floorY && s.player.state !== 'climb') break;
        if (s.enemies.some((e) => e.hp > 0 && Math.abs(e.x - s.player.x) < 60 && Math.abs(e.y - s.player.y) < 40)) { await b.brawl({ maxMs: 8000 }); continue; }
        if (Math.abs(s.player.x - (col * 16 + 8)) > 4 && s.player.state !== 'climb') { await b.walkTo(col * 16 + 8, 3, 8000); continue; }
        await b.hold('ArrowUp', 700);
      }
      b.note('floor y' + Math.round((await b.snap()).player.y));
    }
    b.note('roof y' + Math.round((await b.snap()).player.y));
    await b.walkTo(920, 4, 10000);
    await b.key('ArrowRight', true); await b.wait(40); await b.key('ArrowRight', false);
    for (let i = 0; i < 4 && !(await b.snap()).flags.includes('harbour_gate'); i++) { await b.press('x'); await b.wait(350); }
    b.note('gate ' + (await b.snap()).flags.includes('harbour_gate'));
    await b.wait(1500);
  },
  // E2. The Harbour Wall and the Lamp Market: guards and zealots, and Ion.
  async e02(b) {
    await b.open('room=empire_quay&' + flags(...ACT1, 'arrival'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.advance(1, { maxMs: 200000, until: (s) => s.room === 'bazaar_lamps' && s.flags.includes('scene:ion_meeting') && !s.cutscene });
    b.note('market ' + (await b.snap()).room);
    await b.brawl({ maxMs: 20000 });
  },
  // E3. The Grand Arcade: the murder, the burning stall and the phase-step through iron bars.
  async e03(b) {
    await b.open('room=bazaar_arcade&' + flags(...ACT1, 'arrival') + ',scene:ion_meeting');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.explore(1, { maxMs: 120000, until: (s) => s.flags.includes('ability:dash') && !s.cutscene && s.player.x > 1300 });
    // through the bars at the arcade's end: jump, then DODGE in the air
    for (let k = 0; k < 6; k++) {
      const s = await b.snap();
      if (s.player.x > 94 * 16) break;
      await b.walkTo(89 * 16, 6, 8000);
      await b.key('ArrowRight', true); await b.press('Space', 160); await b.wait(120); await b.press('c'); await b.wait(500); await b.key('ArrowRight', false);
    }
    b.note('beyond the bars x' + Math.round((await b.snap()).player.x));
    await b.walkTo(103 * 16 + 8, 6); await b.key('ArrowUp', true); await b.wait(400); await b.key('ArrowUp', false); await b.wait(3000);
  },
  // E4. The Janissary Captain; his parting gift, the Byzantine spear.
  async e04(b) {
    await b.open('room=empire_barracks&bossHp=220&' + flags(...ACT1, 'arrival', 'market'));
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight({ lash: true });
    b.note('captain ' + r);
    await b.wait(6000);
    await b.walkTo(85 * 16 + 8, 4, 20000); await b.wait(4500);
    for (let i = 0; i < 2; i++) { await b.press('x'); await b.wait(260); }
    await b.wait(900);
    await b.key('ArrowLeft', true); await b.wait(200); await b.key('ArrowLeft', false);
    for (let i = 0; i < 2; i++) { await b.press('x'); await b.wait(260); }
    b.note('spear ' + (await b.snap()).player.weapon);
    await b.wait(1500);
  },
  // E5. Down the well: the cisterns, a child of the outcasts, Ion's trial.
  async e05(b) {
    await b.open('room=byz_cisterns&' + flags(...ACT1, 'arrival', 'market', 'janissary') + '&at=1400,239');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.explore(-1, { maxMs: 200000, until: (s) => s.room === 'byz_outcasts' && s.flags.includes('scene:undercity_ion') && !s.cutscene });
    b.note('outcasts ' + (await b.snap()).room);
    await b.wait(2000);
  },
  // E6. Up into the palace: the glass gardens, the hall of mirrors, the veiled throne.
  async e06(b) {
    await b.open('room=palace_gardens&' + flags(...ACT1, 'arrival', 'market', 'janissary', 'under') + '&at=60,415');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.explore(1, { maxMs: 180000, until: (s) => s.room === 'palace_audience' && s.flags.includes('scene:empress_audience') && !s.cutscene });
    b.note('throne ' + (await b.snap()).room);
    await b.walkTo(11 * 16 + 8, 4, 20000);
    await b.key('ArrowDown', true); await b.wait(3500); await b.key('ArrowDown', false); await b.wait(1500);
    b.note('below ' + (await b.snap()).room);
  },
  // E7. Radu Barvon in the flame laboratory.
  async e07(b) {
    await b.open('room=palace_lab&bossHp=200&' + flags(...ACT1, 'arrival', 'market', 'janissary', 'under', 'palace') + '&at=330,239');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(500);
    const r = await b.fight({ lash: true, maxMs: 300000 });
    b.note('radu ' + r);
    await b.wait(8000);
  },
  // E8. The lift to the Spire; Cain; one hundred percent; the epilogue, the credits.
  async e08(b) {
    const all = flags(...ACT1, 'arrival', 'market', 'janissary', 'under', 'palace', 'radu');
    await b.open('room=palace_lab&bossHp=460&phaseHp=120&' + all + '&at=1300,239');
    await b.click(); await b.wait(400); await b.startRec(); await b.wait(800);
    await b.walkTo(88 * 16, 4, 20000); await b.watchCutscene();
    await b.walkTo(88 * 16, 4, 8000);
    await b.key('ArrowUp', true); await b.wait(700); await b.key('ArrowUp', false); await b.wait(2000);
    b.note('lift -> ' + (await b.snap()).room);
    // pray at the Spire's altar first (a fall respawns here), then Cain: on the ground the usual fight; in the sky
    // Abel levitates to Cain's height, keeps a little distance and throws lightning.
    await b.walkTo(15 * 16 + 8, 4, 10000);
    await b.key('ArrowUp', true); await b.wait(400); await b.key('ArrowUp', false); await b.wait(2500);
    const t = Date.now();
    let res = 'timeout', lastLog = 0;
    while (Date.now() - t < 420000) {
      const s = await b.snap();
      if (!s) { res = 'nosnap'; break; }
      if (s.cutscene) { await b.watchCutscene(); continue; }
      if (s.room !== 'imperial_spire') { res = 'left ' + s.room; break; }
      const boss = s.boss;
      if (!boss) { res = s.flags.includes('cain_defeated') ? 'won' : 'no boss'; break; }
      const p = s.player;
      if (Date.now() - lastLog > 10000) { lastLog = Date.now(); b.note(`  hp${p.hp}/${p.maxHp} flasks${p.flasks} asc${p.ascended} boss ${boss.state} ${boss.hp.toFixed(2)} p${boss.phase}`); }
      if (boss.state === 'defeated' || boss.hp <= 0) { await b.wait(500); continue; }
      const dx = boss.x - p.x, dy = boss.y - p.y;
      const toward = dx > 0 ? 'ArrowRight' : 'ArrowLeft', away = dx > 0 ? 'ArrowLeft' : 'ArrowRight';
      if (!boss.active) {
        if (p.x < 18 * 16) { await b.hold('ArrowRight', 200); continue; }
        // a fall: walk back into the arena (the fight starts again)
        await b.hold(toward, 200); continue;
      }
      if (p.hp < p.maxHp * 0.5 && p.flasks > 0) { await b.drink(); continue; }
      if (p.ascended) {
        if (['telegraph', 'dash', 'dive', 'leap'].includes(boss.state) && Math.abs(dx) < 120) { await b.hold(dy > 0 ? 'ArrowUp' : 'ArrowDown', 220); await b.hold(away, 200); continue; }
        if (Math.abs(dy) > 14) { await b.hold(dy < 0 ? 'ArrowUp' : 'ArrowDown', 120); continue; }
        if (Math.abs(dx) > 160) { await b.hold(toward, 160); continue; }
        if (Math.abs(dx) < 70) { await b.hold(away, 140); continue; }
        await b.key(toward, true); await b.wait(30); await b.key(toward, false);
        await b.press('v'); await b.wait(420); continue;
      }
      if (Math.abs(dx) > 34) { await b.hold(toward, Math.abs(dx) > 80 ? 160 : 70); continue; }
      await b.press('x'); await b.wait(110);
    }
    b.note('cain ' + res);
    const t2 = Date.now();
    while (Date.now() - t2 < 300000) {
      const scenes = await b.page.evaluate(() => window.__tbScenes()).catch(() => []);
      if (scenes.includes('Menu')) { b.note('title again'); break; }
      if (scenes.includes('Cutscene')) { await b.wait(5200); await b.tapLine('end'); continue; }
      await b.wait(1000);
    }
    await b.wait(4000);
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
