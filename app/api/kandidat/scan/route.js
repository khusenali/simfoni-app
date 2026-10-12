import { NextResponse } from "next/server";
import { scanKandidatBerita } from "../../../../lib/kandidatScraper";
import { isValidNeracaPin } from "../../../../lib/auth";

export async function POST(request) {
  const pin = request.headers.get("x-neraca-pin");
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ error: "Akses ditolak, PIN Tim Neraca tidak valid." }, { status: 403 });
  }
  try {
    const result = await scanKandidatBerita();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}