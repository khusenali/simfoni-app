// scripts/mapKbliToPdrb.js
//
// Mapping seluruh KBLI 2025 (A-V)
// ke 17 sektor PDRB SIMFONI.
//
// Prinsip:
// kategori KBLI -> sektor PDRB
//
// Tidak melakukan klasifikasi berita.
// Tidak mengubah keyword.
// Tidak mengubah fenomena.
//
// Yang diperbarui hanya:
// kbli_sektor

const { db } = require("../lib/db");

console.log("==============================================");
console.log("      MAPPING KBLI 2025 -> SEKTOR PDRB");
console.log("==============================================\n");

// ============================================================
// 1. MASTER MAPPING KBLI -> SEKTOR PDRB
// ============================================================

const KBLI_TO_PDRB = {
  A: "Pertanian, Kehutanan, dan Perikanan",

  B: "Pertambangan dan Penggalian",

  C: "Industri Pengolahan",

  D: "Pengadaan Listrik dan Gas",

  E: "Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang",

  F: "Konstruksi",

  G: "Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor",

  H: "Transportasi dan Pergudangan",

  I: "Penyediaan Akomodasi dan Makan Minum",

  J: "Informasi dan Komunikasi",
  K: "Informasi dan Komunikasi",

  L: "Jasa Keuangan dan Asuransi",

  M: "Real Estat",

  N: "Jasa Perusahaan",
  O: "Jasa Perusahaan",

  P: "Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib",

  Q: "Jasa Pendidikan",

  R: "Jasa Kesehatan dan Kegiatan Sosial",

  S: "Jasa Lainnya",
  T: "Jasa Lainnya",
  U: "Jasa Lainnya",
  V: "Jasa Lainnya",
};

// ============================================================
// 2. VALIDASI MAPPING
// ============================================================

const kategori = Object.keys(KBLI_TO_PDRB);

if (kategori.length !== 22) {
  throw new Error(
    `Mapping kategori KBLI harus 22, ditemukan ${kategori.length}`
  );
}

console.log("Jumlah kategori KBLI :", kategori.length);

// ============================================================
// 3. CARI SEKTOR PDRB
// ============================================================

function getSektorByName(nama) {
  return db
    .prepare(`
      SELECT id, nama
      FROM sektor
      WHERE nama = ?
      LIMIT 1
    `)
    .get(nama);
}

// ============================================================
// 4. VALIDASI SEMUA SEKTOR ADA
// ============================================================

console.log("\n=== VALIDASI SEKTOR PDRB ===");

const sektorCache = new Map();

for (const [kode, namaSektor] of Object.entries(KBLI_TO_PDRB)) {
  if (!sektorCache.has(namaSektor)) {
    const sektor = getSektorByName(namaSektor);

    if (!sektor) {
      throw new Error(
        `Sektor PDRB tidak ditemukan:\n${namaSektor}`
      );
    }

    sektorCache.set(namaSektor, sektor);
  }
}

console.log(
  `Sektor PDRB ditemukan : ${sektorCache.size}`
);

// ============================================================
// 5. TAMPILKAN MASTER MAPPING
// ============================================================

console.log("\n=== MASTER MAPPING ===");

console.table(
  Object.entries(KBLI_TO_PDRB).map(
    ([kode, namaSektor]) => ({
      kbli: kode,
      sektor_id: sektorCache.get(namaSektor).id,
      sektor: namaSektor,
    })
  )
);

// ============================================================
// 6. CEK JUMLAH KBLI
// ============================================================

const jumlahKbli = db
  .prepare(`
    SELECT COUNT(*) AS jumlah
    FROM kbli_2025
    WHERE aktif = 1
  `)
  .get().jumlah;

console.log(
  `\nJumlah KBLI aktif : ${jumlahKbli}`
);

if (jumlahKbli !== 2444) {
  console.warn(
    `PERINGATAN: jumlah KBLI bukan 2444, tetapi ${jumlahKbli}`
  );
}

// ============================================================
// 7. TRANSAKSI MAPPING
// ============================================================

const transaction = db.transaction(() => {

  // Kita rebuild tabel mapping.
  //
  // Aman karena tabel kbli_sektor hanya menyimpan
  // relasi KBLI -> sektor PDRB.
  //
  // Keyword dan fenomena tidak disentuh.

  db.prepare(`
    DELETE FROM kbli_sektor
  `).run();

  const insert = db.prepare(`
    INSERT INTO kbli_sektor (
      kbli_id,
      sektor_id
    )
    VALUES (?, ?)
  `);

  const kbliRows = db.prepare(`
    SELECT
      id,
      kode,
      kategori_code
    FROM kbli_2025
    WHERE aktif = 1
    ORDER BY kode
  `).all();

  for (const row of kbliRows) {

    const namaSektor =
      KBLI_TO_PDRB[row.kategori_code];

    if (!namaSektor) {
      throw new Error(
        `Kategori KBLI tidak memiliki mapping: ${row.kode}`
      );
    }

    const sektor =
      sektorCache.get(namaSektor);

    if (!sektor) {
      throw new Error(
        `Sektor tidak ditemukan: ${namaSektor}`
      );
    }

    insert.run(
      row.id,
      sektor.id
    );
  }
});

transaction();

console.log(
  "\nMapping KBLI -> sektor PDRB berhasil dibuat."
);

// ============================================================
// 8. VALIDASI HASIL MAPPING
// ============================================================

const totalMapping = db
  .prepare(`
    SELECT COUNT(*) AS jumlah
    FROM kbli_sektor
  `)
  .get().jumlah;

console.log(
  `Jumlah mapping : ${totalMapping}`
);

if (totalMapping !== jumlahKbli) {
  throw new Error(
    `Jumlah mapping (${totalMapping}) ` +
    `tidak sama dengan jumlah KBLI (${jumlahKbli})`
  );
}

// ============================================================
// 9. VALIDASI KBLI TANPA MAPPING
// ============================================================

const tanpaMapping = db
  .prepare(`
    SELECT
      k.id,
      k.kode,
      k.level,
      k.kategori_code,
      k.nama
    FROM kbli_2025 k

    LEFT JOIN kbli_sektor ks
      ON ks.kbli_id = k.id

    WHERE k.aktif = 1
      AND ks.kbli_id IS NULL

    ORDER BY k.kode
  `)
  .all();

console.log(
  `\nKBLI tanpa mapping : ${tanpaMapping.length}`
);

if (tanpaMapping.length > 0) {
  console.table(tanpaMapping);

  throw new Error(
    "Masih ada KBLI yang belum memiliki sektor PDRB."
  );
}

// ============================================================
// 10. VALIDASI DUPLIKASI
// ============================================================

const duplikat = db
  .prepare(`
    SELECT
      kbli_id,
      COUNT(*) AS jumlah
    FROM kbli_sektor
    GROUP BY kbli_id
    HAVING COUNT(*) > 1
  `)
  .all();

console.log(
  `KBLI dengan mapping ganda : ${duplikat.length}`
);

if (duplikat.length > 0) {
  console.table(duplikat);

  throw new Error(
    "Ditemukan KBLI dengan lebih dari satu sektor PDRB."
  );
}

// ============================================================
// 11. RINGKASAN PER SEKTOR PDRB
// ============================================================

const summary = db
  .prepare(`
    SELECT
      s.id AS sektor_id,
      s.nama AS sektor,
      COUNT(ks.kbli_id) AS jumlah_kbli

    FROM sektor s

    LEFT JOIN kbli_sektor ks
      ON ks.sektor_id = s.id

    GROUP BY
      s.id,
      s.nama

    ORDER BY
      s.id
  `)
  .all();

console.log("\n=== DISTRIBUSI KBLI PER SEKTOR PDRB ===");

console.table(summary);

// ============================================================
// 12. VALIDASI 17 SEKTOR
// ============================================================

const sektorTerpakai = summary.filter(
  (row) => row.jumlah_kbli > 0
).length;

console.log(
  `\nSektor PDRB terpakai : ${sektorTerpakai}`
);

if (sektorTerpakai !== 17) {
  console.warn(
    "PERINGATAN: belum semua 17 sektor PDRB memiliki KBLI."
  );
}

// ============================================================
// 13. CEK DATA LAMA
// ============================================================

const keywordCount = db
  .prepare(`
    SELECT COUNT(*) AS jumlah
    FROM kbli_keyword
  `)
  .get().jumlah;

const fenomenaCount = db
  .prepare(`
    SELECT COUNT(*) AS jumlah
    FROM fenomena
  `)
  .get().jumlah;

console.log("\n=== DATA SIMFONI ===");

console.log(
  `KBLI Keyword : ${keywordCount}`
);

console.log(
  `Fenomena     : ${fenomenaCount}`
);

console.log("\n==============================================");
console.log("      MAPPING KBLI -> PDRB SELESAI");
console.log("==============================================");