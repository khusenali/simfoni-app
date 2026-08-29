import PDFDocument from "pdfkit";
import { listFenomena } from "../../../../lib/fenomenaRepo";
import { formatDateTime } from "../../../../lib/format";
import { buildExportFilename } from "../../../../lib/exportFilename";
const { SEMANTIC, PALETTE } = require("../../../../lib/theme");

const INK = SEMANTIC.ink;
const TEAL = SEMANTIC.teal;
const GOLD = SEMANTIC.gold;
const CORAL = SEMANTIC.negative;
const NEUTRAL = SEMANTIC.neutral;
const PLUM = SEMANTIC.tealDark;
const SOFT = "#5B6B76";
const LINE = SEMANTIC.line;
const BG = SEMANTIC.bg;
const SUMBER_COLORS = PALETTE;

const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;
const MAX_PRINTED = 500; // batas jumlah baris yang benar-benar dicetak satu-per-satu di Section 2

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensureSpace(doc, y, needed) {
  if (y + needed > 780) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function sectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 30);
  doc.fontSize(12).fillColor(INK).font("Helvetica-Bold").text(text, PAGE_MARGIN, y);
  return y + 20;
}

// Menghitung SEMUA angka ringkasan langsung dari data yang sudah difilter
// (bukan query terpisah) -- supaya kartu & grafik di Section 1 dijamin selalu
// cocok dengan daftar berita di Section 2, apa pun filter yang dipilih.
function summarizeFromData(allData) {
  const totals = { total: allData.length, Draft: 0, Terverifikasi: 0 };
  const sentimenCount = { Positif: 0, Netral: 0, Negatif: 0 };
  const sektorCount = {};
  const sumberCount = {};

  for (const item of allData) {
    if (item.status === "Draft") totals.Draft++;
    else if (item.status === "Terverifikasi") totals.Terverifikasi++;

    if (item.sentimen && sentimenCount[item.sentimen] !== undefined) sentimenCount[item.sentimen]++;
    if (item.sektor) sektorCount[item.sektor] = (sektorCount[item.sektor] || 0) + 1;
    const sumberNama = item.namaSumber || "Tidak diketahui";
    sumberCount[sumberNama] = (sumberCount[sumberNama] || 0) + 1;
  }

  const topSektor = Object.entries(sektorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nama, jumlah]) => ({ nama, jumlah }));

  const sumberEntries = Object.entries(sumberCount).sort((a, b) => b[1] - a[1]);
  const sumberList = sumberEntries.slice(0, 7).map(([nama, jumlah]) => ({ nama, jumlah }));
  const sisaSumber = sumberEntries.slice(7).reduce((sum, [, v]) => sum + v, 0);
  if (sisaSumber > 0) sumberList.push({ nama: "Lainnya", jumlah: sisaSumber });

  const positifPct = totals.total > 0 ? Math.round((sentimenCount.Positif / totals.total) * 100) : 0;
  const label = positifPct >= 50 ? "Membaik" : positifPct >= 35 ? "Stabil" : "Melemah";

  return {
    totals,
    sentimenSummary: { positif: sentimenCount.Positif, netral: sentimenCount.Netral, negatif: sentimenCount.Negatif },
    kondisi: { label, positifPct },
    topSektor,
    sumberSummary: { sumber: sumberList },
  };
}

function drawSummaryCards(doc, { totals, kondisi }, y) {
  y = ensureSpace(doc, y, 90);
  const gap = 12;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const cardHeight = 78;

  const cards = [
    { label: "Total Fenomena", value: String(totals.total), color: INK, sub: `${totals.Draft} Tercatat · ${totals.Terverifikasi} Terverifikasi` },
    { label: "Kondisi Ekonomi", value: kondisi.label || "-", color: TEAL, sub: `${kondisi.positifPct}% sentimen positif` },
  ];

  cards.forEach((c, i) => {
    const x = PAGE_MARGIN + i * (cardWidth + gap);
    doc.roundedRect(x, y, cardWidth, cardHeight, 8).fill(c.color);
    doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica").text(c.label, x + 14, y + 14, { width: cardWidth - 28 });
    doc.fontSize(20).fillColor("#FFFFFF").font("Helvetica-Bold").text(c.value, x + 14, y + 30, { width: cardWidth - 28 });
    doc.fontSize(7.5).fillColor("#FFFFFF").font("Helvetica").opacity(0.85).text(c.sub, x + 14, y + 58, { width: cardWidth - 28 });
    doc.opacity(1);
  });

  return y + cardHeight + 24;
}

function drawProportionBar(doc, title, segments, y) {
  y = ensureSpace(doc, y, 70);
  doc.fontSize(10).fillColor(INK).font("Helvetica-Bold").text(title, PAGE_MARGIN, y);
  y += 18;

  const barHeight = 16;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let x = PAGE_MARGIN;

  segments.forEach((s) => {
    const w = (s.value / total) * CONTENT_WIDTH;
    if (w > 0) doc.rect(x, y, w, barHeight).fill(s.color);
    x += w;
  });
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, barHeight, 3).stroke(LINE);
  y += barHeight + 10;

  let lx = PAGE_MARGIN;
  segments.forEach((s) => {
    const pct = Math.round((s.value / total) * 100);
    doc.circle(lx + 4, y + 4, 4).fill(s.color);
    doc.fontSize(8.5).fillColor(SOFT).font("Helvetica").text(`${s.label} ${pct}% (${s.value})`, lx + 14, y);
    lx += doc.widthOfString(`${s.label} ${pct}% (${s.value})`) + 34;
  });

  return y + 26;
}

function drawSektorBars(doc, topSektor, y) {
  if (!topSektor.length) return y;
  y = ensureSpace(doc, y, 30 + topSektor.length * 26);
  doc.fontSize(10).fillColor(INK).font("Helvetica-Bold").text("Sektor Ekonomi Teratas", PAGE_MARGIN, y);
  y += 20;

  const maxVal = Math.max(...topSektor.map((s) => s.jumlah), 1);
  const labelWidth = 190;
  const barAreaWidth = CONTENT_WIDTH - labelWidth - 40;
  const colors = [TEAL, INK, GOLD, PLUM, CORAL];

  topSektor.forEach((s, i) => {
    y = ensureSpace(doc, y, 26);
    doc.fontSize(8).fillColor(INK).font("Helvetica").text(s.nama, PAGE_MARGIN, y + 3, { width: labelWidth, ellipsis: true });
    const barW = (s.jumlah / maxVal) * barAreaWidth;
    doc.roundedRect(PAGE_MARGIN + labelWidth, y, Math.max(barW, 2), 14, 3).fill(colors[i % colors.length]);
    doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold").text(String(s.jumlah), PAGE_MARGIN + labelWidth + barAreaWidth + 8, y + 3);
    y += 24;
  });

  return y + 10;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    search: searchParams.get("search") || undefined,
    sektor: searchParams.get("sektor") || undefined,
    status: searchParams.get("status") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  };

  // Ambil SEMUA baris yang cocok filter (dipakai untuk hitung ringkasan yang
  // akurat), lalu baru batasi berapa yang benar-benar dicetak satu-per-satu
  // di Section 2 supaya laporan tidak jadi ribuan halaman.
  const { data: allData } = listFenomena({ ...filters, limit: 5000, offset: 0 });
  const printedData = allData.slice(0, MAX_PRINTED);

  const { totals, sentimenSummary, kondisi, topSektor, sumberSummary } = summarizeFromData(allData);

  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", bufferPages: true });
  const bufferPromise = streamToBuffer(doc);

  // ===== SECTION 1: Ringkasan Dashboard =====
  doc.rect(0, 0, 595.28, 6).fill(TEAL);
  doc.fontSize(20).fillColor(INK).font("Helvetica-Bold").text("SIMFONI", PAGE_MARGIN, 30);
  doc.fontSize(10).fillColor(SOFT).font("Helvetica").text("Laporan Fenomena Ekonomi — BPS Kabupaten Raja Ampat", PAGE_MARGIN, 54);
  doc.fontSize(8).fillColor(SOFT).text(`Dicetak: ${formatDateTime(new Date().toISOString())}`, PAGE_MARGIN, 70);
  let y = 100;

  doc.fontSize(13).fillColor(INK).font("Helvetica-Bold").text("Ringkasan Dashboard", PAGE_MARGIN, y);
  y += 22;
  y = drawSummaryCards(doc, { totals, kondisi }, y);

  y = sectionTitle(doc, "Ringkasan Visual", y - 6);
  y = drawProportionBar(doc, "Distribusi Sentimen", [
    { label: "Positif", value: sentimenSummary.positif, color: TEAL },
    { label: "Netral", value: sentimenSummary.netral, color: NEUTRAL },
    { label: "Negatif", value: sentimenSummary.negatif, color: CORAL },
  ], y);

  y = drawProportionBar(doc, "Sumber Data",
    sumberSummary.sumber.map((s, i) => ({ label: s.nama, value: s.jumlah, color: SUMBER_COLORS[i % SUMBER_COLORS.length] })),
  y);

  y = drawSektorBars(doc, topSektor, y);

  // ===== SECTION 2: Daftar Berita =====
  // Selalu mulai di halaman baru -- KECUALI kita kebetulan sudah berada tepat
  // di awal halaman kosong (karena ensureSpace() di atas otomatis pindah
  // halaman duluan), supaya tidak dobel jadi halaman kosong tambahan.
  if (y > PAGE_MARGIN + 20) {
    doc.addPage();
  }
  doc.rect(0, 0, 595.28, 6).fill(TEAL);
  doc.fontSize(14).fillColor(INK).font("Helvetica-Bold").text("Daftar Fenomena / Berita", PAGE_MARGIN, 26);
  doc.fontSize(9).fillColor(SOFT).font("Helvetica")
    .text(`${totals.total} data sesuai filter yang dipilih${totals.total > MAX_PRINTED ? ` (ditampilkan ${MAX_PRINTED} teratas)` : ""}`, PAGE_MARGIN, 46);
  y = 74;

  printedData.forEach((item, idx) => {
    y = ensureSpace(doc, y, 70);

    if (idx % 2 === 0) {
      doc.rect(PAGE_MARGIN - 6, y - 4, CONTENT_WIDTH + 12, 62).fill(BG);
    }

    doc.fontSize(9.5).fillColor(INK).font("Helvetica-Bold").text(`${idx + 1}. ${item.judul}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
    y += 14;

    doc.fontSize(7.5).fillColor(SOFT).font("Helvetica")
      .text(`${formatDateTime(item.tanggal)} · ${item.sektor || "-"} · ${item.distrik || "-"} · ${item.namaSumber || "-"}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
    y += 12;

    const sentimenColor = item.sentimen === "Positif" ? TEAL : item.sentimen === "Negatif" ? CORAL : NEUTRAL;
    doc.fontSize(7.5).fillColor(sentimenColor).font("Helvetica-Bold").text(item.sentimen || "-", PAGE_MARGIN, y, { continued: true });
    doc.fillColor(SOFT).font("Helvetica").text(`   ·   Status: ${item.status === "Draft" ? "Tercatat" : item.status}`, { continued: false });
    y += 12;

    if (item.uraian) {
      doc.fontSize(8.5).fillColor(INK).font("Helvetica").text(item.uraian.slice(0, 220), PAGE_MARGIN, y, { width: CONTENT_WIDTH });
      y += doc.heightOfString(item.uraian.slice(0, 220), { width: CONTENT_WIDTH }) + 6;
    }
    y += 6;
  });

  if (!printedData.length) {
    doc.fontSize(9).fillColor(SOFT).font("Helvetica").text("Tidak ada fenomena yang cocok dengan filter ini.", PAGE_MARGIN, y);
  }

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(7.5).fillColor(SOFT).font("Helvetica")
      .text(`Halaman ${i + 1} dari ${pageCount}`, PAGE_MARGIN, 810, { width: CONTENT_WIDTH, align: "right" });
  }

  doc.end();
  const buffer = await bufferPromise;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildExportFilename(searchParams, "pdf")}"`,
    },
  });
}