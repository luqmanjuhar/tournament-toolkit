// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../result-slips/slips.js');

const tsv = (rows) => rows.map((r) => r.join('\t')).join('\n');

test('Chess-Results style table: first Name is White, second Name is Black', () => {
  const text = tsv([
    ['Bo.', 'No.', 'Name', 'Rtg', 'Pts.', 'Result', 'Pts.', 'Name', 'Rtg', 'No.'],
    ['1', '5', 'ALI BIN ABU', '1500', '2', '', '2', 'SITI BINTI HASSAN', '0', '3'],
    ['2', '4', 'KOH WEI JIE', '1502', '1', '', '1', 'MD MONIR', '1873', '1'],
  ]);
  const r = S.parsePairings(text);
  assert.deepEqual(r.slips, [
    { table: '1', white: 'ALI BIN ABU', black: 'SITI BINTI HASSAN' },
    { table: '2', white: 'KOH WEI JIE', black: 'MD MONIR' },
  ]);
  assert.deepEqual(r.warnings, []);
});

test('White / Black column headers and Table column', () => {
  const r = S.parsePairings(tsv([['Table', 'White', 'Black'], ['7', 'A', 'B'], ['8', 'C', 'D']]));
  assert.deepEqual(r.slips.map((s) => [s.table, s.white, s.black]), [['7', 'A', 'B'], ['8', 'C', 'D']]);
});

test('Board header variants map to the table number', () => {
  for (const h of ['Bo.', 'Board', 'Table', 'Tbl', 'TABLE NO']) {
    const r = S.parsePairings(tsv([[h, 'White', 'Black'], ['12', 'A', 'B']]));
    assert.equal(r.slips[0].table, '12', h);
  }
});

test('without a board column tables are numbered in order', () => {
  const r = S.parsePairings(tsv([['Name', 'Name'], ['A', 'B'], ['C', 'D']]));
  assert.deepEqual(r.slips.map((s) => s.table), ['1', '2']);
});

test('headerless "table, white, black" lines', () => {
  const r = S.parsePairings('1\tAli\tSiti\n2\tBudi\tChong');
  assert.deepEqual(r.slips, [
    { table: '1', white: 'Ali', black: 'Siti' },
    { table: '2', white: 'Budi', black: 'Chong' },
  ]);
});

test('byes and unpaired players get no slip and are reported', () => {
  const r = S.parsePairings(tsv([
    ['Bo.', 'Name', 'Name'],
    ['1', 'A', 'B'],
    ['2', 'C', 'bye'],
    ['3', 'D', ''],
    ['4', 'E', 'F'],
  ]));
  assert.deepEqual(r.slips.map((s) => s.table), ['1', '4']);
  assert.deepEqual(r.byes.map((b) => b.name), ['C', 'D']);
  assert.match(r.warnings.join(' '), /2 byes skipped/);
});

test('blank rows and a repeated header row are ignored', () => {
  const r = S.parsePairings(tsv([
    ['Bo.', 'Name', 'Name'], ['1', 'A', 'B'], ['', '', ''], ['Bo.', 'Name', 'Name'], ['2', 'C', 'D'],
  ]));
  assert.equal(r.slips.length, 2);
});

test('names are trimmed and whitespace is collapsed', () => {
  const r = S.parsePairings(tsv([['Name', 'Name'], ['  ALI   BIN  ABU ', ' SITI ']]));
  assert.equal(r.slips[0].white, 'ALI BIN ABU');
  assert.equal(r.slips[0].black, 'SITI');
});

test('HTML table input', () => {
  const html = '<table><tr><th>Bo.</th><th>Name</th><th>Result</th><th>Name</th></tr>'
    + '<tr><td>1</td><td>Ali &amp; Co</td><td>1-0</td><td>Siti</td></tr></table>';
  const r = S.parsePairings(html);
  assert.deepEqual(r.slips, [{ table: '1', white: 'Ali & Co', black: 'Siti' }]);
});

test('duplicate table numbers give a warning', () => {
  const r = S.parsePairings(tsv([['Bo.', 'Name', 'Name'], ['1', 'A', 'B'], ['1', 'C', 'D']]));
  assert.match(r.warnings.join(' '), /Table 1 appears more than once/);
});

test('errors: empty input, no pairing table, no paired boards', () => {
  assert.throws(() => S.parsePairings(''), S.PairingError);
  assert.throws(() => S.parsePairings('just some text'), /Pairing table not found/);
  assert.throws(() => S.parsePairings(tsv([['Bo.', 'Name', 'Name'], ['1', 'A', 'bye']])), /No paired boards/);
});

test('chunk splits into sheets of 16', () => {
  const list = Array.from({ length: 35 }, (_, i) => i);
  const sheets = S.chunk(list, S.SLIPS_PER_SHEET);
  assert.deepEqual(sheets.map((s) => s.length), [16, 16, 3]);
  assert.equal(S.SLIPS_PER_SHEET, 16);
});

test('formatSlipDate gives the slip style date', () => {
  assert.equal(S.formatSlipDate('2026-09-20'), '20 SEPTEMBER 2026');
  assert.equal(S.formatSlipDate('2026-01-05'), '5 JANUARY 2026');
  assert.equal(S.formatSlipDate(''), '');
});
