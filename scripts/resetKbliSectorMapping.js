const { db } = require("../lib/db");

const mapping = {
  A: "Pertanian, Kehutanan, dan Perikanan",
  B: "Pertambangan dan Penggalian",
  C: "Industri Pengolahan",
  D: "Pengadaan Listrik dan Gas",
  E: "Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang",
  F: "Konstruksi",
  G: "Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor",
  H: "Transportasi dan Pergudangan",
  I: "Penyediaan Akomodasi dan Makan Minum",
  J: "Informasi dan Komunikasi",
  K: "Informasi dan Komunikasi",
  L: "Jasa Keuangan dan Asuransi",
  M: "Real Estat",
  N: "Jasa Perusahaan",
  O: "Jasa Perusahaan",
  P: "Adminstrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib",
  Q: "Jasa Pendidikan",
  R: "Jasa Kesehatan dan Kegiatan Sosial",
  S: "Jasa Lainnya",
  T: "Jasa Lainnya",
  U: "Jasa Lainnya",
  V: "Jasa Lainnya"
};

const update = db.prepare(`
  UPDATE kbli_sektor
  SET sektor_id = ?
  WHERE kbli_id = ?
`);

const getKbli = db.prepare(`
  SELECT id, kode
  FROM kbli_2025
  WHERE kode = ?
`);

const getSektor = db.prepare(`
  SELECT id, nama
  FROM sektor
  WHERE nama = ?
`);

const transaction = db.transaction(() => {

  for (const [kode, sektorNama] of Object.entries(mapping)) {

    const kbli = getKbli.get(kode);

    if (!kbli) {
      throw new Error(
        `KBLI kategori ${kode} tidak ditemukan`
      );
    }

    const sektor = getSektor.get(sektorNama);

    if (!sektor) {
      throw new Error(
        `Sektor PDRB "${sektorNama}" tidak ditemukan`
      );
    }

    update.run(
      sektor.id,
      kbli.id
    );

    console.log(
      `${kode} → ${sektor.nama}`
    );
  }
});

transaction();

console.log("\nMapping KBLI 2025 → sektor PDRB berhasil diperbarui.");