// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../prize-winner/engine.js');

// ---- helpers -------------------------------------------------------------
const dash = (v) => (v === '-' ? '' : v);
function acceptancePlayers() {
  const rows = [
    [1, 5, 'U18', 'FOON YEW'], [2, 3, '-', 'PAWNTIAN'], [3, 4, 'U18', 'PONTIAN'], [4, 1, '-', '-'],
    [5, 7, '-', '-'], [6, 12, 'U18', 'KCHERS'], [7, 9, 'U18', '-'], [8, 8, '-', '-'],
    [9, 2, '-', 'KCHERS'], [10, 6, '-', '-'], [11, 10, 'U18', 'SMKLL'], [12, 11, 'U18', 'SMKLL'],
  ];
  const tsv = ['Rk.\tSNo\tName\tTyp\tClub/City']
    .concat(rows.map(([rk, sno, typ, club]) => [rk, sno, `Player ${sno}`, dash(typ), dash(club)].join('\t')))
    .join('\n');
  return E.parseRankingText(tsv).players;
}
const prize = (name, type, filter, amounts) => ({ name, type, filter, places: amounts.map((amount) => ({ amount })) });
const champion = prize('Champion-5th', 'main', {}, [130, 80, 60, 40, 30]);
const kchers = prize('Best KChers', 'special', { club: ['KCHERS'] }, [10, 10]);
const u18 = prize('Best U18', 'special', { type: ['U18'] }, [10, 10]);
const female = prize('Best Female', 'special', { sex: 'F' }, [10, 10]);
const run = (players, prizes, opts = {}) => E.allocate(players, { mode: 'single', excluded: [], prizes, ...opts });
const winnersOf = (res, name) => res.awards.filter((a) => a.prizeName === name).map((a) => (a.player ? a.player.rank : null));

// ---- acceptance test -----------------------------------------------------
test('acceptance: list priority, Best KChers above Best U18', () => {
  const res = run(acceptancePlayers(), [champion, kchers, u18, female]);
  assert.equal(res.ok, true);
  assert.equal(res.priority, 'list');
  assert.deepEqual(winnersOf(res, 'Champion-5th'), [1, 2, 3, 4, 5]);
  assert.deepEqual(winnersOf(res, 'Best KChers'), [6, 9]);
  assert.deepEqual(winnersOf(res, 'Best U18'), [7, 11]);
  assert.deepEqual(winnersOf(res, 'Best Female'), [null, null]);
  assert.equal(res.awards.find((a) => a.prizeName === 'Best KChers' && a.place === 2).player.snr, 2);
  assert.equal(res.totalAmount, 380);
  assert.equal(res.warnings.filter((w) => /no eligible player/.test(w)).length, 2);
});

test('acceptance: Best U18 above Best KChers', () => {
  const res = run(acceptancePlayers(), [champion, u18, kchers, female]);
  assert.deepEqual(winnersOf(res, 'Best U18'), [6, 7]);
  assert.deepEqual(winnersOf(res, 'Best KChers'), [9, null]);
  assert.equal(res.totalAmount, 370);
});

// ---- priority ------------------------------------------------------------
const mini = () => E.parseRankingText(
  ['Rk.\tSNo\tName\tTyp'].concat([1, 2, 3].map((n) => `${n}\t${n}\tP${n}\tU10`)).join('\n')
).players;

test('priority list vs value: a cheaper prize listed first takes the player under list priority', () => {
  const prizes = [prize('Small', 'special', { type: ['U10'] }, [10]), prize('Big', 'special', { type: ['U10'] }, [100])];
  const byList = run(mini(), prizes, { priority: 'list' });
  assert.deepEqual([winnersOf(byList, 'Small')[0], winnersOf(byList, 'Big')[0]], [1, 2]);
  const byValue = run(mini(), prizes, { priority: 'value' });
  assert.deepEqual([winnersOf(byValue, 'Small')[0], winnersOf(byValue, 'Big')[0]], [2, 1]);
});

test('priority value: equal amounts are broken by list order', () => {
  const prizes = [prize('A', 'special', { type: ['U10'] }, [50]), prize('B', 'special', { type: ['U10'] }, [50])];
  const res = run(mini(), prizes, { priority: 'value' });
  assert.deepEqual([winnersOf(res, 'A')[0], winnersOf(res, 'B')[0]], [1, 2]);
});

test('priority defaults to list and medalExclusive to true', () => {
  const res = run(mini(), [prize('A', 'special', {}, [10])]);
  assert.equal(res.priority, 'list');
  assert.equal(res.medalExclusive, true);
});

// ---- RM0 / medals --------------------------------------------------------
test('two RM0 prizes, medalExclusive true: a player gets only one', () => {
  const prizes = [prize('Medal A', 'special', { type: ['U10'] }, [0]), prize('Medal B', 'special', { type: ['U10'] }, [0])];
  const res = run(mini(), prizes, { medalExclusive: true });
  assert.deepEqual([winnersOf(res, 'Medal A')[0], winnersOf(res, 'Medal B')[0]], [1, 2]);
});

test('two RM0 prizes, medalExclusive false: the same player can take both', () => {
  const prizes = [prize('Medal A', 'special', { type: ['U10'] }, [0]), prize('Medal B', 'special', { type: ['U10'] }, [0])];
  const res = run(mini(), prizes, { medalExclusive: false });
  assert.deepEqual([winnersOf(res, 'Medal A')[0], winnersOf(res, 'Medal B')[0]], [1, 1]);
});

test('medal plus cash: medalExclusive false lets a medal winner also take cash, true does not', () => {
  const prizes = [prize('Medal', 'special', { type: ['U10'] }, [0]), prize('Cash', 'special', { type: ['U10'] }, [50])];
  const open = run(mini(), prizes, { medalExclusive: false });
  assert.deepEqual([winnersOf(open, 'Medal')[0], winnersOf(open, 'Cash')[0]], [1, 1]);
  const strict = run(mini(), prizes, { medalExclusive: true });
  assert.deepEqual([winnersOf(strict, 'Medal')[0], winnersOf(strict, 'Cash')[0]], [1, 2]);
});

test('medalExclusive false: cash prizes still exclude each other', () => {
  const prizes = [prize('Cash A', 'special', { type: ['U10'] }, [50]), prize('Cash B', 'special', { type: ['U10'] }, [40])];
  const res = run(mini(), prizes, { medalExclusive: false });
  assert.deepEqual([winnersOf(res, 'Cash A')[0], winnersOf(res, 'Cash B')[0]], [1, 2]);
});

// ---- places --------------------------------------------------------------
test('one player never takes two places in the same prize (RM0 and several-prizes mode)', () => {
  const p = prize('Medals', 'special', { type: ['U10'] }, [0, 0, 0]);
  const open = run(mini(), [p], { medalExclusive: false });
  assert.deepEqual(winnersOf(open, 'Medals'), [1, 2, 3]);
  const multi = E.allocate(mini(), { mode: 'multi', excluded: [], prizes: [p] });
  assert.deepEqual(winnersOf(multi, 'Medals'), [1, 2, 3]);
});

test('several-prizes mode ignores priority', () => {
  const prizes = [prize('A', 'special', {}, [10]), prize('B', 'special', {}, [100])];
  const res = E.allocate(mini(), { mode: 'multi', priority: 'value', excluded: [], prizes });
  assert.deepEqual([winnersOf(res, 'A')[0], winnersOf(res, 'B')[0]], [1, 1]);
});

test('excluded SNo are removed before allocation', () => {
  const res = run(mini(), [prize('A', 'special', {}, [10, 10])], { excluded: [1] });
  assert.deepEqual(winnersOf(res, 'A'), [2, 3]);
});

test('empty slot gives a warning and no winner', () => {
  const res = run(mini(), [prize('Only', 'special', { type: ['U99'] }, [10])]);
  assert.deepEqual(winnersOf(res, 'Only'), [null]);
  assert.match(res.warnings.join('\n'), /Only place 1: no eligible player/);
});

test('conflict log records what the player received and lost', () => {
  const res = run(acceptancePlayers(), [champion, u18, kchers]);
  const c = res.conflicts.find((x) => x.player.rank === 6);
  assert.ok(c);
  assert.equal(c.kept.prizeName, 'Best U18');
  assert.equal(c.lost.prizeName, 'Best KChers');
});

test('validation: name required and amounts non-increasing in one-prize mode', () => {
  const bad = run(mini(), [prize('', 'special', {}, [10])]);
  assert.equal(bad.ok, false);
  const rising = run(mini(), [prize('Rise', 'special', {}, [10, 20])]);
  assert.equal(rising.ok, false);
  const multi = E.allocate(mini(), { mode: 'multi', excluded: [], prizes: [prize('Rise', 'special', {}, [10, 20])] });
  assert.equal(multi.ok, true);
});

test('toAllocatorConfig passes priority and medalExclusive through', () => {
  const cfg = E.toAllocatorConfig({ mode: 'single', prizes: [], excludedText: '', priority: 'value', medalExclusive: false });
  assert.equal(cfg.priority, 'value');
  assert.equal(cfg.medalExclusive, false);
  const def = E.toAllocatorConfig({ mode: 'single', prizes: [], excludedText: '' });
  assert.equal(def.priority, 'list');
  assert.equal(def.medalExclusive, true);
});

// ---- parsing -------------------------------------------------------------
test('header variants Typ / Type / Jenis map to type', () => {
  for (const h of ['Typ', 'Type', 'Jenis', 'TYP.']) {
    const { players } = E.parseRankingText(`Rk.\tName\t${h}\n1\tAli\tU10`);
    assert.equal(players[0].type, 'U10', h);
  }
});

test('comma-decimal points, rating 0 and sex w', () => {
  const { players } = E.parseRankingText('Rk.\tSNo\tName\tsex\tRtgI\tPts.\n1\t4\tAli\t\t0\t5,5\n2\t2\tSiti\tw\t1400\t5');
  assert.equal(players[0].points, 5.5);
  assert.equal(players[0].rating, 0);
  assert.equal(players[0].sex, 'M');
  assert.equal(players[1].sex, 'F');
});

test('rows with a non-numeric Rk. and duplicate SNo are ignored', () => {
  const r = E.parseRankingText('Rk.\tSNo\tName\n1\t1\tA\nx\t2\tB\n2\t1\tC');
  assert.equal(r.players.length, 1);
  assert.ok(r.warnings.some((w) => /more than once/.test(w)));
});
