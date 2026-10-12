import { NextResponse } from "next/server";
import { approveKandidat } from "../../../../../lib/kandidatRepo";
import { isValidNeracaPin } from "../../../../../lib/auth";

export async function POST(request, { params }) {
  const pin = request.headers.get("x-neraca-pin");
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ error: "Akses ditolak, PIN Tim Neraca tidak valid." }, { status: 403 });
  }
  const result = await approveKandidat(params.id);
  if (!result.ok) {
    const message =
      result.reason === "duplicate" ? "Artikel ini ternyata sudah ada di daftar fenomena."
      : result.reason === "already_reviewed" ? "Kandidat ini sudah pernah ditinjau."
      : "Kandidat tidak ditemukan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json(result);
}