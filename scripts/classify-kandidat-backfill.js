// scripts/classify-kandidat-backfill.js
// Backfill sektor + skor relevansi buat kandidat_berita yang sudah ada
// SEBELUM fitur klasifikasi-di-muka ini dipasang (scan lama belum ngisi
// kolom sektor_id/sektor_nama/skor_relevansi/label_relevansi -> NULL).
// Kandidat BARU hasil "Cari Berita Baru" sudah otomatis terisi lewat
// lib/kandidatScraper.js, skrip ini cuma buat yang lama/menunggu.
//
// Jalankan: node --env-file=.env.local scripts/classify-kandidat-backfill.js
require("dotenv").config({ path: ".env.local" });
const { db } = require("../lib/db");
const { scoreRajaAmpatRelevance } = require("../lib/textmining");
const { classifyEconomicSector, loadRules, loadExclusions } = require("../lib/kbliClassifier");

async function main() {
  const rows = await db.prepare(`
    SELECT id, judul, ringkasan FROM kandidat_berita
    WHERE status = 'Menunggu' AND sektor_nama IS NULL
  `).all();

  console.log(`Kandidat belum terklasifikasi: ${rows.length}`);

  const rules = (await loadRules?.()) || undefined;
  const exclusions = (await loadExclusions?.()) || undefined;

  let sukses = 0;
  let gagal = 0;

  for (const row of rows) {
    try {
      const options = rules && exclusions ? { rules, exclusions } : {};
      const classification = await classifyEconomicSector(
        { judul: row.judul, uraian: row.ringkasan || "" },
        options
      );
      const relevansi = scoreRajaAmpatRelevance(row.judul, row.ringkasan);

      await db.prepare(`
        UPDATE kandidat_berita
        SET sektor_id = ?, sektor_nama = ?, skor_relevansi = ?, label_relevansi = ?
        WHERE id = ?
      `).run(
        classification.sektorId || null,
        classification.sektor || null,
        relevansi.score,
        relevansi.label,
        row.id
      );
      sukses++;
    } catch (err) {
      // stack dicetak buat kandidat PERTAMA yang gagal aja (biar gampang
      // ketemu akar masalahnya tanpa banjir log kalau semua baris gagal
      // karena sebab yang sama).
      if (gagal === 0) console.error(err.stack || err);
      console.warn(`Gagal klasifikasi kandidat id=${row.id}: ${err.message}`);
      gagal++;
    }
  }

  console.log(`Selesai. Berhasil: ${sukses}, gagal: ${gagal}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});