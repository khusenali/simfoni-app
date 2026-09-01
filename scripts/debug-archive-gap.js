// scripts/debug-archive-gap.js
// Diagnostik satu kali: telusuri artikel di feed arsip bulanan, cek kenapa
// artikel di rentang tanggal tertentu tidak masuk ke database.
// Jalankan: node scripts/debug-archive-gap.js
require("dotenv").config({ path: ".env.local" });
const Parser = require("rss-parser");
const parser = new Parser({ timeout: 15000 });
const { isRajaAmpatRelated, isExcludedContent } = require("../lib/textmining");
const { findByUrl } = require("../lib/fenomenaRepo");

const BASE_URL = "https://rajaampatnews.com/2026/08/feed/";
const GAP_START = new Date("2026-08-24T00:00:00+09:00");
const GAP_END = new Date("2026-08-29T00:00:00+09:00");

(async () => {
  const allItems = [];
  for (let page = 1; page <= 25; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}?paged=${page}`;
    let parsed;
    try {
      parsed = await parser.parseURL(url);
    } catch (e) {
      console.log(`Halaman ${page}: gagal fetch (${e.message}), stop.`);
      break;
    }
    if (!parsed.items || parsed.items.length === 0) {
      console.log(`Halaman ${page}: kosong, stop.`);
      break;
    }
    allItems.push(...parsed.items);
    if (parsed.items.length < 10) {
      console.log(`Halaman ${page}: cuma ${parsed.items.length} item, ini halaman terakhir.`);
      break;
    }
  }

  console.log(`\nTotal item terkumpul dari semua halaman: ${allItems.length}\n`);

  const gapItems = allItems.filter((it) => {
    const d = new Date(it.isoDate || it.pubDate);
    return d >= GAP_START && d < GAP_END;
  });

  console.log(`Item bertanggal 24-28 Agustus 2026 di feed arsip: ${gapItems.length}\n`);

  if (gapItems.length === 0) {
    const dates = allItems
      .map((it) => (it.isoDate || it.pubDate || "").slice(0, 10))
      .filter(Boolean)
      .sort();
    console.log("Gak ada SATU PUN item bertanggal 24-28 Agustus di feed arsip ini.");
    console.log(`Rentang tanggal yang BENERAN ada di feed: ${dates[0]} sampai ${dates[dates.length - 1]}`);
    console.log("\nSemua tanggal unik yang ditemukan:");
    console.log([...new Set(dates)].join(", "));
  } else {
    for (const it of gapItems) {
      const url = it.link;
      const title = it.title || "";
      const content = it.contentSnippet || it.content || "";
      const relevant = isRajaAmpatRelated(title, content);
      const excluded = isExcludedContent(title);
      const existing = await findByUrl(url);
      console.log(`- [${it.isoDate || it.pubDate}] "${title}"`);
      console.log(`    url: ${url}`);
      console.log(`    relevan(RajaAmpat): ${relevant} | excluded: ${excluded} | sudah_ada_di_db: ${!!existing}${existing ? ` (id=${existing.id})` : ""}`);
    }
  }

  process.exit(0);
})();