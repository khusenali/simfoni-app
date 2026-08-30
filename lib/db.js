// lib/db.js
const { createClient } = require("@libsql/client");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function normalizeArgs(args) {
  // db.prepare(sql).run({ nama: "x" })  -> named params (@nama/:nama)
  // db.prepare(sql).run("x", "y")       -> positional params (?)
  if (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

function toPlainRow(row) {
  // ubah BigInt (kalau ada kolom INTEGER besar) jadi Number biar aman di-JSON.stringify
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = typeof v === "bigint" ? Number(v) : v;
  return out;
}

function makeQueryable(executor) {
  return {
    prepare(sql) {
      return {
        async get(...args) {
          const rs = await executor.execute({ sql, args: normalizeArgs(args) });
          return rs.rows[0] ? toPlainRow(rs.rows[0]) : undefined;
        },
        async all(...args) {
          const rs = await executor.execute({ sql, args: normalizeArgs(args) });
          return rs.rows.map(toPlainRow);
        },
        async run(...args) {
          const rs = await executor.execute({ sql, args: normalizeArgs(args) });
          return {
            changes: rs.rowsAffected,
            lastInsertRowid:
              rs.lastInsertRowid !== undefined && rs.lastInsertRowid !== null
                ? Number(rs.lastInsertRowid)
                : undefined,
          };
        },
      };
    },
    async exec(sql) {
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        try {
          await executor.execute(stmt);
        } catch (err) {
          console.error("Gagal di statement:\n", stmt);
          throw err;
        }
      }
    }
  };
}

const db = makeQueryable(client);

// Pengganti db.transaction(fn) yang sinkron di better-sqlite3.
// Perbedaan penting: fn sekarang WAJIB terima `tx` sebagai parameter pertama
// dan pakai tx.prepare(...) di dalamnya, bukan db.prepare(...) dari luar.
db.transaction = function (fn) {
  return async (...args) => {
    const tx = await client.transaction("write");
    const txDb = makeQueryable(tx);
    try {
      const result = await fn(txDb, ...args);
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback();
      throw err;
    } finally {
      tx.close();
    }
  };
};

module.exports = { db };