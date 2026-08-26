import { NextResponse } from "next/server";
import { isValidNeracaPin } from "../../../../lib/auth";

export async function POST(request) {
  const { pin } = await request.json();
  if (!isValidNeracaPin(pin)) {
    return NextResponse.json({ ok: false, error: "PIN salah." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}