import { NextResponse } from "next/server";
import { getSampelBeritaPerPeriode } from "../../../../../lib/statsRepo";

export async function POST(request) {
  const body = await request.json();
  const { periods } = body;
  if (!Array.isArray(periods) || periods.length < 1) {
    return NextResponse.json({ error: "Minimal 1 periode diperlukan." }, { status: 400 });
  }
  const result = await getSampelBeritaPerPeriode(periods);
  return NextResponse.json({ periods: result });
}