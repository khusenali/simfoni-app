import { NextResponse } from "next/server";
import { getSampelBeritaPerPeriode } from "../../../../lib/statsRepo";
import { buatRingkasanTema } from "../../../../lib/geminiSummary";

export async function POST(request) {
  try {
    const body = await request.json();
    const { periodLabel, dateFrom, dateTo } = body;
    const [sample] = await getSampelBeritaPerPeriode([{ label: periodLabel, dateFrom, dateTo }]);
    const ringkasan = await buatRingkasanTema({ periodLabel, articles: sample.articles });
    return NextResponse.json({ ringkasan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}