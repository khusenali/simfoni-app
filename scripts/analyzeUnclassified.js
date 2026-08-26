const { db } = require("../lib/db");
const { classifyEconomicSector } = require("../lib/kbliClassifier");

const rows = db.prepare(`
  SELECT
    id,
    tanggal,
    judul,
    uraian,
    penyebab,
    dampak,
    lokasi,
    sumber_tipe
  FROM fenomena
  WHERE sektor_id IS NULL
  ORDER BY id
`).all();

console.log("========================================");
console.log("ANALISIS FENOMENA TIDAK TERKLASIFIKASI");
console.log("========================================");

console.log(`Jumlah: ${rows.length}\n`);

for (const row of rows) {

  const text = [
    row.judul,
    row.uraian,
    row.penyebab,
    row.dampak,
    row.lokasi
  ]
    .filter(Boolean)
    .join(" ");

  const result = classifyEconomicSector(text);

  console.log("----------------------------------------");
  console.log(`ID       : ${row.id}`);
  console.log(`Tanggal  : ${row.tanggal}`);
  console.log(`Judul    : ${row.judul}`);
  console.log(`Lokasi   : ${row.lokasi || "-"}`);

  console.log("\nTEKS:");
  console.log(text.substring(0, 1000));

  console.log("\nHASIL:");
  console.log(`Sektor     : ${result.sektor || "-"}`);
  console.log(`Score      : ${result.score}`);
  console.log(`Confidence : ${result.confidence}%`);
  console.log(`Method     : ${result.method}`);

  console.log("\nMATCHED KEYWORDS:");

  if (result.matchedKeywords?.length) {
    console.table(
      result.matchedKeywords.map(x => ({
        keyword: x.keyword,
        tipe: x.tipe,
        bobot: x.bobot,
        kbli: x.kodeKbli,
        sektor: x.sektor
      }))
    );
  } else {
    console.log("Tidak ada keyword KBLI yang cocok.");
  }
}

console.log("\n========================================");
console.log("SELESAI");
console.log("========================================");