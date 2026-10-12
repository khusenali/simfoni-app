import { NextResponse } from "next/server";
import { buatRingkasanPerbandingan } from "../../../../../lib/geminiSummary";

export async function POST(request) {
  try {
    const body = await request.json();
    const ringkasan = await buatRingkasanPerbandingan(body);
    return NextResponse.json({ ringkasan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}