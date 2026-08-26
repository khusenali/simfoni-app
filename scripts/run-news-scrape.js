// scripts/run-news-scrape.js
// Dipanggil manual (npm run scrape:news) atau lewat cron job / scheduler
// (mis. cron server, GitHub Actions schedule, atau node-cron di server.js).
const { scrapeAllNewsFeeds } = require("../lib/newsScraper");

(async () => {
  console.log("Memulai scraping portal berita...");
  const result = await scrapeAllNewsFeeds();
  console.log(`Selesai. Baru: ${result.inserted}, dilewati: ${result.skipped}.`);
  if (result.errors.length) {
    console.warn("Ada error pada sebagian feed:", result.errors);
  }
  process.exit(0);
})();
