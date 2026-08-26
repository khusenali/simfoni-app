// scripts/backfill-rri-tags.js
// Backfill RRI lewat halaman tag topik. Catatan penting: angka tahun di
// nama tag (mis. "raja-ampat-2025") TERBUKTI bukan filter tanggal
// publikasi — RRI cuma menyajikan ~20 artikel terbaru per tag, tanpa
// paginasi. Tanggal asli tetap diambil dari isi tiap halaman artikel
// (extractTanggalFromBody), bukan dari nama tag.
//
// Default: coba tag umum "raja-ampat" + tag tiap kecamatan Raja Ampat
// (diturunkan otomatis dari lib/wilayah.js). Banyak kecamatan terpencil
// kemungkinan besar 0 hasil (RRI jarang liput sampai level itu) — itu wajar,
// bukan error.
//
// Jalankan: node scripts/backfill-rri-tags.js
//       atau: node scripts/backfill-rri-tags.js raja-ampat waisai misool   (pilih tag manual)
const { backfillFromTags, buildDistrikTagConfigs } = require("../lib/rriTagScraper");

const manualTags = process.argv.slice(2);

const tagConfigs = manualTags.length
  ? manualTags.map((tag) => ({ region: "sorong", tag }))
  : [
      { region: "sorong", tag: "raja-ampat" },
      { region: "sorong", tag: "raja-ampat-2025" },
      { region: "sorong", tag: "raja-ampat-2026" },
      ...buildDistrikTagConfigs(),
    ];

(async () => {
  console.log(`Mencoba ${tagConfigs.length} tag: ${tagConfigs.map((t) => t.tag).join(", ")}\n`);
  const result = await backfillFromTags(tagConfigs);

  console.log(`\nSelesai. URL dicek: ${result.totalUrlDicek}, baru masuk: ${result.inserted}, dilewati: ${result.skipped}, dihapus otomatis (tidak relevan): ${result.dihapusOtomatis}.`);
  if (result.errors.length) {
    console.warn(`Ada ${result.errors.length} error:`);
    console.warn(result.errors.slice(0, 10));
  }
  process.exit(0);
})();