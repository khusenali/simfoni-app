// lib/kbliClassifier.js
// Klasifikasi berita -> KBLI 2025 -> sektor PDRB.
// Fase 1: rule-based weighted scoring.
// Bobot diambil dari master kbli_keyword, bukan hard-code di engine.

const { db } = require('./db');
const { detectSektor } = require('./textmining');

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeKeywordRegex(keyword, matchType = 'phrase') {
  const normalized = normalizeText(keyword);

  if (!normalized) return null;

  const escaped = normalized
    .split(/\s+/)
    .map(escapeRegex)
    .join('\\s+');

  switch (matchType) {
    case 'contains':
      return new RegExp(escaped, 'i');

    case 'exact':
    case 'word':
    case 'phrase':
    default:
      return new RegExp(`\\b${escaped}\\b`, 'i');
  }
}

async function loadRules() {
  return await db.prepare(`
    SELECT
      kk.id,
      kk.keyword,
      kk.tipe,
      kk.bobot,
      kk.match_type,
      k.id AS kbli_id,
      k.kode,
      k.level,
      k.nama AS nama_kbli,
      k.kategori_code,
      ks.sektor_id,
      s.nama AS sektor_nama
    FROM kbli_keyword kk
    JOIN kbli_2025 k ON k.id = kk.kbli_id
    JOIN kbli_sektor ks ON ks.kbli_id = k.id
    JOIN sektor s ON s.id = ks.sektor_id
    WHERE kk.aktif = 1 AND k.aktif = 1
    ORDER BY kk.bobot DESC, LENGTH(kk.keyword) DESC
  `).all();
}

async function loadExclusions() {
  return await db.prepare(`
    SELECT ke.id, ke.pattern, ke.penalty, ke.tipe, ke.kbli_id, ke.sektor_id,
           k.kode AS kbli_kode, s.nama AS sektor_nama
    FROM kbli_exclusion ke
    LEFT JOIN kbli_2025 k ON k.id = ke.kbli_id
    LEFT JOIN sektor s ON s.id = ke.sektor_id
    WHERE ke.aktif = 1
  `).all();
}

async function classifyEconomicSector(text, options = {}) {
  const normalized = normalizeText(text);
  const limit = options.limit || 5;
  const rules = options.rules || await loadRules();
  const exclusions = options.exclusions || await loadExclusions();

  const sectorScores = new Map();
  const kbliScores = new Map();
  const matches = [];

  for (const rule of rules) {
    const regex = makeKeywordRegex(
      rule.keyword,
      rule.match_type
    );
    if (!regex || !regex.test(normalized)) continue;

    const weight = Number(rule.bobot) || 0;
    const score = weight;
    const sectorKey = rule.sektor_id;
    const kbliKey = rule.kbli_id;

    sectorScores.set(sectorKey, (sectorScores.get(sectorKey) || 0) + score);
    kbliScores.set(kbliKey, (kbliScores.get(kbliKey) || 0) + score);

    matches.push({
      keyword: rule.keyword,
      tipe: rule.tipe,
      bobot: weight,
      skor: score,
      kbliId: rule.kbli_id,
      kodeKbli: rule.kode,
      namaKbli: rule.nama_kbli,
      sektorId: rule.sektor_id,
      sektor: rule.sektor_nama,
    });
  }

  // Penalti untuk kombinasi/konteks yang memang tidak cocok dengan sektor/KBLI.
  // Ini baru rule sederhana; context bonus akan ditambahkan pada fase 2.
  for (const rule of exclusions) {
    const regex = makeKeywordRegex(
      rule.pattern,
      'phrase'
    );
    if (!regex || !regex.test(normalized)) continue;
    const penalty = Math.abs(Number(rule.penalty) || 0);

    if (rule.sektor_id) {
      sectorScores.set(rule.sektor_id, (sectorScores.get(rule.sektor_id) || 0) - penalty);
    }
    if (rule.kbli_id) {
      kbliScores.set(rule.kbli_id, (kbliScores.get(rule.kbli_id) || 0) - penalty);
    }
  }

  const sectors = [...sectorScores.entries()]
    .map(([sektorId, score]) => ({ sektorId, score }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const totalPositive = sectors.reduce((sum, x) => sum + x.score, 0);
  const top = sectors[0] || null;

  const kbliTop = [...kbliScores.entries()]
    .map(([kbliId, score]) => ({ kbliId, score }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // db.prepare(...).get(...) gak bisa dipanggil di dalam .map() biasa (hasilnya
  // Promise, bukan data) -- makanya di-loop pakai for...of + await, satu-satu.
  const kbli = [];
  for (let index = 0; index < kbliTop.length; index++) {
    const item = kbliTop[index];
    const row = await db.prepare(`
      SELECT k.id, k.kode, k.level, k.nama, k.uraian,
             s.id AS sektor_id, s.nama AS sektor_nama
      FROM kbli_2025 k
      JOIN kbli_sektor ks ON ks.kbli_id = k.id
      JOIN sektor s ON s.id = ks.sektor_id
      WHERE k.id = ?
      LIMIT 1
    `).get(item.kbliId);
    kbli.push({
      id: row.id,
      kode: row.kode,
      level: row.level,
      nama: row.nama,
      uraian: row.uraian || null,
      sektorId: row.sektor_id,
      sektor: row.sektor_nama,
      score: item.score,
      rank: index + 1,
    });
  }

  const matchedKeywords = matches
    .sort((a, b) => b.skor - a.skor || b.keyword.length - a.keyword.length)
    .slice(0, 20);

  const topSektorRow = top
    ? await db.prepare('SELECT nama FROM sektor WHERE id = ?').get(top.sektorId)
    : null;

  const candidates = [];
  for (const x of sectors.slice(0, limit)) {
    const sektorRow = await db.prepare('SELECT nama FROM sektor WHERE id = ?').get(x.sektorId);
    candidates.push({
      sektorId: x.sektorId,
      sektor: sektorRow?.nama || null,
      score: x.score,
      confidence: totalPositive > 0 ? Number(((x.score / totalPositive) * 100).toFixed(2)) : 0,
    });
  }

  return {
    sektor: topSektorRow?.nama || null,
    sektorId: top?.sektorId || null,
    score: top?.score || 0,
    confidence: totalPositive > 0 ? Number(((top.score / totalPositive) * 100).toFixed(2)) : 0,
    method: top ? 'kbli_weighted_rule' : 'unclassified',
    kbli,
    matchedKeywords,
    candidates,
  };
}

async function saveFenomenaClassification(fenomenaId, classification) {
  if (!fenomenaId || !classification) return;

  const tx = db.transaction(async (txDb) => {
    await txDb.prepare('DELETE FROM fenomena_kbli WHERE fenomena_id = ?').run(fenomenaId);
    for (const item of classification.kbli || []) {
      await txDb.prepare(`
        INSERT INTO fenomena_kbli (fenomena_id, kbli_id, skor, peringkat)
        VALUES (?, ?, ?, ?)
      `).run(fenomenaId, item.id, item.score, item.rank);
    }
  });
  await tx();
}

module.exports = {
  normalizeText,
  classifyEconomicSector,
  saveFenomenaClassification,
};