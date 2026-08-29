export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerCleanupCron } = await import("./lib/registerCleanupCron");
    registerCleanupCron();

    const cron = require("node-cron");

    cron.schedule("0 */3 * * *", async () => {
      try {
        const { scrapeAllNewsFeeds } = await import("./lib/newsScraper");
        const { db } = await import("./lib/db");
        const result = await scrapeAllNewsFeeds();
        db.prepare(`
          INSERT INTO sync_log (tipe, last_sync, inserted, skipped) VALUES ('news', ?, ?, ?)
          ON CONFLICT(tipe) DO UPDATE SET last_sync = excluded.last_sync, inserted = excluded.inserted, skipped = excluded.skipped
        `).run(new Date().toISOString(), result.inserted, result.skipped);
        console.log(`[cron news] inserted=${result.inserted} skipped=${result.skipped}`);
      } catch (err) {
        console.error("[cron news] gagal:", err);
      }
    });

    cron.schedule("0 */6 * * *", async () => {
      try {
        const { scrapeMetaSources } = await import("./lib/metaApi");
        const { db } = await import("./lib/db");
        const sumberList = db.prepare(`SELECT * FROM sumber WHERE platform IN ('instagram','facebook') AND aktif = 1`).all();
        if (!sumberList.length) return;
        const result = await scrapeMetaSources(sumberList);
        db.prepare(`
          INSERT INTO sync_log (tipe, last_sync, inserted, skipped) VALUES ('meta', ?, ?, ?)
          ON CONFLICT(tipe) DO UPDATE SET last_sync = excluded.last_sync, inserted = excluded.inserted, skipped = excluded.skipped
        `).run(new Date().toISOString(), result.inserted, result.skipped);
        console.log(`[cron meta] inserted=${result.inserted} skipped=${result.skipped}`);
      } catch (err) {
        console.error("[cron meta] gagal:", err);
      }
    });

    console.log("[instrumentation] cron cleanup + scraping otomatis terdaftar.");
  }
}