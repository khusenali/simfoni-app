import { NextResponse } from "next/server";
import { getIndikatorList, getSektorList, getDistrikList } from "../../../lib/fenomenaRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    indikator: await getIndikatorList(),
    sektor: await getSektorList(),
    distrik: await getDistrikList(),
  });
}