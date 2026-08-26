// scripts/fix-sentimen.js
// Backfill ulang sentimen semua fenomena pakai analyzeSentiment() versi
// terbaru (udah paham negasi). Default: DRY RUN (cuma preview, gak ubah
// apa-apa). Tambah --confirm buat beneran nyimpen perubahan.
//
// Default cuma nyentuh fenomena berstatus Draft -- yang udah Terverifikasi
// dilewatin, karena sentimennya bisa aja udah dikoreksi manual sama Tim
// Neraca dan gak boleh ketimpa diam-diam. Tambah --all kalau memang mau
// nimpa yang Terverifikasi juga (pakai hati-hati, cek preview-nya dulu).
//
// Jalanin (preview):        node scripts/fix-sentimen.js
// Simpen beneran:            node scripts/fix-sentimen.js --confirm
// Sertakan Terverifikasi:    node scripts/fix-sentimen.js --confirm --all

const { db } = require("../lib/db");
const { analyzeSentiment } = require("../lib/textmining");

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const includeAll = args.includes("--all");

const rows = db.prepare(`
  SELECT id, judul, uraian, sentimen, status
  FROM fenomena
  ${includeAll ? "" : "WHERE status = 'Draft'"}
`).all();

let changed = 0;
let sama = 0;

const update = db.prepare("UPDATE fenomena SET sentimen = ?, updated_at = datetime('now') WHERE id = ?");

for (const row of rows) {
  const text = `${row.judul} ${row.uraian || ""}`;
  const sentimenBaru = analyzeSentiment(text);

  if (sentimenBaru === row.sentimen) {
    sama++;
    continue;
  }

  changed++;
  console.log(`#${row.id} [${row.status}] "${row.sentimen}" -> "${sentimenBaru}"  ${row.judul.slice(0, 60)}`);

  if (confirm) update.run(sentimenBaru, row.id);
}

console.log(`\nTotal dicek: ${rows.length}${includeAll ? "" : " (status Draft saja)"}`);
console.log(`Sama, gak berubah: ${sama}`);
console.log(`${confirm ? "Diubah" : "Akan diubah kalau --confirm"}: ${changed}`);
if (!confirm && changed > 0) {
  console.log("\nIni baru preview. Jalanin lagi dengan --confirm buat beneran nyimpen.");
}