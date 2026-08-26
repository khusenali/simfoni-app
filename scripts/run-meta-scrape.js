// scripts/run-meta-scrape.js
// Dipanggil manual (npm run scrape:meta) atau lewat cron job / scheduler.
// Membaca daftar akun Instagram/Facebook dari tabel `sumber` (platform
// instagram/facebook, aktif = 1), lalu mengambil postingan terbarunya.
const { db } = require("../lib/db");
const { scrapeMetaSources } = require("../lib/metaApi");

(async () => {
  const sumberList = db.prepare(`
    SELECT * FROM sumber WHERE platform IN ('instagram','facebook') AND aktif = 1
  `).all();

  if (!sumberList.length) {
    console.log("Belum ada akun Instagram/Facebook terdaftar pada tabel sumber.");
    process.exit(0);
  }

  console.log(`Memulai scraping ${sumberList.length} akun media sosial...`);
  const result = await scrapeMetaSources(sumberList);
  console.log(`Selesai. Baru: ${result.inserted}, dilewati: ${result.skipped}.`);
  if (result.errors.length) {
    console.warn("Ada error pada sebagian akun:", result.errors);
  }
  process.exit(0);
})();
