const fs = require("fs");
const path = require("path");
const { db } = require("./db");

const ARCHIVE_DIR = path.join(process.cwd(), "data", "archive");

function getCutoffYear(now = new Date()) {
  return now.getFullYear() - 1; // simpan tahun ini & tahun lalu
}

function archiveRows(rows, year) {
  if (!rows.length) return null;
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const filePath = path.join(ARCHIVE_DIR, `fenomena-${year}.json`);
  let existing = [];
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { existing = []; }
  }
  fs.writeFileSync(filePath, JSON.stringify([...existing, ...rows], null, 2), "utf8");
  return filePath;
}

async function cleanupOldFenomena(now = new Date()) {
  const cutoffYear = getCutoffYear(now);
  const rows = await db.prepare(`
    SELECT * FROM fenomena WHERE CAST(strftime('%Y', tanggal, '+9 hours') AS INTEGER) < ?
  `).all(cutoffYear);

  if (!rows.length) { await logCleanup({ deleted: 0, cutoffYear }); return { cutoffYear, deleted: 0, archivedFiles: [] }; }

  const byYear = {};
  rows.forEach((r) => {
    const y = new Date(r.tanggal).getFullYear();
    (byYear[y] ||= []).push(r);
  });
  const archivedFiles = Object.entries(byYear).map(([year, r]) => archiveRows(r, year)).filter(Boolean);

  const del = await db.prepare(`DELETE FROM fenomena WHERE CAST(strftime('%Y', tanggal, '+9 hours') AS INTEGER) < ?`).run(cutoffYear);
  await logCleanup({ deleted: del.changes, cutoffYear });
  return { cutoffYear, deleted: del.changes, archivedFiles };
}

async function logCleanup({ deleted, cutoffYear }) {
  await db.prepare(`
    INSERT INTO sync_log (tipe, last_sync, inserted, skipped)
    VALUES ('cleanup', datetime('now'), 0, ?)
    ON CONFLICT(tipe) DO UPDATE SET last_sync = excluded.last_sync, skipped = excluded.skipped
  `).run(deleted);
  console.log(`[cleanupOldData] cutoff < ${cutoffYear}, dihapus: ${deleted} baris`);
}

module.exports = { cleanupOldFenomena, getCutoffYear };