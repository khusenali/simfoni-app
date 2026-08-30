import { NextResponse } from "next/server";
import { isTahunFenomenaValid } from "../../../lib/dateRules";
import { listFenomena, insertFenomenaWithSimilarity } from "../../../lib/fenomenaRepo";
import { extractKeywords, analyzeSentiment, detectSektor } from "../../../lib/textmining";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  const result = await listFenomena({
    search: searchParams.get("search") || undefined,
    sektor: searchParams.get("sektor") || undefined,
    sumberTipe: searchParams.get("sumberTipe") || undefined,
    distrik: searchParams.get("distrik") || undefined,
    status: searchParams.get("status") || undefined,
    sentimen: searchParams.get("sentimen") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortDir: searchParams.get("sortDir") || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return NextResponse.json({ ...result, page, pageSize });
}

// Menambah data hasil pendataan lapangan (Input Hasil Pendataan)
export async function POST(request) {
  const body = await request.json();

  const required = ["judul", "tanggal", "uraian", "sektor", "distrik", "penulis"];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) {
    return NextResponse.json(
      { error: `Field wajib belum diisi: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  if (!isTahunFenomenaValid(body.tanggal)) {
    const tahunSekarang = new Date().getFullYear();
    return NextResponse.json(
      { error: `Tanggal kejadian harus antara tahun ${tahunSekarang - 1}-${tahunSekarang}.` },
      { status: 400 }
    );
  }

  const text = `${body.judul} ${body.uraian}`;
  const id = await insertFenomenaWithSimilarity({
    tanggal: body.tanggal,
    judul: body.judul,
    uraian: body.uraian,
    penyebab: body.penyebab || null,
    dampak: body.dampak || null,
    sumber_tipe: "input_manual",
    nama_sumber: body.namaSumber || "Input Manual",
    lokasi: body.distrik,
    distrik_nama: body.distrik,
    sektor_nama: body.sektor || detectSektor(text),
    keyword: extractKeywords(text),
    sentimen: body.sentimen || analyzeSentiment(text),
    status: "Draft", // Aturan bisnis #5: status awal selalu Draft
    penulis: body.penulis || null,
    media: "Input Manual",
  });

  return NextResponse.json({ id }, { status: 201 });
}