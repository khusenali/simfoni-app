/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "pdfkit", "exceljs", "@huggingface/transformers", "onnxruntime-node"],
  },
};

module.exports = nextConfig;