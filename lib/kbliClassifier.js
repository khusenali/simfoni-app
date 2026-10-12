// lib/kbliClassifier.js
// Klasifikasi berita -> KBLI 2025 -> sektor PDRB.
// Fase 1: rule-based weighted scoring.
// Bobot diambil dari master kbli_keyword, bukan hard-code di engine.
//
// Peningkatan akurasi (lihat komentar di tiap bagian):
// 1. Match di JUDUL dikasih bonus dibanding match di URAIAN (judul lebih
//    representatif -- editor udah nyaring inti berita ke situ).
// 2. Kemunculan berulang kata kunci dihitung (bukan cuma ada/tidak), dikasih
//    batas atas (MAX_OCCURRENCE_PER_SEGMENT) biar gak meledak gak wajar.
// 3. Kode KBLI level lebih spesifik (4-5) otomatis dapet bonus skor --
//    kategori besar (level 1-2) lebih gampang ambigu, jadi dipercaya lebih
//    rendah tanpa perlu nyetel bobot manual satu-satu tiap keyword.
// 4. Kata kunci yang didahului negasi ("tidak", "bukan", dst -- pake fungsi
//    yang sama dengan lib/textmining.js) TIDAK dihitung skornya.

const { db } = require('./db');
const { hasNegationBefore } = require('./textmining');

const LEVEL_BONUS = { 1: 1.0, 2: 1.05, 3: 1.1, 4: 1.2, 5: 1.3 };
const JUDUL_BONUS = 1.6; // match di judul dianggap ~60% lebih meyakinkan
const MAX_OCCURRENCE_PER_SEGMENT = 3; // cap biar kata yang disebut puluhan kali gak ngegilas skor sektor lain

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

function makeKeywordRegex(keyword, matchType = 'phrase', flags = 'i') {
  const normalized = normalizeText(keyword);

  if (!normalized) return null;

  const escaped = normalized
    .split(/\s+/)
    .map(escapeRegex)
    .join('\\s+');

  switch (matchType) {
    case 'contains':
      return new RegExp(escaped, flags);

    case 'exact':
    case 'word':
    case 'phrase':
    default:
      return new RegExp(`\\b${escaped}\\b`, flags);
  }
}

// Hitung berapa kali `regex` (HARUS pakai flag global 'g') match di `segment`,
// skip kemunculan yang didahului kata negasi, dan batasi maksimal
// MAX_OCCURRENCE_PER_SEGMENT biar 1 kata yang disebut berkali-kali gak
// mendominasi skor secara gak proporsional.
function countScoredOccurrences(regex, segment) {
  if (!segment) return 0;
  regex.lastIndex = 0;
  let count = 0;
  let m;
  while ((m = regex.exec(segment))) {
    if (!hasNegationBefore(segment, m.index)) count++;
    if (m[0].length === 0) regex.lastIndex++; // jaga-jaga hindari infinite loop kalau ada match kosong
    if (count >= MAX_OCCURRENCE_PER_SEGMENT) break;
  }
  return count;
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

// `input` bisa berupa:
//   - string (CARA LAMA, tetap didukung buat backward-compat) -- diperlakukan
//     sebagai uraian doang, TANPA bonus judul (sama seperti perilaku lama).
//   - { judul, uraian } (CARA BARU, direkomendasikan) -- match di judul dapet
//     bonus JUDUL_BONUS.
async function classifyEconomicSector(input, options = {}) {
  let judul = '';
  let uraian = '';
  if (typeof input === 'string') {
    uraian = input;
  } else if (input && typeof input === 'object') {
    judul = input.judul || '';
    uraian = input.uraian || '';
  }

  const normalizedJudul = normalizeText(judul);
  const normalizedUraian = normalizeText(uraian);
  const normalizedGabungan = `${normalizedJudul} ${normalizedUraian}`.trim();

  const limit = options.limit || 5;
  const rules = options.rules || await loadRules();
  const exclusions = options.exclusions || await loadExclusions();

  const sectorScores = new Map();
  const kbliScores = new Map();
  const matches = [];

  for (const rule of rules) {
    const regex = makeKeywordRegex(rule.keyword, rule.match_type, 'gi');
    if (!regex) continue;

    const judulCount = countScoredOccurrences(regex, normalizedJudul);
    const uraianCount = countScoredOccurrences(regex, normalizedUraian);
    if (judulCount + uraianCount === 0) continue;

    const weight = Number(rule.bobot) || 0;
    const levelBonus = LEVEL_BONUS[rule.level] || 1;
    const occurrenceScore = judulCount * JUDUL_BONUS + uraianCount;
    const score = weight * levelBonus * occurrenceScore;
    if (score <= 0) continue;

    const sectorKey = rule.sektor_id;
    const kbliKey = rule.kbli_id;

    sectorScores.set(sectorKey, (sectorScores.get(sectorKey) || 0) + score);
    kbliScores.set(kbliKey, (kbliScores.get(kbliKey) || 0) + score);

    matches.push({
      keyword: rule.keyword,
      keywordId: rule.id,
      tipe: rule.tipe,
      bobot: weight,
      levelBonus,
      diJudul: judulCount,
      diUraian: uraianCount,
      skor: score,
      kbliId: rule.kbli_id,
      kodeKbli: rule.kode,
      namaKbli: rule.nama_kbli,
      sektorId: rule.sektor_id,
      sektor: rule.sektor_nama,
    });
  }

  // Penalti untuk kombinasi/konteks yang memang tidak cocok dengan sektor/KBLI.
  // Dicek di teks gabungan (judul+uraian) -- exclusion tetap penalty penuh
  // walau tanpa cap occurrence, karena tujuannya nge-block, bukan nge-skor.
  for (const rule of exclusions) {
    const regex = makeKeywordRegex(rule.pattern, 'phrase');
    if (!regex || !regex.test(normalizedGabungan)) continue;
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

// Feedback loop otomatis (step 5 lanjutan) -- dipanggil SETIAP KALI Tim
// Neraca mengoreksi/mengonfirmasi sektor_id sebuah fenomena (lihat
// lib/fenomenaRepo.js -> updateFenomena). Bandingin opini classifier
// SEKARANG (pakai rules yang berlaku saat ini) lawan sektor final yang
// dipilih manusia:
//   - Kalau SAMA -> gak ngapa-ngapain (gak ada yang perlu dikoreksi).
//   - Kalau BEDA -> keyword yang nyumbang skor ke sektor yang SALAH itu
//     bobotnya diturunkan sedikit (STEP_NUDGE), dengan batas bawah
//     MIN_BOBOT (gak pernah dibuat 0/mati sendiri -- mematikan keyword
//     sepenuhnya tetap keputusan manusia lewat kbli_keyword.aktif).
// Semua perubahan dicatat ke kbli_bobot_log (bisa ditelusuri/dibatalkan),
// dan setiap kejadian feedback dicatat ke kbli_feedback (bahan laporan tren
// akurasi dari waktu ke waktu). Fungsi ini SENGAJA gak pernah melempar error
// ke pemanggilnya -- kegagalan di sini tidak boleh menggagalkan verifikasi.
const STEP_NUDGE = 0.15;
const MIN_BOBOT = 0.1;

async function applyKbliFeedback(fenomenaId) {
  try {
    const row = await db.prepare('SELECT judul, uraian, sektor_id FROM fenomena WHERE id = ?').get(fenomenaId);
    if (!row || !row.sektor_id) return; // "Tidak terklasifikasi" -- gak ada yang bisa dibandingin

    const hasil = await classifyEconomicSector({ judul: row.judul, uraian: row.uraian || '' });
    if (!hasil.sektorId || hasil.sektorId === row.sektor_id) return; // sistem setuju / gak punya opini -> selesai

    const offenders = hasil.matchedKeywords.filter((m) => m.sektorId === hasil.sektorId && m.keywordId);
    for (const m of offenders) {
      const kw = await db.prepare('SELECT bobot FROM kbli_keyword WHERE id = ?').get(m.keywordId);
      if (!kw) continue;
      const bobotLama = Number(kw.bobot);
      const bobotBaru = Math.max(MIN_BOBOT, Number((bobotLama - STEP_NUDGE).toFixed(4)));
      if (bobotBaru === bobotLama) continue; // udah di batas minimum

      await db.prepare('UPDATE kbli_keyword SET bobot = ? WHERE id = ?').run(bobotBaru, m.keywordId);
      await db.prepare(`
        INSERT INTO kbli_bobot_log (kbli_keyword_id, keyword, bobot_lama, bobot_baru, fenomena_id, alasan)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        m.keywordId,
        m.keyword,
        bobotLama,
        bobotBaru,
        fenomenaId,
        `auto-nudge: sistem pilih sektor "${hasil.sektor}", Tim Neraca pilih sektor lain`
      );
    }

    await db.prepare(`
      INSERT INTO kbli_feedback (fenomena_id, sektor_sistem_id, sektor_final_id, skor_sistem)
      VALUES (?, ?, ?, ?)
    `).run(fenomenaId, hasil.sektorId, row.sektor_id, hasil.score);
  } catch (err) {
    console.warn('[kbliClassifier] gagal apply feedback (diabaikan, gak nge-block verifikasi):', err.message);
  }
}

module.exports = {
  normalizeText,
  classifyEconomicSector,
  saveFenomenaClassification,
  applyKbliFeedback,
  loadRules,
  loadExclusions,
};