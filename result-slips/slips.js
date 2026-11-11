// Result slip helpers: parse a pasted pairing list and prepare slips.
// Pure functions, no dependencies. Works in the browser (classic script) and in Node (tests).

class PairingError extends Error {}

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = (v) => norm(v).toLowerCase().replace(/[^a-z0-9]/g, '');

const TABLE_HEADERS = ['bo', 'board', 'boardno', 'table', 'tableno', 'tbl', 'tbno'];
const NAME_HEADERS = ['name', 'player', 'playername'];
const WHITE_HEADERS = ['white', 'namewhite', 'whitename', 'whiteplayer'];
const BLACK_HEADERS = ['black', 'nameblack', 'blackname', 'blackplayer'];
const NO_OPPONENT = /^(bye|not paired|no opponent|-+|—|–)$/i;

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => NAMED[n]);
}

// Rows of cells from pasted text: an HTML table, or tab-separated lines.
function textToRows(text) {
  const t = String(text ?? '');
  if (/<tr\b/i.test(t)) {
    const rows = [];
    const trRe = /<tr\b[^>]*>((?:(?!<tr\b)[\s\S])*?)<\/tr>/gi;
    let m;
    while ((m = trRe.exec(t))) {
      const cells = [];
      const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let c;
      while ((c = cellRe.exec(m[1]))) {
        cells.push(norm(decodeEntities(c[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''))));
      }
      if (cells.length) rows.push(cells);
    }
    return rows;
  }
  return t
    .split(/\r?\n/)
    .map((line) => line.split('\t').map(norm))
    .filter((r) => r.some(Boolean));
}

function findHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const keys = rows[i].map(key);
    const names = keys.map((k, j) => (NAME_HEADERS.includes(k) ? j : -1)).filter((j) => j >= 0);
    const white = keys.findIndex((k) => WHITE_HEADERS.includes(k));
    const black = keys.findIndex((k) => BLACK_HEADERS.includes(k));
    const w = white >= 0 ? white : names[0];
    const b = black >= 0 ? black : names[1];
    if (w !== undefined && b !== undefined && w !== b) {
      const table = keys.findIndex((k) => TABLE_HEADERS.includes(k));
      return { index: i, white: w, black: b, table };
    }
  }
  return null;
}

// Returns { slips: [{ table, white, black }], byes: [{ table, name }], warnings: [] }.
// Accepts the pairing table copied from Chess-Results / Swiss Manager (two "Name" columns:
// the first is White, the second is Black), a table with White / Black columns, or plain
// "table <tab> white <tab> black" lines. A "Bo." / "Board" / "Table" column gives the table
// number; without one, tables are numbered in order.
function parsePairings(input) {
  const rows = Array.isArray(input) ? input : textToRows(input);
  if (!rows.length) throw new PairingError('Paste the pairing list first.');

  const slips = [];
  const byes = [];
  const warnings = [];
  const header = findHeader(rows);
  let dataRows;
  let cols;

  if (header) {
    cols = header;
    dataRows = rows.slice(header.index + 1);
  } else if (rows.every((r) => r.length >= 3 && /^\d+$/.test(r[0]))) {
    cols = { white: 1, black: 2, table: 0 };
    dataRows = rows;
  } else {
    throw new PairingError(
      'Pairing table not found. Copy the pairing table with its header row (two Name columns, or White and Black columns).'
    );
  }

  let seq = 0;
  let ignored = 0;
  const seenTables = new Set();
  for (const r of dataRows) {
    const white = norm(r[cols.white]);
    const black = norm(r[cols.black]);
    const rawTable = cols.table >= 0 ? norm(r[cols.table]) : '';
    if (!white && !black) continue; // blank row
    const k = key(white);
    if (NAME_HEADERS.includes(k) || WHITE_HEADERS.includes(k)) continue; // repeated header row
    if (!white || NO_OPPONENT.test(white)) { ignored++; continue; }
    seq++;
    const table = /^\d+$/.test(rawTable) ? rawTable : String(seq);
    if (!black || NO_OPPONENT.test(black)) {
      byes.push({ table, name: white });
      continue;
    }
    if (seenTables.has(table)) warnings.push(`Table ${table} appears more than once.`);
    seenTables.add(table);
    slips.push({ table, white, black });
  }

  if (!slips.length) throw new PairingError('No paired boards were found in the table.');
  if (byes.length) warnings.push(`${byes.length} bye${byes.length > 1 ? 's' : ''} skipped (no slip needed): ${byes.map((b) => b.name).join(', ')}.`);
  if (ignored) warnings.push(`${ignored} row${ignored > 1 ? 's' : ''} without players ignored.`);
  return { slips, byes, warnings };
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// "2026-09-20" -> "20 SEPTEMBER 2026"
function formatSlipDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return String(value || '').toUpperCase();
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

const SLIPS_PER_SHEET = 16;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parsePairings, textToRows, chunk, formatSlipDate, PairingError, SLIPS_PER_SHEET };
}
