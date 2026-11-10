// Prize allocation engine. Pure functions, no dependencies, runnable
// in Node (tests) and in the browser (UI).
//
// Player: { rank, snr, name, sex: 'M'|'F'|null, group, fed, club, type, rating, points }
// Config: {
//   mode: 'single' | 'multi',
//   excluded: [snr, ...],
//   prizes: [{ name, type: 'main'|'special', filter, places: [{ amount, note? }, ...] }]
// }
// Filter (every condition that is set must be met):
//   group: [..], club: [..], type: [..], fed: [..], sex: 'F'|'M', unrated: true|false,
//   ratingMin, ratingMax (rated players only), rankMin, rankMax

const norm = (s) => String(s ?? '').trim().toLowerCase();
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const list = (v) =>
  (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map(norm).filter(Boolean);

const FIELD_LABEL = { group: 'Gr', sex: 'sex', club: 'Club/City', type: 'Type', fed: 'FED', rating: 'rating' };

function matchesFilter(p, f = {}) {
  const groups = list(f.group);
  if (groups.length && !groups.includes(norm(p.group))) return false;
  const clubs = list(f.club);
  if (clubs.length && !clubs.includes(norm(p.club))) return false;
  const types = list(f.type);
  if (types.length && !types.includes(norm(p.type))) return false;
  const feds = list(f.fed);
  if (feds.length && !feds.includes(norm(p.fed))) return false;
  if (f.sex && p.sex !== String(f.sex).toUpperCase()) return false;

  const rated = p.rating > 0;
  if (f.unrated === true && rated) return false;
  if (f.unrated === false && !rated) return false;
  if (isNum(f.ratingMin) || isNum(f.ratingMax)) {
    if (!rated) return false; // rating ranges apply to rated players only
    if (isNum(f.ratingMin) && p.rating < f.ratingMin) return false;
    if (isNum(f.ratingMax) && p.rating > f.ratingMax) return false;
  }
  if (isNum(f.rankMin) && p.rank < f.rankMin) return false;
  if (isNum(f.rankMax) && p.rank > f.rankMax) return false;
  return true;
}

function filterNeeds(filter = {}) {
  const needs = [];
  if (list(filter.group).length) needs.push('group');
  if (filter.sex) needs.push('sex');
  if (list(filter.club).length) needs.push('club');
  if (list(filter.type).length) needs.push('type');
  if (list(filter.fed).length) needs.push('fed');
  if (
    filter.unrated !== undefined ||
    isNum(filter.ratingMin) ||
    isNum(filter.ratingMax)
  )
    needs.push('rating');
  return needs;
}

function validateConfig(config, availability = null) {
  const errors = [];
  const warnings = [];
  if (!config || !Array.isArray(config.prizes) || config.prizes.length === 0) {
    errors.push('No prizes have been set.');
    return { errors, warnings };
  }
  const single = config.mode !== 'multi';
  config.prizes.forEach((prize, i) => {
    const name = (prize.name || '').trim();
    const label = name || `Prize #${i + 1}`;
    if (!name) errors.push(`Prize #${i + 1} has no name.`);
    if (!Array.isArray(prize.places) || prize.places.length === 0) {
      errors.push(`${label}: set at least one place.`);
      return;
    }
    let prev = Infinity;
    prize.places.forEach((pl, j) => {
      const a = Number(pl.amount);
      if (!Number.isFinite(a) || a < 0) {
        errors.push(`${label}: the value for place ${j + 1} is not valid.`);
        return;
      }
      if (single && a > prev) {
        errors.push(
          `${label}: place ${j + 1} (RM${a}) is worth more than place ${j}. ` +
            'In one-prize-per-player mode, values must not increase.'
        );
      }
      prev = a;
    });
    if (availability) {
      for (const need of filterNeeds(prize.filter)) {
        if (availability[need] === false) {
          warnings.push(
            `${label}: the ${FIELD_LABEL[need]} filter is used but that column is missing from the data, so no player will be eligible.`
          );
        }
      }
    }
  });
  return { errors, warnings };
}

function buildSlots(prizes) {
  const slots = [];
  prizes.forEach((prize, prizeIndex) => {
    prize.places.forEach((pl, i) => {
      slots.push({
        key: `${prizeIndex}:${i}`,
        prizeIndex,
        prizeName: prize.name.trim(),
        type: prize.type || 'special',
        place: i + 1,
        amount: Number(pl.amount) || 0,
        note: pl.note || '',
        filter: prize.filter || {},
      });
    });
  });
  return slots;
}

// Each prize is calculated separately: a player can win more than one prize.
function runIndependent(slots, pool) {
  const result = new Map();
  const takenByPrize = new Map();
  for (const slot of slots) {
    if (!takenByPrize.has(slot.prizeIndex)) takenByPrize.set(slot.prizeIndex, new Set());
    const taken = takenByPrize.get(slot.prizeIndex);
    const winner = pool.find((p) => !taken.has(p.snr) && matchesFilter(p, slot.filter)) || null;
    if (winner) taken.add(winner.snr);
    result.set(slot.key, winner);
  }
  return result;
}

// One prize per player. A player who already holds a prize is skipped and the slot
// passes to the next best-ranked eligible player.
//   priority 'list'  (default): slots are filled in list order (prize order, then place).
//   priority 'value': highest-RM slots first; ties are broken by list order.
//   medalExclusive true (default): RM0 prizes count as prizes too.
//   medalExclusive false: RM0 prizes never block anything and are never blocked by other
//     prizes, so a player may take several medals, or a medal plus a cash prize.
// In every case one player can never take two places in the same prize.
function runExclusive(slots, pool, { priority = 'list', medalExclusive = true } = {}) {
  const order = [...slots].sort((a, b) =>
    (priority === 'value' ? b.amount - a.amount : 0) || a.prizeIndex - b.prizeIndex || a.place - b.place
  );
  const holders = new Set(); // players holding a counted prize
  const inPrize = new Map(); // prizeIndex -> players who already took a place in that prize
  const result = new Map();
  for (const slot of order) {
    const counts = medalExclusive || slot.amount > 0;
    if (!inPrize.has(slot.prizeIndex)) inPrize.set(slot.prizeIndex, new Set());
    const taken = inPrize.get(slot.prizeIndex);
    const winner =
      pool.find(
        (p) => !taken.has(p.snr) && !(counts && holders.has(p.snr)) && matchesFilter(p, slot.filter)
      ) || null;
    if (winner) {
      taken.add(winner.snr);
      if (counts) holders.add(winner.snr);
    }
    result.set(slot.key, winner);
  }
  return result;
}

const brief = (s) => ({ prizeName: s.prizeName, place: s.place, amount: s.amount });

function allocate(players, config, availability = null) {
  const { errors, warnings } = validateConfig(config, availability);
  if (errors.length) {
    return { ok: false, errors, warnings, awards: [], conflicts: [], totalAmount: 0 };
  }

  const excluded = new Set((config.excluded || []).map(Number));
  const pool = players
    .filter((p) => !excluded.has(p.snr))
    .sort((a, b) => a.rank - b.rank || a.snr - b.snr);

  const slots = buildSlots(config.prizes);
  const single = config.mode !== 'multi';
  const naive = runIndependent(slots, pool);
  const priority = config.priority === 'value' ? 'value' : 'list';
  const medalExclusive = config.medalExclusive !== false;
  const result = single ? runExclusive(slots, pool, { priority, medalExclusive }) : naive;

  const awards = slots.map((s) => ({
    prizeIndex: s.prizeIndex,
    prizeName: s.prizeName,
    type: s.type,
    place: s.place,
    amount: s.amount,
    note: s.note,
    player: result.get(s.key) || null,
  }));

  // Log: players eligible for one prize who received a higher-value one instead.
  const conflicts = [];
  if (single) {
    const slotByKey = new Map(slots.map((s) => [s.key, s]));
    const keptBySnr = new Map();
    for (const [key, p] of result) if (p && !keptBySnr.has(p.snr)) keptBySnr.set(p.snr, slotByKey.get(key));
    for (const s of slots) {
      const np = naive.get(s.key);
      if (!np) continue;
      const sp = result.get(s.key);
      if (sp && sp.snr === np.snr) continue;
      const kept = keptBySnr.get(np.snr);
      if (kept && kept.prizeIndex !== s.prizeIndex) {
        conflicts.push({ player: np, lost: brief(s), kept: brief(kept) });
      }
    }
  }

  for (const a of awards) {
    if (!a.player) {
      warnings.push(`${a.prizeName} place ${a.place}: no eligible player.`);
    }
  }
  const totalAmount = awards.reduce((sum, a) => sum + (a.player ? a.amount : 0), 0);
  return {
    ok: true, mode: single ? 'single' : 'multi', priority, medalExclusive,
    errors: [], warnings, awards, conflicts, totalAmount,
  };
}

// Chess-Results parser: reads the Ranking table from HTML (or pasted
// text) and maps columns dynamically from the column headings, because
// the displayed columns differ between tournaments (sex, Gr, FED, Club/City, ...).

class ImportError extends Error {}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function fromCode(n) {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => fromCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => fromCode(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => NAMED[n]);
}

function cleanCell(html) {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

const normalizeHeader = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// column heading (normalised) -> internal field
const HEADER_FIELDS = {
  rk: 'rank',
  rank: 'rank',
  sno: 'snr',
  snr: 'snr',
  startno: 'snr',
  name: 'name',
  sex: 'sex',
  gr: 'group',
  group: 'group',
  fed: 'fed',
  type: 'type',
  jenis: 'type', // Malay heading, kept for tables copied from Malay sources
  typ: 'type',
  club: 'club',
  clubcity: 'club',
  city: 'club',
  rtgi: 'rating',
  rtgn: 'rating',
  rtg: 'rating',
  rating: 'rating',
  elo: 'rating',
  pts: 'points',
  points: 'points',
};

function mapHeaders(headers) {
  const used = new Set();
  return headers.map((header) => {
    const field = HEADER_FIELDS[normalizeHeader(header)];
    if (field && !used.has(field)) {
      used.add(field);
      return { header, field };
    }
    return { header, field: null };
  });
}

function extractRowsFromHtml(html) {
  const rows = [];
  // Only the innermost <tr> (no nested <tr>), so a table
  // wrapped in a layout table is still detected.
  const trRe = /<tr\b[^>]*>((?:(?!<tr\b)[\s\S])*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html))) {
    const cells = [];
    const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let c;
    while ((c = cellRe.exec(m[1]))) cells.push(cleanCell(c[1]));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function parseRows(rows) {
  const hi = rows.findIndex((r) => {
    const n = r.map(normalizeHeader);
    return n.includes('rk') && n.includes('name');
  });
  if (hi < 0) {
    throw new ImportError(
      'Ranking table (Rk. and Name columns) not found. Make sure you copied the Ranking / Final Ranking table.'
    );
  }

  const headers = rows[hi];
  const columns = mapHeaders(headers);
  const idx = {};
  columns.forEach((c, i) => {
    if (c.field) idx[c.field] = i;
  });

  const warnings = [];
  const players = [];
  const seen = new Set();

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length !== headers.length) continue;
    if (!/^\d+$/.test(r[idx.rank])) continue;

    const get = (f) => (idx[f] === undefined ? '' : r[idx[f]]);
    const rank = parseInt(r[idx.rank], 10);
    const snr = /^\d+$/.test(get('snr')) ? parseInt(get('snr'), 10) : rank;
    if (seen.has(snr)) {
      warnings.push(`SNo ${snr} appears more than once; the repeated row was ignored.`);
      continue;
    }
    seen.add(snr);

    let sex = null;
    if (idx.sex !== undefined) {
      const v = get('sex').toLowerCase();
      sex = v === 'w' || v === 'f' ? 'F' : 'M'; // sex column: only women are marked 'w'
    }
    const ratingMatch = get('rating').match(/\d+/);
    const pts = parseFloat(get('points').replace(',', '.'));

    const extra = {};
    columns.forEach((c, k) => {
      if (!c.field && c.header) extra[c.header] = r[k];
    });

    players.push({
      rank,
      snr,
      name: get('name'),
      sex,
      group: get('group'),
      fed: get('fed'),
      club: get('club'),
      type: get('type'),
      rating: ratingMatch ? parseInt(ratingMatch[0], 10) : 0,
      points: Number.isNaN(pts) ? null : pts,
      extra,
    });
  }

  if (players.length === 0) throw new ImportError('No player rows were found in the table.');
  if (idx.snr === undefined) {
    warnings.push('The SNo column is missing; Rk. is used to identify players.');
  }
  players.sort((a, b) => a.rank - b.rank || a.snr - b.snr);

  const fields = {
    sex: idx.sex !== undefined,
    group: idx.group !== undefined,
    club: idx.club !== undefined,
    type: idx.type !== undefined,
    fed: idx.fed !== undefined,
    rating: idx.rating !== undefined,
  };
  return { columns, fields, players, warnings };
}

function extractTitles(html) {
  const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => cleanCell(m[1]))
    .filter(Boolean);
  const listTitle = h2.find((x) => /rank/i.test(x)) || '';
  let title = h2.find((x) => x !== listTitle) || '';
  if (!title) {
    const t = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (t) title = cleanCell(t[1]).replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '');
  }
  return { title, listTitle };
}

function parseRankingHtml(html) {
  const result = parseRows(extractRowsFromHtml(html));
  const { title, listTitle } = extractTitles(html);
  if (listTitle && !/final/i.test(listTitle)) {
    result.warnings.push(
      `This list is "${listTitle}", not the Final Ranking. Make sure the tournament has finished.`
    );
  }
  return { title, listTitle, ...result };
}

// Pasted text: HTML (view-source) or a table copied from the browser (tab-separated).
function parseRankingText(text) {
  if (/<tr\b/i.test(text)) return parseRankingHtml(text);
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((s) => s.trim()))
    .filter((r) => r.some(Boolean));
  const result = parseRows(rows);
  return { title: '', listTitle: '', ...result };
}

// Rebuild the ranking URL from any Chess-Results tournament page link.
// The URL is built from the tournament ID (digits only), not copied as-is.
function buildRankingUrl(input) {
  let u;
  try {
    u = new URL(String(input).trim());
  } catch {
    throw new ImportError('Invalid link.');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ImportError('Invalid link.');
  const host = u.hostname.toLowerCase();
  if (!/(^|\.)chess-results\.com$/.test(host)) {
    throw new ImportError('The link must be from chess-results.com.');
  }
  const fromPath = u.pathname.match(/tnr(\d+)\.aspx/i);
  const id = fromPath ? fromPath[1] : u.searchParams.get('tnr');
  if (!id || !/^\d+$/.test(id)) {
    throw new ImportError('Tournament ID (tnr) not found in the link.');
  }
  const out = new URL(`https://${host}/tnr${id}.aspx`);
  out.searchParams.set('lan', '1');
  out.searchParams.set('art', '1');
  const rd = u.searchParams.get('rd');
  if (u.searchParams.get('art') === '1' && /^\d+$/.test(rd || '')) out.searchParams.set('rd', rd);
  out.searchParams.set('zeilen', '99999');
  return { url: out.toString(), tournamentId: id };
}

// Configuration helpers for the UI (pure, testable in Node).

function newFilter() {
  return {
    group: [],
    sex: '',
    club: [],
    type: [],
    fed: [],
    unrated: '', // '' | 'yes' | 'no'
    ratingMin: '',
    ratingMax: '',
    rankMin: '',
    rankMax: '',
  };
}

function newPrize(type = 'special', name = '') {
  return { name, type, filter: newFilter(), places: [''] };
}

function cleanFilter(f = {}) {
  const out = {};
  if (f.group?.length) out.group = [...f.group];
  if (f.sex) out.sex = f.sex;
  if (f.club?.length) out.club = [...f.club];
  if (f.type?.length) out.type = [...f.type];
  if (f.fed?.length) out.fed = [...f.fed];
  if (f.unrated === 'yes') out.unrated = true;
  if (f.unrated === 'no') out.unrated = false;
  for (const k of ['ratingMin', 'ratingMax', 'rankMin', 'rankMax']) {
    if (f[k] !== '' && f[k] != null && Number.isFinite(Number(f[k]))) out[k] = Number(f[k]);
  }
  return out;
}

function parseSnrList(text) {
  return String(text ?? '')
    .split(/[,\s;]+/)
    .filter((s) => /^\d+$/.test(s))
    .map(Number);
}

function toAllocatorConfig({ mode, prizes, excludedText, priority, medalExclusive }) {
  return {
    mode: mode === 'multi' ? 'multi' : 'single',
    priority: priority === 'value' ? 'value' : 'list',
    medalExclusive: medalExclusive !== false,
    excluded: parseSnrList(excludedText),
    prizes: prizes.map((p) => ({
      name: (p.name || '').trim(),
      type: p.type === 'main' ? 'main' : 'special',
      filter: cleanFilter(p.filter),
      places: p.places.map((a) => ({ amount: a === '' || a == null ? 0 : Number(a) })),
    })),
  };
}

// Sample template based on the columns found in the data. Values are examples only.
function templatePrizes(data) {
  const { players, fields } = data;
  const out = [];

  const main = newPrize('main', 'Overall');
  main.places = [500, 300, 200, 100, 50];
  out.push(main);

  if (fields.group) {
    const groups = [...new Set(players.map((p) => p.group).filter(Boolean))].sort();
    for (const g of groups.slice(0, 4)) {
      const p = newPrize('special', `Best ${g}`);
      p.filter.group = [g];
      p.places = [200, 150, 100];
      out.push(p);
    }
  }
  if (fields.sex && players.some((p) => p.sex === 'F')) {
    const p = newPrize('special', 'Best Girls');
    p.filter.sex = 'F';
    p.places = [200, 150, 100];
    out.push(p);
  }
  if (fields.rating && players.some((p) => !(p.rating > 0))) {
    const p = newPrize('special', 'Best Unrated');
    p.filter.unrated = 'yes';
    p.places = [100, 80, 50];
    out.push(p);
  }
  return out;
}

function csvCell(v) {
  let s = v == null ? '' : String(v);
  // elak formula injection apabila dibuka dalam Excel
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(awards) {
  const header = ['Prize', 'Prize type', 'Place', 'Value (RM)', 'Rk.', 'SNo', 'Name', 'Gr', 'Club/City', 'Type', 'FED', 'Points'];
  const lines = [header.map(csvCell).join(',')];
  for (const a of awards) {
    const p = a.player;
    lines.push(
      [
        a.prizeName,
        a.type === 'main' ? 'Main' : 'Special',
        a.place,
        a.amount,
        p ? p.rank : '',
        p ? p.snr : '',
        p ? p.name : '(no winner)',
        p ? p.group : '',
        p ? p.club : '',
        p ? p.type : '',
        p ? p.fed : '',
        p && p.points != null ? p.points : '',
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    allocate, validateConfig, matchesFilter, buildSlots, parseRankingText, parseRankingHtml,
    toAllocatorConfig, newPrize, templatePrizes, buildCsv, buildRankingUrl, ImportError,
  };
}
