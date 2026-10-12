// scripts/debug-newsapi.js
// Diagnostik: coba beberapa variasi query ke NewsAPI, cetak hasil mentahnya,
// biar ketauan apa "0 hasil" itu beneran gak ada berita, atau kefilter
// kebanyakan (bahasa/domain/dll).
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.NEWS_API_KEY;
if (!apiKey) { console.error("NEWS_API_KEY belum diisi di .env.local"); process.exit(1); }

async function tryQuery(label, params) {
  const url = `https://newsapi.org/v2/everything?${new URLSearchParams({ ...params, apiKey }).toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(`\n=== ${label} ===`);
  console.log("status:", data.status, "| totalResults:", data.totalResults, "| code/message:", data.code || "-", data.message || "-");
  (data.articles || []).slice(0, 5).forEach((a) => {
    console.log(`  - [${a.publishedAt}] "${a.title}" -- ${a.source?.name} -- ${a.url}`);
  });
}

(async () => {
  await tryQuery("1. Query asli persis (q=Raja Ampat, lang id, exclude 3 domain)", {
    q: "Raja Ampat", language: "id", sortBy: "publishedAt", pageSize: "20",
    excludeDomains: "rajaampatnews.com,rri.co.id,papua-barat.wahananews.co",
  });

  await tryQuery("2. Tanpa filter bahasa", {
    q: "Raja Ampat", sortBy: "publishedAt", pageSize: "20",
  });

  await tryQuery("3. Tanpa exclude domain (biar keliatan portal 3 itu juga ketangkep gak)", {
    q: "Raja Ampat", language: "id", sortBy: "publishedAt", pageSize: "20",
  });

  await tryQuery("4. Query paling longgar (cuma kata Raja Ampat, tanpa filter apa-apa)", {
    q: "Raja Ampat", pageSize: "20",
  });

  process.exit(0);
})();