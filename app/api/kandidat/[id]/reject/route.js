import { NextResponse } from "next/server";
import { rejectKandidat } from "../../../../../lib/kandidatRepo";
import { isValidNeracaPin } from "../../../../../lib/auth";

export async function POST(request, { params }) {
  const pin = request.headers.get("x-neraca-pin");
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ error: "Akses ditolak, PIN Tim Neraca tidak valid." }, { status: 403 });
  }
  const result = await rejectKandidat(params.id);
  return NextResponse.json(result);
}