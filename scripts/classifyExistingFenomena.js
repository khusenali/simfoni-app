// scripts/classifyExistingFenomena.js
//
// Phase 4.1
// Mengklasifikasikan ulang fenomena yang sudah ada
// menggunakan KBLI 2025 + mapping sektor PDRB.
//
// Tidak mengubah data sumber berita.
// Yang diperbarui:
// - fenomena.sektor_id
// - fenomena.keyword
// - fenomena_kbli
//
// Default:
// hanya memproses fenomena berstatus Draft.

const { db } = require("../lib/db");
const {
  classifyEconomicSector,
  saveFenomenaClassification,
} = require("../lib/kbliClassifier");

const PROCESS_ALL = process.argv.includes("--all");

console.log("========================================");
console.log("KLASIFIKASI ULANG FENOMENA");
console.log("========================================");

console.log(
  PROCESS_ALL
    ? "Mode      : SEMUA FENOMENA"
    : "Mode      : DRAFT SAJA"
);

// Ambil fenomena
const sql = PROCESS_ALL
  ? `
      SELECT *
      FROM fenomena
      ORDER BY id
    `
  : `
      SELECT *
      FROM fenomena
      WHERE status = 'Draft'
      ORDER BY id
    `;

const fenomena = db.prepare(sql).all();

console.log(`Jumlah data : ${fenomena.length}`);

if (fenomena.length === 0) {
  console.log("Tidak ada fenomena yang perlu diproses.");
  process.exit(0);
}

const getSektor = db.prepare(`
  SELECT id, nama
  FROM sektor
  WHERE id = ?
`);

const updateFenomena = db.prepare(`
  UPDATE fenomena
  SET
    sektor_id = ?,
    keyword = ?,
    klasifikasi_score = ?,
    klasifikasi_confidence = ?,
    classification_method = ?,
    updated_at = datetime('now')
  WHERE id = ?
`);

const clearKlasifikasi = db.prepare(`
  UPDATE fenomena
  SET
    sektor_id = NULL,
    klasifikasi_score = ?,
    klasifikasi_confidence = ?,
    classification_method = 'unclassified',
    updated_at = datetime('now')
  WHERE id = ?
`);

let berhasil = 0;
let tidakTerklasifikasi = 0;
let gagal = 0;

const processOne = db.transaction((row) => {

  // Gabungkan seluruh informasi yang relevan
  const text = [
    row.judul,
    row.uraian,
    row.penyebab,
    row.dampak,
    row.lokasi,
  ]
    .filter(Boolean)
    .join(" ");

  const classification = classifyEconomicSector(text);

  console.log("\n----------------------------------------");
  console.log(`ID       : ${row.id}`);
  console.log(`Judul    : ${row.judul}`);

  if (!classification.sektorId) {

    console.log("HASIL    : TIDAK TERKLASIFIKASI");
    console.log(
      `Method   : ${classification.method}`
    );

    clearKlasifikasi.run(
      classification.score || 0,
      classification.confidence || 0,
      row.id
    );
    // Bersihkan relasi fenomena_kbli lama juga (kalau sebelumnya pernah
    // terklasifikasi, lalu keyword/exclusion berubah sehingga sekarang
    // tidak match lagi) — panggil dengan kbli kosong supaya baris lama terhapus.
    saveFenomenaClassification(row.id, classification);

    tidakTerklasifikasi++;
    return;
  }

  const sektor = getSektor.get(classification.sektorId);

  console.log(
    `Sektor   : ${sektor?.nama || classification.sektor}`
  );

  console.log(
    `Score    : ${classification.score}`
  );

  console.log(
    `Confidence : ${classification.confidence}%`
  );

  console.log(
    `Method   : ${classification.method}`
  );

  console.log("KBLI:");

  for (const item of classification.kbli || []) {
    console.log(
      `  ${item.kode} | ${item.nama} | score=${item.score}`
    );
  }

  console.log("Keyword:");

  for (const item of classification.matchedKeywords || []) {
    console.log(
      `  ${item.keyword} | ${item.tipe} | bobot=${item.bobot}`
    );
  }

  // Simpan sektor PDRB hasil mapping KBLI
  updateFenomena.run(
    classification.sektorId,
    JSON.stringify(
      (classification.matchedKeywords || []).map(
        (item) => item.keyword
      )
    ),
    classification.score || 0,
    classification.confidence || 0,
    classification.method || 'unclassified',
    row.id
  );

  // Simpan relasi fenomena -> KBLI
  saveFenomenaClassification(
    row.id,
    classification
  );

  berhasil++;
});

for (const row of fenomena) {

  try {

    processOne(row);

  } catch (error) {

    gagal++;

    console.error(
      `GAGAL memproses fenomena ID ${row.id}:`,
      error.message
    );
  }
}

console.log("\n========================================");
console.log("HASIL PHASE");
console.log("========================================");

console.log(`Total                 : ${fenomena.length}`);
console.log(`Berhasil              : ${berhasil}`);
console.log(`Tidak terklasifikasi  : ${tidakTerklasifikasi}`);
console.log(`Gagal                 : ${gagal}`);

console.log("\nSelesai.");