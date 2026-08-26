import { TEMPLATE_COLUMNS } from "../../../../../lib/importTemplate";
import ExcelJS from "exceljs";
import { getSektorList, getDistrikList } from "../../../../../lib/fenomenaRepo";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Template Pendataan");

  sheet.columns = TEMPLATE_COLUMNS;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2A3D" } };

  // Baris contoh -- tanggal pakai objek Date asli (bukan teks) supaya Excel
  // mengenalinya sebagai kolom tanggal sungguhan, format tampil tanpa jam.
  sheet.addRow({
    judul: "Contoh: Harga ikan naik di pasar Waisai",
    tanggal: new Date(Date.UTC(2026, 6, 11)),
    uraian: "Harga ikan naik akibat cuaca buruk yang membuat nelayan tidak melaut.",
    sektor: "Pertanian, Kehutanan, dan Perikanan",
    distrik: "KOTA WAISAI",
    penyebab: "Cuaca buruk",
    dampak: "Harga jual ikan naik di pasar",
    penulis: "Tim Distribusi",
  });
  sheet.getRow(2).font = { italic: true, color: { argb: "FF5B6B76" } };
  sheet.getColumn("tanggal").numFmt = "yyyy-mm-dd";

  // Dropdown Sektor & Distrik -- diambil langsung dari data yang ada sekarang
  // (sama seperti daftar di /api/indikator), supaya isian Excel selalu
  // konsisten dengan sektor/distrik yang sudah ada di sistem.
  const sektorNames = getSektorList().map((s) => s.nama);
  const distrikNames = getDistrikList().map((d) => d.nama);

  const listSheet = workbook.addWorksheet("Daftar Pilihan");
  listSheet.state = "veryHidden"; // disembunyikan dari user, cuma jadi sumber dropdown
  sektorNames.forEach((s, i) => { listSheet.getCell(`A${i + 1}`).value = s; });
  distrikNames.forEach((d, i) => { listSheet.getCell(`B${i + 1}`).value = d; });

  for (let r = 2; r <= 500; r++) {
    sheet.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`'Daftar Pilihan'!$A$1:$A$${sektorNames.length}`],
      showErrorMessage: true,
      errorTitle: "Sektor tidak dikenal",
      error: "Pilih salah satu sektor dari daftar dropdown.",
    };
    sheet.getCell(`E${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`'Daftar Pilihan'!$B$1:$B$${distrikNames.length}`],
      showErrorMessage: true,
      errorTitle: "Distrik tidak dikenal",
      error: "Pilih salah satu distrik dari daftar dropdown.",
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="simfoni-template-pendataan.xlsx"`,
    },
  });
}