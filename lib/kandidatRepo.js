// lib/kandidatRepo.js
// CRUD untuk antrian kandidat berita hasil pencarian Gemini AI.
const { db } = require("./db");
const { insertFenomenaWithSimilarity, DuplicateUrlError } = require("./fenomenaRepo");
const { extractKeywords } = require("./textmining");
const { resolveSentiment } = require("./sentimentService");
const { classifyEconomicSector } = require("./kbliClassifier");
const { detectDistrik } = require("./wilayah");

async function listKandidatMenunggu() {
  return await db.prepare(`
    SELECT * FROM kandidat_berita WHERE status = 'Menunggu' ORDER BY dicari_pada DESC
  `).all();
}

// Approve = masuk ke pipeline text-mining yang SAMA PERSIS dengan berita
// portal biasa (keyword, sentimen hybrid IndoBERT+lexicon, klasifikasi KBLI
// dengan bonus judul, deteksi mirip) -- bukan pipeline terpisah, cuma titik
// masuknya beda (manual, bukan cron).
async function approveKandidat(id) {
  const kandidat = await db.prepare("SELECT * FROM kandidat_berita WHERE id = ?").get(id);
  if (!kandidat) return { ok: false, reason: "not_found" };
  if (kandidat.status !== "Menunggu") return { ok: false, reason: "already_reviewed" };

  const fullText = `${kandidat.judul} ${kandidat.ringkasan || ""}`;
  const distrik = detectDistrik(fullText);
  const classification = await classifyEconomicSector({
    judul: kandidat.judul,
    uraian: kandidat.ringkasan || "",
  });
  const sentimen = await resolveSentiment(fullText);

  let fenomenaId;
  try {
    fenomenaId = await insertFenomenaWithSimilarity({
      tanggal: kandidat.tanggal || new Date().toISOString(),
      judul: kandidat.judul,
      uraian: kandidat.ringkasan,
      sumber_tipe: "portal_berita",
      nama_sumber: kandidat.sumber_disebutkan || "Sumber lain (AI)",
      url: kandidat.url,
      lokasi: distrik,
      distrik_nama: distrik,
      sektor_nama: classification.sektor,
      classification,
      keyword: extractKeywords(fullText),
      sentimen,
      status: "Draft",
      penulis: null,
      media: "Kandidat AI (disetujui)",
    });
  } catch (err) {
    if (err instanceof DuplicateUrlError) {
      await db.prepare(`
        UPDATE kandidat_berita SET status = 'Ditolak', fenomena_id = ?, ditinjau_pada = datetime('now') WHERE id = ?
      `).run(err.existingId, id);
      return { ok: false, reason: "duplicate", fenomenaId: err.existingId };
    }
    throw err;
  }

  await db.prepare(`
    UPDATE kandidat_berita SET status = 'Disetujui', fenomena_id = ?, ditinjau_pada = datetime('now') WHERE id = ?
  `).run(fenomenaId, id);

  return { ok: true, fenomenaId };
}

async function rejectKandidat(id) {
  const result = await db.prepare(`
    UPDATE kandidat_berita SET status = 'Ditolak', ditinjau_pada = datetime('now') WHERE id = ? AND status = 'Menunggu'
  `).run(id);
  return { ok: result.changes > 0 };
}

// Bulk approve/reject dari halaman /kandidat (select banyak sekaligus).
// Diproses SATU-SATU berurutan (bukan paralel) -- approve tiap kandidat
// bisa bikin sektor/distrik baru & cek kemiripan ke fenomena lain, kalau
// ditembak bersamaan berisiko race condition yang sama seperti import Excel.
async function approveKandidatBulk(ids) {
  const hasil = [];
  for (const id of ids) {
    const r = await approveKandidat(id);
    hasil.push({ id, ...r });
  }
  return {
    berhasil: hasil.filter((h) => h.ok).length,
    gagal: hasil.filter((h) => !h.ok).length,
    detail: hasil,
  };
}

async function rejectKandidatBulk(ids) {
  const hasil = [];
  for (const id of ids) {
    const r = await rejectKandidat(id);
    hasil.push({ id, ...r });
  }
  return {
    berhasil: hasil.filter((h) => h.ok).length,
    gagal: hasil.filter((h) => !h.ok).length,
    detail: hasil,
  };
}

module.exports = {
  listKandidatMenunggu,
  approveKandidat,
  rejectKandidat,
  approveKandidatBulk,
  rejectKandidatBulk,
};