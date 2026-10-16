const { Bot, closeBrowser } = require('./lib.cjs');
const OUT = __dirname + '/../social/shots/';
require('fs').mkdirSync(OUT, { recursive: true });
const cheatOn = async (b) => { for (const k of ['ArrowDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'x', 'c']) { await b.hold(k, 90); await b.wait(220); } await b.wait(2200); };
const shots = {
  market: async (b) => { await b.open('room=market_square&trailer&peaceful&at=1500,496'); await b.click(); await b.wait(3500); await b.hold('ArrowRight', 400); await b.wait(150); },
  cathedral: async (b) => { await b.open('room=cathedral_square&trailer&peaceful&at=1300,400'); await b.click(); await b.wait(3500); await b.hold('ArrowLeft', 300); await b.wait(150); },
  belltower: async (b) => { await b.open('room=bell_tower&trailer&peaceful&at=150,512'); await b.click(); await b.wait(3800); },
  nave: async (b) => { await b.open('room=cathedral_nave&trailer&peaceful&at=1300,512'); await b.click(); await b.wait(3500); await b.hold('ArrowRight', 400); },
  ballroom: async (b) => { await b.open('room=marchesa_ballroom&trailer&peaceful&at=1280,240'); await b.click(); await b.wait(3500); await b.hold('ArrowLeft', 300); },
  crusnik: async (b) => {
    await b.open('room=great_hall&trailer&zoom=2&flags=paula_defeated&at=560,304'); await b.click(); await b.wait(1500);
    await cheatOn(b); await b.press('v'); await b.wait(1600);
    for (let i = 0; i < 30; i++) { const s = await b.snap(); const e = s.enemies.filter((x) => x.hp > 0).sort((a, c) => Math.abs(a.x - s.player.x) - Math.abs(c.x - s.player.x))[0]; if (!e) break; const dx = e.x - s.player.x; if (Math.abs(dx) > 40) { await b.hold(dx > 0 ? 'ArrowRight' : 'ArrowLeft', 200); continue; } await b.press('x', 60); await b.wait(140); if (i > 6) break; }
  },
  wings: async (b) => {
    await b.open('room=danube_bridge&trailer&zoom=2&peaceful&at=1000,400'); await b.click(); await b.wait(1500);
    await cheatOn(b); await b.press('v'); await b.wait(1600);
    for (let i = 0; i < 3; i++) { await b.hold('Space', 70); await b.wait(140); }
    await b.page.keyboard.down('ArrowRight'); await b.hold('Space', 70); await b.wait(160); await b.page.keyboard.up('ArrowRight');
  },
  bridge: async (b) => { await b.open('room=danube_bridge&trailer&peaceful&at=700,400'); await b.click(); await b.wait(3500); await b.hold('ArrowRight', 400); },
  cut_marchesa: async (b) => { await b.open('room=great_hall&peaceful&scene=marchesa_intro'); await b.click(); await b.wait(3500); },
  cut_crusnik: async (b) => { await b.open('room=great_hall&peaceful&scene=kampfer_awakening'); await b.click(); await b.wait(3500); },
};
(async () => {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(shots);
  for (const k of which) {
    const b = new Bot('still_' + k);
    try { await shots[k](b); await b.page.screenshot({ path: OUT + k + '.png' }); } catch (e) { console.log(k, 'ERR', String(e).slice(0, 200)); }
    await b.close();
  }
  await closeBrowser();
})();
