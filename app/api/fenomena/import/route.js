import { NextResponse } from "next/server";
import { isTahunFenomenaValid } from "../../../../lib/dateRules";
import ExcelJS from "exceljs";
import { insertFenomena } from "../../../../lib/fenomenaRepo";
import { extractKeywords, detectSektor } from "../../../../lib/textmining";
import { resolveSentimentBatch } from "../../../../lib/sentimentService";
import { TEMPLATE_COLUMNS, isContohRow } from "../../../../lib/importTemplate";

export const runtime = "nodejs"; // wajib -- ONNX runtime (transformers.js) butuh Node.js, gak jalan di Edge runtime
export const maxDuration = 60; // import bisa banyak baris; sesuaikan ke limit plan Vercel kamu (Hobby/Pro/Enterprise beda batas)

function excelValueToString(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value.text) return value.text; // rich text
  return String(value).trim();
}

function normalizeHeader(v) {
  return String(v || "").trim().toLowerCase();
}

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Format unggahan tidak valid." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "File Excel tidak ditemukan." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (err) {
    return NextResponse.json({ error: "Gagal membaca file Excel: " + err.message }, { status: 400 });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "File Excel tidak memiliki sheet data." }, { status: 400 });
  }

  // --- Validasi ketat: isi & urutan header wajib sama persis dengan template ---
  const headerRow = sheet.getRow(1);
  const expected = TEMPLATE_COLUMNS.map((c) => c.header);
  const actual = expected.map((_, i) => headerRow.getCell(i + 1).value ?? "");
  const extraCol = headerRow.getCell(expected.length + 1).value;

  const headerValid = expected.every((h, i) => normalizeHeader(actual[i]) === normalizeHeader(h));

  if (!headerValid || extraCol) {
    return NextResponse.json(
      {
        error: "Format kolom pada file tidak sesuai template. Isi maupun urutan judul kolom harus sama persis dengan template resmi.",
        code: "HEADER_MISMATCH",
        expected,
        actual: actual.map((v) => String(v || "").trim()),
      },
      { status: 400 }
    );
  }

  let inserted = 0;
  let skipped = 0;
  let contohDiabaikan = 0;
  let diluarRentangTahun = 0;

  // Pass 1: validasi tiap baris & kumpulkan teks yang valid dulu -- supaya
  // sentimen semua baris bisa diklasifikasi SEKALI lewat satu panggilan
  // batch ke IndoBERT (lebih efisien daripada satu request per baris),
  // sebelum masuk ke pass 2 yang insert satu-satu berurutan ke DB.
  const validRows = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const record = {};
    TEMPLATE_COLUMNS.forEach((col, i) => {
      record[col.key] = excelValueToString(row.getCell(i + 1).value);
    });

    // Baris contoh bawaan template -- lewati selama belum dihapus/ditimpa tim.
    if (isContohRow(record)) {
      contohDiabaikan++;
      continue;
    }

    if (!record.judul || !record.tanggal || !record.uraian || !record.sektor || !record.distrik) {
      skipped++;
      continue;
    }

    if (!isTahunFenomenaValid(record.tanggal)) {
      diluarRentangTahun++;
      continue;
    }

    validRows.push({ record, text: `${record.judul} ${record.uraian}` });
  }

  const sentiments = await resolveSentimentBatch(validRows.map((v) => v.text));

  // Pass 2: baris file Excel harus diproses satu-satu berurutan (for...of + await),
  // BUKAN dipacu paralel -- tiap insertFenomena juga bisa bikin sektor/distrik
  // baru, kalau ditembak bersamaan berisiko dobel sektor dengan nama sama.
  for (let i = 0; i < validRows.length; i++) {
    const { record, text } = validRows[i];
    await insertFenomena({
      tanggal: record.tanggal,
      judul: record.judul,
      uraian: record.uraian,
      penyebab: record.penyebab || null,
      dampak: record.dampak || null,
      sumber_tipe: "input_manual",
      nama_sumber: "Import Excel",
      lokasi: record.distrik,
      distrik_nama: record.distrik,
      sektor_nama: record.sektor || detectSektor(text),
      keyword: extractKeywords(text),
      sentimen: sentiments[i],
      status: "Draft",
      penulis: record.penulis || null,
      media: "Import Excel",
    });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped, contohDiabaikan, diluarRentangTahun });
}