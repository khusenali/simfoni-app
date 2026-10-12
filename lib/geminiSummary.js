// lib/geminiSummary.js
// Ringkasan naratif otomatis. Paragraf 1 dari data statistik yang SUDAH kita
// hitung sendiri (bukan nyari fakta baru). Paragraf 2 (opsional) dari SAMPEL
// judul+uraian berita ASLI per periode -- ngerangkum TEMA/ISI pemberitaan,
// bukan angka. Dua-duanya gak butuh Google Search grounding, gak kena
// syarat billing/prepay kayak fitur kandidat berita.

function buildDataText(periodLabels, items) {
  return items
    .slice(0, 10) // cukup 10 teratas biar prompt gak kepanjangan
    .map((i) => {
      const rincian = periodLabels.map((pl, idx) => `${pl}=${i.values[idx]}`).join(", ");
      return `- ${i.label}: ${rincian} (perubahan awal-akhir: ${i.deltaPct > 0 ? "+" : ""}${i.deltaPct}%)`;
    })
    .join("\n");
}

function buildArtikelText(periodsWithArticles) {
  return periodsWithArticles
    .map((p) => {
      const daftar = (p.articles || [])
        .map((a) => `  - ${a.judul}${a.uraian ? `: ${a.uraian.slice(0, 150)}` : ""}`)
        .join("\n");
      return `${p.label}:\n${daftar || "  (tidak ada data)"}`;
    })
    .join("\n\n");
}

async function buatRingkasanPerbandingan({ dimensionLabel, periodLabels, items, artikelSample }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diatur di environment variables.");

  const dataText = buildDataText(periodLabels, items);
  const includeArtikel = Array.isArray(artikelSample) && artikelSample.length > 0;
  const artikelText = includeArtikel ? buildArtikelText(artikelSample) : null;

  const prompt = includeArtikel
    ? `Data perbandingan jumlah fenomena ekonomi per ${dimensionLabel} antara ${periodLabels.length} periode: ${periodLabels.join(", ")}.

${dataText}

Contoh judul & ringkasan berita ASLI dari tiap periode (sampel acak, bukan daftar lengkap):

${artikelText}

Tulis TEPAT DUA paragraf terpisah, dipisahkan satu baris kosong di antaranya:
Paragraf 1: ringkasan perubahan PALING MENONJOL pada ${dimensionLabel}, berdasarkan data angka di atas (maksimal 4 kalimat).
Paragraf 2: ringkasan TEMA/TOPIK yang muncul di pemberitaan tiap periode berdasarkan contoh judul & ringkasan berita di atas, dan soroti pergeseran tema paling menonjol antar periode kalau ada (maksimal 4 kalimat). Fokus ke ISI/TOPIK beritanya, JANGAN sebutkan angka statistik di paragraf ini.
Bahasa Indonesia formal statistik. Jangan pakai markdown, jangan pakai bullet point, jangan beri judul/label di depan tiap paragraf -- langsung isi paragrafnya saja.`
    : `Data perbandingan jumlah fenomena ekonomi per ${dimensionLabel} antara ${periodLabels.length} periode: ${periodLabels.join(", ")}.

${dataText}

Tulis ringkasan singkat (maksimal 4 kalimat, bahasa Indonesia formal statistik) yang menyoroti perubahan PALING MENONJOL saja (kenaikan/penurunan tertinggi antar periode). Jangan sebutkan semua item, cukup yang paling signifikan. Jangan pakai markdown, jangan pakai bullet point, langsung paragraf biasa.`;

  // 503 "model sedang sibuk" itu error TEMPORER dari sisi Google (server
  // overload sesaat, bukan masalah di kode/billing kita) -- coba ulang
  // otomatis 2x dengan jeda sebelum benar-benar dianggap gagal.
  const MAX_RETRY = 2;
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (res.status === 503 && attempt < MAX_RETRY) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
      if (!text) throw new Error("Gemini tidak mengembalikan ringkasan.");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt >= MAX_RETRY) throw err;
    }
  }
  throw lastErr;
}

// Ringkasan tema untuk SATU periode aja (dipakai kartu "Kondisi PDRB" di
// Dashboard) -- beda dari buatRingkasanPerbandingan yang selalu minta ≥2
// periode buat dibandingkan.
async function buatRingkasanTema({ periodLabel, articles }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diatur di environment variables.");

  const daftar = (articles || [])
    .map((a) => `- ${a.judul}${a.uraian ? `: ${a.uraian.slice(0, 150)}` : ""}`)
    .join("\n");

  const prompt = `Contoh judul & ringkasan berita (sampel acak, bukan daftar lengkap) dari periode "${periodLabel}":

${daftar || "(tidak ada data)"}

Tulis SATU paragraf singkat (maksimal 3 kalimat, bahasa Indonesia formal statistik) yang merangkum tema/isu UTAMA yang sedang dibahas pada periode ini berdasarkan contoh di atas. Jangan pakai markdown, jangan pakai bullet point, jangan pakai label/judul di depan -- langsung isi paragrafnya saja.`;

  const MAX_RETRY = 2;
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (res.status === 503 && attempt < MAX_RETRY) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
      if (!text) throw new Error("Gemini tidak mengembalikan ringkasan.");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt >= MAX_RETRY) throw err;
    }
  }
  throw lastErr;
}

module.exports = { buatRingkasanPerbandingan, buatRingkasanTema };