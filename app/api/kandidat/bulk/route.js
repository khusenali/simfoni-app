import { NextResponse } from "next/server";
import { approveKandidatBulk, rejectKandidatBulk } from "../../../../lib/kandidatRepo";
import { isValidNeracaPin } from "../../../../lib/auth";

export async function POST(request) {
  const pin = request.headers.get("x-neraca-pin");
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ error: "Akses ditolak, PIN Tim Neraca tidak valid." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isFinite(Number(id))) : [];
  const action = body.action;

  if (!ids.length) {
    return NextResponse.json({ error: "Tidak ada kandidat yang dipilih." }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  }

  const result =
    action === "approve" ? await approveKandidatBulk(ids) : await rejectKandidatBulk(ids);

  return NextResponse.json(result);
}