const { db } = require("../lib/db");
const { detectDistrik } = require("../lib/wilayah");
const { getOrCreateDistrik } = require("../lib/fenomenaRepo"); // >>> tambah getOrCreateSektor
const { fetchText, extractArticleBody } = require("../lib/articleBodyExtractor");
const { classifyEconomicSector, saveFenomenaClassification } = require("../lib/kbliClassifier"); // >>> saveFenomenaClassification

const confirm = process.argv.includes("--confirm");
const semua = process.argv.includes("--all");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = db.prepare(`
  SELECT f.id, f.judul, f.uraian, f.url, f.distrik_id, d.nama AS distrik_lama,
         f.sektor_id, s.nama AS sektor_lama
  FROM fenomena f
  LEFT JOIN distrik d ON d.id = f.distrik_id
  LEFT JOIN sektor s ON s.id = f.sektor_id
  WHERE f.sumber_tipe = 'portal_berita' AND f.url IS NOT NULL
  ${semua ? "" : "AND (f.distrik_id IS NULL OR f.sektor_id IS NULL)"}
`).all();

console.log(`Memeriksa ${rows.length} fenomena (fetch ulang halaman artikel, ~300ms/artikel)...`);

const updDistrik = db.prepare(`
  UPDATE fenomena
  SET distrik_id=?, lokasi=?, uraian=?,
      sektor_id=?, klasifikasi_score=?, klasifikasi_confidence=?, classification_method=?
  WHERE id=?
`);
let berubahDistrik = 0, berubahSektor = 0, gagalFetch = 0;

(async () => {
  for (const row of rows) {
    let html;
    try { html = await fetchText(row.url); } catch { gagalFetch++; continue; }
    await sleep(300);

    const body = extractArticleBody(html);
    if (!body) continue;

    const fullText = `${row.judul} ${body}`;
    const distrikBaru = detectDistrik(fullText);
    const classification = classifyEconomicSector(fullText); // >>> re-klasifikasi sektor

    const distrikBeda = distrikBaru && distrikBaru !== row.distrik_lama;
    const sektorBeda = classification.sektor && classification.sektor !== row.sektor_lama;
    if (!distrikBeda && !sektorBeda) continue;

    if (distrikBeda) { berubahDistrik++; console.log(`  [#${row.id}] distrik: ${row.distrik_lama || "(kosong)"} -> ${distrikBaru}`); }
    if (sektorBeda) { berubahSektor++; console.log(`  [#${row.id}] sektor: ${row.sektor_lama || "(kosong)"} -> ${classification.sektor} (conf ${classification.confidence}%)`); }

    if (confirm) {
      const distrikId = distrikBaru ? getOrCreateDistrik(distrikBaru) : row.distrik_id;
      const sektorId = classification.sektorId || row.sektor_id;

      updDistrik.run(
        distrikId, distrikBaru || null, body.slice(0, 800),
        sektorId, classification.score || 0, classification.confidence || 0,
        classification.method || "unclassified",
        row.id
      );

      // >>> isi ulang tabel fenomena_kbli (top-5 kandidat kode KBLI)
      if (classification.kbli?.length) {
        saveFenomenaClassification(row.id, classification);
      }
    }
  }

  console.log(`\nDistrik berubah: ${berubahDistrik}, Sektor berubah: ${berubahSektor}, gagal fetch: ${gagalFetch}.`);
  console.log(confirm ? "Tersimpan." : "Dry-run. Tambah --confirm untuk simpan.");
})();