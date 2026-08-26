import { NextResponse } from "next/server";
import { getById, updateFenomena, deleteFenomena } from "../../../../lib/fenomenaRepo";
import { isValidNeracaPin } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

export async function GET(_request, { params }) {
  const item = getById(params.id);
  if (!item) return NextResponse.json({ error: "Fenomena tidak ditemukan" }, { status: 404 });
  return NextResponse.json(item);
}

// Dipakai untuk: validasi cepat (ubah status) dan edit detail
export async function PATCH(request, { params }) {
  const pin = request.headers.get("x-neraca-pin");
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ error: "Akses ditolak, PIN Tim Neraca tidak valid." }, { status: 403 });
  }
  const body = await request.json();
  const current = getById(params.id);
  // Validasi sektor PDRB.
  // null diperbolehkan untuk "Tidak terklasifikasi".
  if (
    body.sektor_id !== undefined &&
    body.sektor_id !== null
  ) {
    const sektor = db
      .prepare("SELECT id FROM sektor WHERE id = ?")
      .get(body.sektor_id);

    if (!sektor) {
      return NextResponse.json(
        { error: "Sektor PDRB tidak ditemukan." },
        { status: 400 }
      );
    }
  }
  // if (!current) return NextResponse.json({ error: "Fenomena tidak ditemukan" }, { status: 404 }); 

  // Aturan bisnis #6: hanya status Terverifikasi/Digunakan yang valid sbg transisi
  if (body.status && !["Draft", "Terverifikasi"].includes(body.status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const updated = updateFenomena(params.id, body);

  return NextResponse.json(getById(params.id) || updated);
}

export async function DELETE(request, { params }) {
  const pin = request.headers.get("x-neraca-pin");
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ error: "Akses ditolak, PIN Tim Neraca tidak valid." }, { status: 403 });
  }

  try {
    const result = deleteFenomena(params.id);
    if (!result.ok && result.reason === "locked") {
      return NextResponse.json(
        { error: "Fenomena berstatus Digunakan tidak dapat dihapus (menjaga riwayat publikasi)." },
        { status: 409 }
      );
    }
    if (!result.ok) return NextResponse.json({ error: "Fenomena tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gagal hapus fenomena:", err);
    return NextResponse.json({ error: `Gagal menghapus data: ${err.message}` }, { status: 500 });
  }
}
