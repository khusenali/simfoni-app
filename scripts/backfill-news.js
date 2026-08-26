// scripts/backfill-news.js
// Ambil arsip berita bulan tertentu dari portal yang mendukung URL arsip
// bulanan (lihat ARCHIVE_FEEDS di lib/newsScraper.js).
//
// Jalankan: node scripts/backfill-news.js "Raja Ampat News" 2025 1 2025 1
//           (argumen: nama_sumber tahun_awal bulan_awal tahun_akhir bulan_akhir)
const { scrapeArchiveRange } = require("../lib/newsScraper");

const [, , namaSumber, fromYear, fromMonth, toYear, toMonth] = process.argv;

if (!namaSumber || !fromYear || !fromMonth) {
  console.log('Cara pakai: node scripts/backfill-news.js "Raja Ampat News" 2025 1 [2025] [1]');
  process.exit(1);
}

(async () => {
  console.log(`Mengambil arsip ${namaSumber} dari ${fromMonth}/${fromYear} sampai ${toMonth || fromMonth}/${toYear || fromYear}...`);
  const result = await scrapeArchiveRange(
    namaSumber,
    parseInt(fromYear, 10), parseInt(fromMonth, 10),
    parseInt(toYear || fromYear, 10), parseInt(toMonth || fromMonth, 10)
  );
  console.log(`Selesai. Baru: ${result.inserted}, mirip: ${result.mirip}, dilewati: ${result.skipped}, dihapus otomatis (tidak relevan): ${result.dihapusOtomatis || 0}.`);
  result.perBulan.forEach((b) => {
    console.log(`  ${b.year}-${String(b.month).padStart(2, "0")}: ${b.inserted} baru (${b.url})`);
  });
  if (result.errors.length) console.warn("Error pada sebagian bulan:", result.errors);
  if (result.catatan?.length) {
    console.warn("\nBulan yang perlu dicoba ulang manual (gagal walau sudah retry otomatis):");
    result.catatan.forEach((c) => console.warn(`  - ${c}`));
  }
  process.exit(0);
})();