// scripts/backfill-wahana.js
// Backfill Wahana News Papua Barat lewat halaman arsip harian.
// Jalankan: node scripts/backfill-wahana.js 2025-01-01 2025-12-31
const { backfillFromArsip } = require("../lib/wahanaArsipScraper");

const [, , fromStr, toStr] = process.argv;

if (!fromStr || !toStr) {
  console.log("Cara pakai: node scripts/backfill-wahana.js <dari:YYYY-MM-DD> <sampai:YYYY-MM-DD>");
  console.log("Contoh tes kecil dulu: node scripts/backfill-wahana.js 2026-08-01 2026-08-05");
  process.exit(1);
}

const fromDate = new Date(fromStr);
const toDate = new Date(toStr);

if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
  console.log("Format tanggal tidak valid. Gunakan YYYY-MM-DD.");
  process.exit(1);
}

(async () => {
  const totalHari = Math.round((toDate - fromDate) / 86400000) + 1;
  console.log(`Backfill Wahana News Papua Barat: ${fromStr} s.d. ${toStr} (${totalHari} hari).`);
  console.log("Ini mengambil 1 halaman arsip PER HARI — untuk rentang setahun penuh, bisa memakan waktu cukup lama.\n");

  const result = await backfillFromArsip(fromDate, toDate);

  console.log(`\nSelesai. Hari dicek: ${result.hariDicek}, URL dicek: ${result.totalUrlDicek}, baru masuk: ${result.inserted}, dilewati: ${result.skipped}, dihapus otomatis: ${result.dihapusOtomatis}.`);
  if (result.errors.length) {
    console.warn(`Ada ${result.errors.length} error (5 pertama):`);
    console.warn(result.errors.slice(0, 5));
  }
  process.exit(0);
})();