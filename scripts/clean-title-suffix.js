// scripts/clean-title-suffix.js
const { db } = require("../lib/db");

const SUFFIXES = [" - RRI.co.id", "- RRI.co.id"];

const rows = db.prepare(`SELECT id, judul FROM fenomena WHERE nama_sumber = 'RRI'`).all();
const update = db.prepare(`UPDATE fenomena SET judul = ? WHERE id = ?`);

let changed = 0;
const tx = db.transaction((items) => {
  for (const r of items) {
    let t = r.judul;
    for (const suf of SUFFIXES) {
      if (t.endsWith(suf)) { t = t.slice(0, -suf.length).trim(); break; }
    }
    if (t !== r.judul) { update.run(t, r.id); changed++; }
  }
});
tx(rows);

console.log(`${changed} judul RRI dibersihkan dari akhiran situs.`);