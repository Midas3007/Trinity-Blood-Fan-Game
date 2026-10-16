const { Bot, closeBrowser } = require('./lib.cjs');
const HQ = 6000000;
const M = 'music=fight_kampfer&trailer';
const shots = {
  async s01(b) { await b.open(M); await b.startRec(['video'], HQ); await b.wait(4000); },
  async s02(b) {
    await b.open(M + '&scene=opening'); await b.click(); await b.wait(300); await b.startRec(['video'], HQ);
    await b.wait(7000);
  },
  async s03(b) {
    await b.open(M + '&room=old_town_lane&zoom=2&peaceful&time=dusk'); await b.click(); await b.wait(900); await b.startRec(['video'], HQ);
    await b.explore(1, { maxMs: 8000 });
  },
  async s04(b) {
    await b.open(M + '&room=great_hall&zoom=2&flags=paula_defeated,item:sword'); await b.click(); await b.wait(900); await b.startRec(['video'], HQ);
    for (let r = 0; r < 4; r++) await b.brawl({ maxMs: 15000, arts: true });
  },
  async s05(b) {
    await b.open(M + '&room=great_hall&zoom=2&crusnik&flags=paula_defeated,kampfer_defeated'); await b.click(); await b.wait(900); await b.startRec(['video'], HQ);
    await b.press('v'); await b.wait(1300); await b.press('Space', 260); await b.wait(900);
    for (let r = 0; r < 4; r++) await b.brawl({ maxMs: 15000, arts: true });
  },
  async s06(b) {
    await b.open(M + '&room=great_hall&peaceful&scene=kampfer_awakening'); await b.click(); await b.wait(200); await b.startRec(['video'], HQ);
    await b.watchCutscene(60000);
  },
  async s07(b) {
    await b.open(M + '&room=marchesa_ballroom&bossHp=160&flags=paula_defeated,kampfer_defeated,crusnik'); await b.click(); await b.wait(500); await b.startRec(['video'], HQ);
    await b.fight({ lash: true, maxMs: 120000 });
  },
  async s08(b) {
    await b.open(M + '&room=cathedral_nave&bossHp=300&flags=paula_defeated,kampfer_defeated,crusnik,marchesa_defeated,petros_defeated'); await b.click(); await b.wait(500);
    await b.explore(1, { maxMs: 90000, until: (s) => s.boss && (s.boss.active || s.cutscene) });
    await b.startRec(['video'], HQ);
    await b.fight({ lash: true, maxMs: 60000 });
  },
  async s09(b) {
    await b.open(M + '&room=great_hall&peaceful&scene=gyula_wings'); await b.click(); await b.wait(200); await b.startRec(['video'], HQ);
    await b.watchCutscene(60000);
  },
  async s10(b) {
    await b.open(M + '&room=star_chamber&bossHp=400&flags=paula_defeated,kampfer_defeated,crusnik,marchesa_defeated,petros_defeated,dietrich_defeated'); await b.click(); await b.wait(400);
    await b.watchCutscene(60000);
    await b.startRec(['video'], HQ);
    await b.fight({ lash: true, maxMs: 40000 });
  },
  async s11(b) {
    await b.open(M + '&room=great_hall&peaceful&scene=ending'); await b.click(); await b.wait(200); await b.startRec(['video'], HQ);
    await b.watchCutscene(60000);
  },
  async bed(b) { await b.open('music=fight_kampfer'); await b.click(); await b.wait(300); await b.startRec(['audio']); await b.wait(40000); },
};
(async () => {
  for (const id of process.argv.slice(2)) {
    const b = new Bot(id);
    try { await shots[id](b); } catch (e) { b.errors.push(String(e)); console.log(e); }
    await b.close();
  }
  await closeBrowser();
})();
