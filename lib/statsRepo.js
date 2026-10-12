// lib/statsRepo.js
// Kumpulan query agregasi yang memasok kartu & grafik di halaman Dashboard.
const { db } = require("./db");

async function getTotals({ dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = (await db.prepare(`SELECT COUNT(*) c FROM fenomena ${whereSql}`).get(...params)).c;
  const byStatus = await db.prepare(`SELECT status, COUNT(*) c FROM fenomena ${whereSql} GROUP BY status`).all(...params);
  const map = { Draft: 0, Terverifikasi: 0 };
  byStatus.forEach((r) => (map[r.status] = r.c));
  return { total, ...map };
}

async function getSentimenSummary({ dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = (await db.prepare(`SELECT COUNT(*) c FROM fenomena ${whereSql}`).get(...params)).c;
  const safeDivisor = total || 1; // cuma buat cegah bagi nol saat hitung persentase
  const rows = await db.prepare(`SELECT sentimen, COUNT(*) c FROM fenomena ${whereSql} GROUP BY sentimen`).all(...params);
  const result = { Positif: 0, Netral: 0, Negatif: 0 };
  rows.forEach((r) => { if (r.sentimen) result[r.sentimen] = r.c; });
  return {
    total, // angka ASLI (boleh 0), gak dipalsuin lagi jadi 1
    positif: result.Positif, netral: result.Netral, negatif: result.Negatif,
    positifPct: Math.round((result.Positif / safeDivisor) * 100),
    netralPct: Math.round((result.Netral / safeDivisor) * 100),
    negatifPct: Math.round((result.Negatif / safeDivisor) * 100),
  };
}

// Untuk grafik "Fenomena per Bulan" (stacked bar: Draft/Terverifikasi)
async function getFenomenaPerBulan(months = 9) {
  const rows = await db.prepare(`
    SELECT strftime('%Y-%m', tanggal, '+9 hours') ym, status, COUNT(*) c
    FROM fenomena
    GROUP BY ym, status
    ORDER BY ym
  `).all();

  const byMonth = {};
  rows.forEach((r) => {
    if (!byMonth[r.ym]) byMonth[r.ym] = { Draft: 0, Terverifikasi: 0 };
    byMonth[r.ym][r.status] = r.c;
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([ym, v]) => ({ bulan: ym, ...v }));
}

// Untuk grafik "Tren Sentimen" (line chart persentase positif per bulan)
async function getTrenSentimen(months = 9, { sektor, dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (sektor) { where.push("s.nama = ?"); params.push(sektor); }
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await db.prepare(`
    SELECT strftime('%Y-%m', f.tanggal, '+9 hours') ym, f.sentimen, COUNT(*) c
    FROM fenomena f
    LEFT JOIN sektor s ON f.sektor_id = s.id
    ${whereSql}
    GROUP BY ym, f.sentimen
    ORDER BY ym
  `).all(...params);

  const byMonth = {};
  rows.forEach((r) => {
    if (!byMonth[r.ym]) byMonth[r.ym] = { Positif: 0, Netral: 0, Negatif: 0 };
    byMonth[r.ym][r.sentimen] = r.c;
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([ym, v]) => {
      const total = v.Positif + v.Netral + v.Negatif || 1;
      return {
        bulan: ym,
        positifPct: Math.round((v.Positif / total) * 100),
        netralPct: Math.round((v.Netral / total) * 100),
        negatifPct: Math.round((v.Negatif / total) * 100),
        total,
      };
    });
}

async function getTopSektor(limit = 5, { dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

  const total = (await db.prepare(`SELECT COUNT(*) c FROM fenomena f WHERE f.sektor_id IS NOT NULL ${whereSql}`).get(...params)).c || 1;
  const rows = await db.prepare(`
    SELECT s.nama, COUNT(*) c
    FROM fenomena f JOIN sektor s ON f.sektor_id = s.id
    WHERE 1=1 ${whereSql}
    GROUP BY s.nama
    ORDER BY c DESC
    LIMIT ?
  `).all(...params, limit);
  return rows.map((r) => ({ nama: r.nama, jumlah: r.c, pct: Math.round((r.c / total) * 100) }));
}

async function getSumberSummary({ dateFrom, dateTo, maxSlices = 8 } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(nama_sumber), ''), 'Tidak diketahui') nama, COUNT(*) c
    FROM fenomena ${whereSql}
    GROUP BY nama ORDER BY c DESC
  `).all(...params);

  // "Import Excel" & "Input Manual" sama-sama data hasil kerja lapangan Tim
  // Neraca (bukan hasil scraping otomatis) -- digabung jadi satu label
  // "Data Lapangan" KHUSUS untuk chart Sebaran Sumber Data ini. Nama sumber
  // asli di daftar/detail fenomena TIDAK berubah, tetap bisa dibedakan.
  const GABUNG_JADI_DATA_LAPANGAN = ["Import Excel", "Input Manual"];
  const merged = {};
  for (const r of rows) {
    const label = GABUNG_JADI_DATA_LAPANGAN.includes(r.nama) ? "Data Lapangan" : r.nama;
    merged[label] = (merged[label] || 0) + r.c;
  }
  const mergedRows = Object.entries(merged)
    .map(([nama, c]) => ({ nama, c }))
    .sort((a, b) => b.c - a.c);

  const total = mergedRows.reduce((sum, r) => sum + r.c, 0);
  let sumber = mergedRows.map((r) => ({ nama: r.nama, jumlah: r.c }));
  if (sumber.length > maxSlices) {
    const top = sumber.slice(0, maxSlices - 1);
    const sisa = sumber.slice(maxSlices - 1).reduce((sum, r) => sum + r.jumlah, 0);
    sumber = [...top, { nama: "Lainnya", jumlah: sisa }];
  }
  return { total, sumber };
}

async function getSebaranDistrik({ dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

  const rows = await db.prepare(`
    SELECT d.nama, COUNT(*) c
    FROM fenomena f JOIN distrik d ON f.distrik_id = d.id
    WHERE 1=1 ${whereSql}
    GROUP BY d.nama
    ORDER BY c DESC
  `).all(...params);
  return rows.map((r) => ({ nama: r.nama, jumlah: r.c }));
}

async function getKondisiEkonomi({ dateFrom, dateTo, prevDateFrom, prevDateTo } = {}) {
  const s = await getSentimenSummary({ dateFrom, dateTo });
  const label = s.total === 0 ? "Tidak ada data" : s.positifPct >= 50 ? "Tumbuh" : s.positifPct >= 35 ? "Stagnan" : "Kontraksi"

  let delta = 0;
  if (prevDateFrom && prevDateTo) {
    // Ada periode pembanding spesifik (triwulan/tahun sebelumnya) -> selisih
    // langsung dari persentase sentimen positif kedua periode. Kalau periode
    // sebelumnya kosong (mis. sudah diarsip/dihapus retensi), delta tetap 0
    // -- gak ada dasar buat dibandingkan.
    const prev = await getSentimenSummary({ dateFrom: prevDateFrom, dateTo: prevDateTo });
    if (prev.total > 0) delta = s.positifPct - prev.positifPct;
  }
  // "Semua Data" (prevDateFrom/prevDateTo kosong) -> gak ada konsep "periode
  // sebelumnya" yang jelas buat mode ini, jadi delta selalu 0 (gak dibandingkan
  // sama sekali), bukan pakai perkiraan tren 2 bulan kayak sebelumnya.

  return { label, positifPct: s.positifPct, delta, total: s.total };
}

const PERIOD_FORMAT = { minggu: "%Y-%W", bulan: "%Y-%m", tahun: "%Y" };

async function getFenomenaPerPeriode(granularity = "bulan", count = 9, { dateFrom, dateTo } = {}) {
  const fmt = PERIOD_FORMAT[granularity] || PERIOD_FORMAT.bulan;
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await db.prepare(`
    SELECT strftime('${fmt}', tanggal, '+9 hours') periode, status, COUNT(*) c
    FROM fenomena
    ${whereSql}
    GROUP BY periode, status
    ORDER BY periode
  `).all(...params);

  const byPeriode = {};
  rows.forEach((r) => {
    if (!byPeriode[r.periode]) byPeriode[r.periode] = { Draft: 0, Terverifikasi: 0 };
    byPeriode[r.periode][r.status] = r.c;
  });

  return Object.entries(byPeriode)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-count)
    .map(([periode, v]) => ({ periode, ...v }));
}

async function getKondisiTerverifikasi({ dateFrom, dateTo } = {}) {
  const where = ["f.status = 'Terverifikasi'"];
  const params = [];
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = (await db.prepare(`SELECT COUNT(*) c FROM fenomena f ${whereSql}`).get(...params)).c;
  if (!total) {
    return { total: 0, positifPct: 0, netralPct: 0, negatifPct: 0, label: null, sektorUtama: null };
  }

  const rows = await db.prepare(`SELECT f.sentimen, COUNT(*) c FROM fenomena f ${whereSql} GROUP BY f.sentimen`).all(...params);
  const result = { Positif: 0, Netral: 0, Negatif: 0 };
  rows.forEach((r) => { if (r.sentimen) result[r.sentimen] = r.c; });

  const positifPct = Math.round((result.Positif / total) * 100);
  const netralPct = Math.round((result.Netral / total) * 100);
  const negatifPct = Math.round((result.Negatif / total) * 100);
  const label = positifPct >= 50 ? "Membaik" : positifPct >= 35 ? "Stabil" : "Melemah";

  const sektorRow = await db.prepare(`
    SELECT s.nama, COUNT(*) c
    FROM fenomena f JOIN sektor s ON f.sektor_id = s.id
    ${whereSql}
    GROUP BY s.nama ORDER BY c DESC LIMIT 1
  `).get(...params);

  return { total, positifPct, netralPct, negatifPct, label, sektorUtama: sektorRow?.nama || null };
}

async function getKeywordCloud({ dateFrom, dateTo, limit = 40 } = {}) {
  const where = ["keyword IS NOT NULL"];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const rows = await db.prepare(`SELECT keyword FROM fenomena ${whereSql}`).all(...params);

  const freq = {};
  rows.forEach((r) => {
    let words;
    try {
      words = JSON.parse(r.keyword);
    } catch {
      return; // lewati baris dengan JSON keyword yang rusak/kosong
    }
    if (!Array.isArray(words)) return;
    words.forEach((w) => {
      const key = String(w).trim().toLowerCase();
      if (!key) return;
      freq[key] = (freq[key] || 0) + 1;
    });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}

const DIMENSION_CONFIG = {
  sektor: { label: "Sektor", groupExpr: "COALESCE(s.nama, 'Tidak terklasifikasi')", join: "LEFT JOIN sektor s ON f.sektor_id = s.id" },
  distrik: { label: "Distrik", groupExpr: "COALESCE(d.nama, 'Tidak diketahui')", join: "LEFT JOIN distrik d ON f.distrik_id = d.id" },
  sentimen: { label: "Sentimen", groupExpr: "COALESCE(f.sentimen, 'Tidak diketahui')", join: "" },
  sumber: { label: "Sumber Berita", groupExpr: "COALESCE(NULLIF(TRIM(f.nama_sumber), ''), 'Tidak diketahui')", join: "" },
  status: { label: "Status", groupExpr: "f.status", join: "" },
};

const GENERIC_LABELS = ["Tidak terklasifikasi", "Tidak diketahui"];

// Bandingkan jumlah fenomena per-kategori (sektor/distrik/sentimen/dll)
// di antara BEBERAPA periode sekaligus (2 atau lebih) -- bukan cuma 2
// periode tetap. `periods` = array { label, dateFrom, dateTo }, urutannya
// dijaga persis sesuai input (dipakai juga sebagai urutan sumbu waktu untuk
// tampilan line chart sentimen di frontend).
async function getPerbandinganDimensi(dimension, periods) {
  const cfg = DIMENSION_CONFIG[dimension] || DIMENSION_CONFIG.sektor;

  async function countByDimension({ dateFrom, dateTo }) {
    const where = [];
    const params = [];
    if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
    if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = await db.prepare(`
      SELECT ${cfg.groupExpr} AS label, COUNT(*) AS c
      FROM fenomena f
      ${cfg.join}
      ${whereSql}
      GROUP BY label
    `).all(...params);
    const map = {};
    rows.forEach((r) => { map[r.label] = r.c; });
    return map;
  }

  const maps = await Promise.all(periods.map((p) => countByDimension(p)));
  const allLabels = new Set();
  maps.forEach((m) => Object.keys(m).forEach((k) => allLabels.add(k)));

  const items = [...allLabels]
    .filter((label) => !GENERIC_LABELS.includes(label))
    .map((label) => {
      const values = maps.map((m) => m[label] || 0);
      const first = values[0] || 0;
      const last = values[values.length - 1] || 0;
      const deltaPct = first === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - first) / first) * 100);
      return { label, values, deltaPct };
    })
    .sort((a, b) => (b.values[b.values.length - 1] || 0) - (a.values[a.values.length - 1] || 0));

  return {
    dimensionLabel: cfg.label,
    periodLabels: periods.map((p) => p.label),
    items,
  };
}

// Khusus dimensi Sentimen: bukan 1 angka per periode, tapi TREN di dalam
// tiap periode (mingguan/bulanan/triwulanan) -- biar bisa lihat "bentuk"
// pergerakan sentimen, bukan cuma titik awal-akhir. Sumbu-X pakai INDEKS
// RELATIF (Minggu ke-1, ke-2, dst dari awal periode masing-masing), bukan
// tanggal kalender asli -- supaya periode dengan panjang beda (Juli 31 hari
// vs Februari 28 hari) tetap bisa disejajarkan buat dibandingkan bentuknya.
async function getSentimenPerPeriodeDalamRentang(periods, granularity) {
  async function getRawRows({ dateFrom, dateTo }) {
    return await db.prepare(`
      SELECT tanggal, sentimen FROM fenomena
      WHERE tanggal >= ? AND tanggal <= ? AND sentimen IS NOT NULL
    `).all(dateFrom, dateTo);
  }

  function bucketIndex(tanggal, dateFromStr) {
    const d = new Date(tanggal);
    const start = new Date(dateFromStr);
    if (granularity === "minggu") {
      const diffDays = Math.floor((d - start) / 86400000);
      return Math.floor(diffDays / 7) + 1;
    }
    const monthsDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
    if (granularity === "triwulan") return Math.floor(monthsDiff / 3) + 1;
    return monthsDiff + 1; // bulan
  }

  const perPeriod = await Promise.all(periods.map(async (p) => {
    const rows = await getRawRows(p);
    const buckets = {};
    rows.forEach((r) => {
      const idx = bucketIndex(r.tanggal, p.dateFrom);
      if (!buckets[idx]) buckets[idx] = { Positif: 0, Netral: 0, Negatif: 0 };
      if (buckets[idx][r.sentimen] !== undefined) buckets[idx][r.sentimen]++;
    });
    return buckets;
  }));

  const maxIndex = Math.max(1, ...perPeriod.map((b) => Math.max(0, ...Object.keys(b).map(Number))));
  const SUB_LABEL = { minggu: "Minggu", bulan: "Bulan", triwulan: "Triwulan" };
  const subLabel = SUB_LABEL[granularity] || "Minggu";

  const series = [];
  for (let idx = 1; idx <= maxIndex; idx++) {
    const row = { sub: `${subLabel} ${idx}` };
    perPeriod.forEach((buckets, i) => {
      const b = buckets[idx];
      if (!b) { row[`p${i}`] = null; return; } // periode ini gak nyampe sejauh ini -> putus garisnya, jangan dikarang
      const total = b.Positif + b.Netral + b.Negatif;
      row[`p${i}`] = total > 0 ? Math.round((b.Positif / total) * 100) : null;
    });
    series.push(row);
  }

  return { granularity, subLabel, periodLabels: periods.map((p) => p.label), series };
}

// Ambil SAMPEL judul+uraian berita asli per periode (bukan angka statistik)
// -- dipakai buat paragraf ke-2 ringkasan AI yang ngerangkum TEMA/ISI
// pemberitaan, bukan sekadar volume per kategori.
async function getSampelBeritaPerPeriode(periods, limit = 6) {
  async function sample({ dateFrom, dateTo }) {
    const where = [];
    const params = [];
    if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
    if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return await db.prepare(`
      SELECT judul, uraian FROM fenomena ${whereSql} ORDER BY RANDOM() LIMIT ?
    `).all(...params, limit);
  }

  const results = await Promise.all(periods.map((p) => sample(p)));
  return periods.map((p, i) => ({ label: p.label, articles: results[i] }));
}

module.exports = {
  getTotals, getSentimenSummary, getFenomenaPerBulan, getTrenSentimen,
  getTopSektor, getSumberSummary, getSebaranDistrik, getKondisiEkonomi, getFenomenaPerPeriode, 
  getKondisiTerverifikasi, getKeywordCloud, getPerbandinganDimensi, getSentimenPerPeriodeDalamRentang, getSampelBeritaPerPeriode
};