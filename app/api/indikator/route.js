import { NextResponse } from "next/server";
import { getIndikatorList, getSektorList, getDistrikList } from "../../../lib/fenomenaRepo";

export async function GET() {
  return NextResponse.json({
    indikator: getIndikatorList(),
    sektor: getSektorList(),
    distrik: getDistrikList(),
  });
}
