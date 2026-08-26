// scripts/list-all.js
const { db } = require("../lib/db");
const rows = db.prepare(`SELECT id, judul FROM fenomena ORDER BY tanggal`).all();
rows.forEach(r => console.log(r.id, "-", r.judul));