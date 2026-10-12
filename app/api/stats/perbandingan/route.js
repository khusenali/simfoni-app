import { NextResponse } from "next/server";
import { getPerbandinganDimensi, getSentimenPerPeriodeDalamRentang } from "../../../../lib/statsRepo";

export async function POST(request) {
  const body = await request.json();
  const { dimension, periods, granularity } = body;
  if (!Array.isArray(periods) || periods.length < 2) {
    return NextResponse.json({ error: "Minimal 2 periode diperlukan." }, { status: 400 });
  }

  if (dimension === "sentimen") {
    const result = await getSentimenPerPeriodeDalamRentang(periods, granularity || "minggu");
    return NextResponse.json(result);
  }

  const result = await getPerbandinganDimensi(dimension, periods);
  return NextResponse.json(result);
}