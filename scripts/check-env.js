require("dotenv").config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL || "(kosong)";
const token = process.env.TURSO_AUTH_TOKEN || "(kosong)";

console.log("--- TURSO_DATABASE_URL ---");
console.log("panjang:", url.length);
console.log("isi     :", JSON.stringify(url));

console.log("--- TURSO_AUTH_TOKEN ---");
console.log("panjang:", token.length);
console.log("awal   :", token.slice(0, 12));
console.log("akhir  :", token.slice(-12));