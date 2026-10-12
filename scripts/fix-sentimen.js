// scripts/fix-sentimen.js
// Backfill ulang sentimen semua fenomena pakai resolveSentimentBatch()
// (coba IndoBERT dulu, fallback ke lexicon analyzeSentiment() kalau
// model belum ke-setup / gagal). Default: DRY RUN (cuma preview, gak
// ubah apa-apa). Tambah --confirm buat beneran nyimpen perubahan.
//
// Default cuma nyentuh fenomena berstatus Draft -- yang udah Terverifikasi
// dilewatin, karena sentimennya bisa aja udah dikoreksi manual sama Tim
// Neraca dan gak boleh ketimpa diam-diam. Tambah --all kalau memang mau
// nimpa yang Terverifikasi juga (pakai hati-hati, cek preview-nya dulu).
//
// Jalanin (preview):        node scripts/fix-sentimen.js
// Simpen beneran:            node scripts/fix-sentimen.js --confirm
// Sertakan Terverifikasi:    node scripts/fix-sentimen.js --confirm --all
//
// Diproses per-batch (bukan satu-satu) biar efisien kalau datanya banyak --
// tiap batch cuma satu panggilan ke IndoBERT/lexicon.

const { db } = require("../lib/db");
const { resolveSentimentBatch } = require("../lib/sentimentService");

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const includeAll = args.includes("--all");
const BATCH_SIZE = 50;

async function main() {
  const rows = await db.prepare(`
    SELECT id, judul, uraian, sentimen, status
    FROM fenomena
    ${includeAll ? "" : "WHERE status = 'Draft'"}
  `).all();

  let changed = 0;
  let sama = 0;
  const update = db.prepare("UPDATE fenomena SET sentimen = ?, updated_at = datetime('now') WHERE id = ?");

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => `${r.judul} ${r.uraian || ""}`);
    const hasilBaru = await resolveSentimentBatch(texts);

    for (let idx = 0; idx < batch.length; idx++) {
      const row = batch[idx];
      const sentimenBaru = hasilBaru[idx];
      if (sentimenBaru === row.sentimen) {
        sama++;
        continue;
      }
      changed++;
      console.log(`#${row.id} [${row.status}] "${row.sentimen}" -> "${sentimenBaru}"  ${row.judul.slice(0, 60)}`);
      if (confirm) await update.run(sentimenBaru, row.id);
    }

    console.log(`... diproses ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log(`\nTotal dicek: ${rows.length}${includeAll ? "" : " (status Draft saja)"}`);
  console.log(`Sama, gak berubah: ${sama}`);
  console.log(`${confirm ? "Diubah" : "Akan diubah kalau --confirm"}: ${changed}`);
  if (!confirm && changed > 0) {
    console.log("\nIni baru preview. Jalanin lagi dengan --confirm buat beneran nyimpen.");
  }
}

main().catch((err) => {
  console.error("Gagal jalanin backfill:", err);
  process.exit(1);
});