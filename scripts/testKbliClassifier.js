// scripts/testKbliClassifier.js

const { classifyEconomicSector } = require('../lib/kbliClassifier');

const TEST_CASES = [
  {
    nama: 'Wisatawan Raja Ampat',
    text: `
      Jumlah wisatawan yang berkunjung ke Raja Ampat meningkat.
      Kunjungan wisatawan memberikan dampak terhadap hotel,
      penginapan, restoran dan pelaku usaha pariwisata.
    `
  },

  {
    nama: 'Nelayan',
    text: `
      Hasil tangkapan ikan nelayan di Raja Ampat meningkat
      setelah kondisi cuaca membaik.
    `
  },

  {
    nama: 'Pertambangan',
    text: `
      Aktivitas pertambangan dan produksi mineral mengalami
      peningkatan pada tahun ini.
    `
  },

  {
    nama: 'Pembangunan jalan',
    text: `
      Pemerintah melaksanakan pembangunan jalan dan jembatan
      untuk meningkatkan konektivitas antarwilayah.
    `
  },

  {
    nama: 'Perdagangan',
    text: `
      Aktivitas perdagangan dan penjualan kebutuhan masyarakat
      mengalami peningkatan menjelang hari raya.
    `
  },

  {
    nama: 'Transportasi',
    text: `
      Jumlah penumpang kapal mengalami peningkatan dan
      aktivitas angkutan barang semakin ramai.
    `
  },

  {
    nama: 'Pendidikan',
    text: `
      Pemerintah meningkatkan kualitas pendidikan melalui
      pembangunan sekolah dan peningkatan jumlah tenaga pengajar.
    `
  },

  {
    nama: 'Kesehatan',
    text: `
      Rumah sakit meningkatkan pelayanan kesehatan kepada
      masyarakat di Kabupaten Raja Ampat.
    `
  }
];


console.log('\n========================================');
console.log('TEST KLASIFIKASI KBLI → SEKTOR PDRB');
console.log('========================================\n');


for (const test of TEST_CASES) {

  console.log('----------------------------------------');
  console.log(`TEST: ${test.nama}`);
  console.log('----------------------------------------');

  const result = classifyEconomicSector(test.text);

  console.log('\nSEKTOR PDRB:');
  console.log(result.sektor);

  console.log('\nSEKTOR ID:');
  console.log(result.sektorId);

  console.log('\nSCORE:');
  console.log(result.score);

  console.log('\nCONFIDENCE:');
  console.log(`${result.confidence}%`);

  console.log('\nMETHOD:');
  console.log(result.method);

  console.log('\nKBLI:');

  if (!result.kbli || result.kbli.length === 0) {
    console.log('Tidak ditemukan');
  } else {
    console.table(
      result.kbli.map(item => ({
        rank: item.rank,
        kode: item.kode,
        nama: item.nama,
        score: item.score,
        sektor: item.sektor
      }))
    );
  }

  console.log('\nMATCHED KEYWORDS:');

  if (!result.matchedKeywords || result.matchedKeywords.length === 0) {
    console.log('Tidak ada keyword');
  } else {
    console.table(
      result.matchedKeywords.map(item => ({
        keyword: item.keyword,
        tipe: item.tipe,
        bobot: item.bobot,
        kodeKbli: item.kodeKbli,
        sektor: item.sektor
      }))
    );
  }

  console.log('\nCANDIDATE SECTOR:');

  if (result.candidates?.length) {
    console.table(result.candidates);
  } else {
    console.log('Tidak ada kandidat');
  }

  console.log('\n');
}