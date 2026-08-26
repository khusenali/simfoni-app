const { db } = require("../lib/db");

const OLD_ID = 14;
const NEW_ID = 18;

const oldSector = db
  .prepare("SELECT id, nama FROM sektor WHERE id = ?")
  .get(OLD_ID);

const newSector = db
  .prepare("SELECT id, nama FROM sektor WHERE id = ?")
  .get(NEW_ID);

if (!oldSector) {
  console.log(`Sektor ID ${OLD_ID} tidak ditemukan.`);
  process.exit(0);
}

if (!newSector) {
  console.error(`Sektor ID ${NEW_ID} tidak ditemukan.`);
  process.exit(1);
}

console.log("\n=== SEKTOR YANG AKAN DIGABUNG ===");
console.log("Lama :", oldSector);
console.log("Baru :", newSector);

const countKbli = db
  .prepare(`
    SELECT COUNT(*) AS jumlah
    FROM kbli_sektor
    WHERE sektor_id = ?
  `)
  .get(OLD_ID).jumlah;

const countFenomena = db
  .prepare(`
    SELECT COUNT(*) AS jumlah
    FROM fenomena
    WHERE sektor_id = ?
  `)
  .get(OLD_ID).jumlah;

console.log("\nReferensi sebelum migrasi:");
console.log(`kbli_sektor : ${countKbli}`);
console.log(`fenomena    : ${countFenomena}`);

const migrate = db.transaction(() => {

  // 1. Pindahkan mapping KBLI dari sektor 14 → 18
  db.prepare(`
    UPDATE kbli_sektor
    SET sektor_id = ?
    WHERE sektor_id = ?
  `).run(NEW_ID, OLD_ID);

  // 2. Pindahkan fenomena dari sektor 14 → 18
  db.prepare(`
    UPDATE fenomena
    SET sektor_id = ?
    WHERE sektor_id = ?
  `).run(NEW_ID, OLD_ID);

  // 3. Pastikan tidak ada lagi referensi ke sektor 14
  const remainingKbli = db
    .prepare(`
      SELECT COUNT(*) AS jumlah
      FROM kbli_sektor
      WHERE sektor_id = ?
    `)
    .get(OLD_ID).jumlah;

  const remainingFenomena = db
    .prepare(`
      SELECT COUNT(*) AS jumlah
      FROM fenomena
      WHERE sektor_id = ?
    `)
    .get(OLD_ID).jumlah;

  if (remainingKbli > 0 || remainingFenomena > 0) {
    throw new Error(
      `Masih ada referensi ke sektor ${OLD_ID}. Migrasi dibatalkan.`
    );
  }

  // 4. Hapus sektor typo
  db.prepare(`
    DELETE FROM sektor
    WHERE id = ?
  `).run(OLD_ID);
});

try {
  migrate();

  console.log("\n✓ MIGRASI BERHASIL");

  const remaining = db
    .prepare(`
      SELECT id, nama
      FROM sektor
      WHERE id IN (?, ?)
      ORDER BY id
    `)
    .all(OLD_ID, NEW_ID);

  console.log("\n=== HASIL AKHIR ===");
  console.table(remaining);

  const finalKbli = db
    .prepare(`
      SELECT
        ks.kbli_id,
        k.kode AS kbli,
        ks.sektor_id,
        s.nama AS sektor
      FROM kbli_sektor ks
      JOIN kbli_2025 k ON k.id = ks.kbli_id
      JOIN sektor s ON s.id = ks.sektor_id
      WHERE k.kode = 'P'
    `)
    .all();

  console.log("\n=== MAPPING KBLI P ===");
  console.table(finalKbli);

  const finalFenomena = db
    .prepare(`
      SELECT
        sektor_id,
        COUNT(*) AS jumlah
      FROM fenomena
      WHERE sektor_id = ?
      GROUP BY sektor_id
    `)
    .all(NEW_ID);

  console.log("\n=== FENOMENA SEKTOR P ===");
  console.table(finalFenomena);

} catch (error) {
  console.error("\n✗ MIGRASI GAGAL");
  console.error(error.message);
  process.exit(1);
}