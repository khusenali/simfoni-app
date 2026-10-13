// scripts/fix-rri-title-suffix.js
// Bersihin suffix " - RRI.CO.ID" / " - RRI.co.id" dari judul fenomena sumber
// RRI yang udah kesimpen (dari backfill sebelum fetchArticleDetail di-fix).
require("dotenv").config({ path: ".env.local" });
const { db } = require("../lib/db");

function stripRriTitleSuffix(title) {
  return (title || "").replace(/\s*-\s*RRI\.co\.id\s*$/i, "").trim();
}

async function main() {
  const rows = await db.prepare(
    "SELECT id, judul FROM fenomena WHERE nama_sumber = 'RRI' AND judul LIKE '%RRI.co.id%' OR (nama_sumber = 'RRI' AND judul LIKE '%RRI.CO.ID%')"
  ).all();

  console.log(`Ditemukan ${rows.length} judul RRI yang perlu dibersihin.`);

  let fixed = 0;
  for (const row of rows) {
    const cleaned = stripRriTitleSuffix(row.judul);
    if (cleaned !== row.judul) {
      await db.prepare("UPDATE fenomena SET judul = ? WHERE id = ?").run(cleaned, row.id);
      fixed++;
    }
  }

  console.log(`Selesai. Dibersihin: ${fixed}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});