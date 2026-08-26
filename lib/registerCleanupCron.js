// lib/registerCleanupCron.js
// File ini HANYA dipanggil lewat dynamic import() di instrumentation.js,
// supaya webpack tidak ikut bundling 'fs'/'better-sqlite3' ke edge runtime.
const cron = require("node-cron");
const { cleanupOldFenomena } = require("./cleanupOldData");

function registerCleanupCron() {
  cron.schedule("0 1 * * *", () => {
    try {
      cleanupOldFenomena();
    } catch (err) {
      console.error("[cleanupOldData] gagal:", err);
    }
  });
  console.log("[instrumentation] cron cleanup terdaftar (tiap hari 01:00).");
}

module.exports = { registerCleanupCron };