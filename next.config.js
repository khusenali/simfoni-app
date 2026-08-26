/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "pdfkit", "exceljs"],
    instrumentationHook: true, // wajib biar instrumentation.js jalan
  },
};

module.exports = nextConfig;

