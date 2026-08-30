require("dotenv").config({ path: ".env.local" });
const { db } = require("../lib/db");

async function main() {
  const row = await db.prepare("SELECT COUNT(*) c FROM fenomena").get();
  console.log("Jumlah fenomena:", row.c);
}

main().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});