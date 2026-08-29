// lib/exportFilename.js
function sanitize(str) {
  return String(str || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function buildExportFilename(searchParams, ext) {
  const sektor = sanitize(searchParams.get("sektorLabel") || "SemuaSektor");
  const status = sanitize(searchParams.get("statusLabel") || "SemuaStatus");
  const periode = sanitize(searchParams.get("periodeLabel") || "SemuaData");
  const waktu = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12); // YYYYMMDDHHmm
  return `${sektor}-${status}-${periode}-${waktu}.${ext}`;
}

module.exports = { buildExportFilename };