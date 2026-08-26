// scripts/check-keyword-coverage.js
const { db } = require("../lib/db");

const all = db.prepare(`
  SELECT DISTINCT k.kode FROM kbli_2025 k WHERE k.level = 1
`).all().map((r) => r.kode);

const ada = db.prepare(`
  SELECT DISTINCT k.kode
  FROM kbli_keyword kk
  JOIN kbli_2025 k ON k.id = kk.kbli_id
  WHERE k.level = 5
`).all().map((r) => r.kode);

const kosong = all.filter((k) => !ada.includes(k));

console.log("Total kategori level 5:", all.length);
console.log("Punya keyword:", ada.length);
console.log("Tanpa keyword sama sekali:", kosong);