// scripts/fix-sektor.js
// AUDIT, BUKAN AUTO-FIX -- beda sama fix-sentimen.js. Sentimen (Positif/
// Netral/Negatif) itu 1 dari 3 pilihan, jadi klasifikasi ulang & timpa
// otomatis cukup aman. Sektor PDRB ada puluhan pilihan yang kadang tumpang
// tindih (satu berita bisa nyerempet 2-3 sektor sekaligus, dan penentuan
// akhirnya butuh penilaian konteks yang cuma bisa dilakuin manusia) --
// jadi script ini CUMA MELAPORKAN mana yang beda, gak nulis apa-apa ke DB.
//
// Tujuannya: nemuin KATA KUNCI yang paling sering "menang" (bikin sistem
// milih sektor A) padahal Tim Neraca akhirnya milih sektor B pas verifikasi.
// Kata kunci yang sering muncul di daftar itu jadi kandidat kuat buat:
//   - diturunkan bobotnya di tabel kbli_keyword, atau
//   - ditambahin exclusion baru di tabel kbli_exclusion.
//
// Jalanin:  node --env-file=.env.local scripts/fix-sektor.js
// Opsional: --limit=500   (default cek semua yang Terverifikasi)

const { db } = require("../lib/db");
const { classifyEconomicSector, loadRules, loadExclusions } = require("../lib/kbliClassifier");

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

async function main() {
  const rules = await loadRules();
  const exclusions = await loadExclusions();

  const rows = await db.prepare(`
    SELECT f.id, f.judul, f.uraian, f.sektor_id, s.nama AS sektor_saat_ini
    FROM fenomena f
    LEFT JOIN sektor s ON s.id = f.sektor_id
    WHERE f.status = 'Terverifikasi'
    ORDER BY f.id
    ${limit ? `LIMIT ${limit}` : ""}
  `).all();

  let sama = 0;
  let beda = 0;
  let tanpaSektorSaatIni = 0;
  const keywordOffender = new Map(); // keyword -> berapa kali nyumbang skor ke sektor yang SALAH (beda dari hasil verifikasi)

  for (const row of rows) {
    if (!row.sektor_id) { tanpaSektorSaatIni++; continue; }

    const hasil = await classifyEconomicSector(
      { judul: row.judul, uraian: row.uraian || "" },
      { rules, exclusions }
    );

    if (hasil.sektorId === row.sektor_id) {
      sama++;
      continue;
    }

    beda++;
    console.log(`#${row.id} sistem="${hasil.sektor || "(tidak terklasifikasi)"}" (skor ${hasil.score.toFixed(2)}) vs verifikasi="${row.sektor_saat_ini}"`);
    console.log(`   ${row.judul.slice(0, 80)}`);

    // Kata kunci yang nyumbang skor ke sektor hasil sistem (yang ternyata salah)
    // dicatat sebagai "offender" -- makin sering muncul di sini, makin layak ditinjau.
    const offenders = hasil.matchedKeywords.filter((m) => m.sektorId === hasil.sektorId);
    for (const m of offenders) {
      const key = `${m.keyword} (-> ${m.sektor})`;
      keywordOffender.set(key, (keywordOffender.get(key) || 0) + 1);
    }
    if (offenders.length) {
      console.log(`   kata kunci pemicu: ${offenders.map((m) => m.keyword).join(", ")}`);
    }
    console.log("");
  }

  console.log("=".repeat(70));
  console.log(`Total Terverifikasi dicek: ${rows.length}`);
  console.log(`Sektor sistem SAMA dengan verifikasi manusia: ${sama}`);
  console.log(`Sektor sistem BEDA dengan verifikasi manusia: ${beda}`);
  if (tanpaSektorSaatIni) console.log(`Dilewati (gak ada sektor_id tersimpan): ${tanpaSektorSaatIni}`);

  const topOffenders = [...keywordOffender.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (topOffenders.length) {
    console.log("\nKata kunci paling sering bikin salah klasifikasi (kandidat buat diturunkan bobot / ditambah exclusion):");
    for (const [key, count] of topOffenders) {
      console.log(`  ${count}x  ${key}`);
    }
  }
}

main().catch((err) => {
  console.error("Gagal jalanin audit:", err);
  process.exit(1);
});