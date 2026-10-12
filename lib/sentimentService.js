// lib/sentimentService.js
// Hybrid sentiment resolver -- coba IndoBERT (transformers.js, jalan
// di dalam proses Node yang sama, gak ada server terpisah) dulu, kalau
// gagal (model belum dibundle, error load, dst) -> fallback ke
// analyzeSentiment() lexicon-based lama (lib/textmining.js).
//
// Fallback ini penting: kalau folder models/ belum di-setup (misal pas
// development awal sebelum sempat convert ONNX-nya), alur input & import
// fenomena tetap jalan normal, cuma belum dapet boost akurasi IndoBERT.

const { analyzeSentiment } = require("./textmining");
const { classifyBatch } = require("./sentimentTransformers");

// Dipakai di jalur single-record (POST /api/fenomena manual).
async function resolveSentiment(text) {
  try {
    const [label] = await classifyBatch([text]);
    if (label) return label;
  } catch (err) {
    console.warn("[sentimentService] IndoBERT gagal, fallback ke lexicon:", err.message);
  }
  return analyzeSentiment(text);
}

// Dipakai di jalur batch (import Excel/CSV banyak baris sekaligus) --
// satu panggilan pipeline buat semua teks, bukan satu-satu.
async function resolveSentimentBatch(texts) {
  if (!texts.length) return [];
  try {
    const labels = await classifyBatch(texts);
    if (labels.length === texts.length) return labels;
  } catch (err) {
    console.warn("[sentimentService] IndoBERT batch gagal, fallback ke lexicon:", err.message);
  }
  return texts.map((t) => analyzeSentiment(t));
}

module.exports = { resolveSentiment, resolveSentimentBatch };