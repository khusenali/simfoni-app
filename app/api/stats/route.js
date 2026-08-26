import { NextResponse } from "next/server";
import {
  getTotals, getSentimenSummary, getTopSektor, getSumberSummary,
  getSebaranDistrik, getKondisiEkonomi, getKondisiTerverifikasi,
  getKeywordCloud,
} from "../../../lib/statsRepo";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const prevDateFrom = searchParams.get("prevDateFrom") || undefined;
  const prevDateTo = searchParams.get("prevDateTo") || undefined;
  const range = { dateFrom, dateTo };

  return NextResponse.json({
    totals: getTotals(range),
    kondisiEkonomi: getKondisiEkonomi({ ...range, prevDateFrom, prevDateTo }),
    kondisiTerverifikasi: getKondisiTerverifikasi(range),
    sentimenSummary: getSentimenSummary(range),
    topSektor: getTopSektor(20, range),
    sumberSummary: getSumberSummary(range),
    sebaranDistrik: getSebaranDistrik(range),
    keywordCloud: getKeywordCloud({ ...range, limit: 40 }),
  });
}