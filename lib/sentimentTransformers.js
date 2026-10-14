// lib/sentimentTransformers.js
// Jalanin IndoBERT via transformers.js, model di-load dari HuggingFace Hub
// repo KAMU SENDIRI saat runtime -- BUKAN dibundle ke dalam project/repo.
//
// KENAPA begini (bukan bundle folder models/ ke git):
//   - File model.onnx ~440MB (fp32) MELEWATI batas file tunggal GitHub
//     (100MB keras, butuh Git LFS) DAN batas ukuran Serverless Function
//     Vercel (250MB uncompressed per function) -- commit ke repo bakal
//     ditolak git push atau bikin build Vercel gagal.
//   - Load dari Hub: repo/project tetap kecil, build Vercel aman. Trade-off:
//     cold start pertama tiap instance baru nge-download model dulu (network),
//     di-cache di /tmp selama instance itu masih "hangat".
//
// SETUP SEKALI (sudah kamu lakukan sebagian -- tinggal upload):
//   1. Buat akun gratis di huggingface.co (kalau belum ada).
//   2. Buat model repo baru, mis. "namamu/indonesian-sentiment-onnx".
//   3. Upload folder models/indonesian-sentiment-onnx (yang sudah kamu
//      convert sebelumnya -- config.json, tokenizer*, vocab.txt,
//      onnx/model.onnx) ke repo itu lewat web UI HuggingFace (drag & drop)
//      atau `huggingface-cli upload`.
//   4. Set HF_MODEL_ID di .env.local dan Environment Variables Vercel,
//      isinya "namamu/indonesian-sentiment-onnx".
//   5. Setelah upload, folder models/ di project LOKAL boleh dihapus/sudah
//      otomatis diabaikan git (lihat .gitignore) -- gak perlu lagi disertakan.

let pipelinePromise = null;

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");

      // Vercel: filesystem read-only kecuali /tmp -- cache model di situ.
      env.cacheDir = "/tmp/.transformers-cache";
      env.allowRemoteModels = true; // ambil dari Hub, bukan folder lokal

      // JANGAN di-set ke `undefined` -- library internalnya manggil
      // pathJoin(...) yang me-reduce semua segment path termasuk
      // env.localModelPath dengan `.replace(...)`. Kalau nilainya
      // `undefined`, ini meledak dengan "Cannot read properties of
      // undefined (reading 'replace')" (ketangkep & fallback ke lexicon,
      // tapi IndoBERT jadi gak pernah kepake). Biarin default bawaan
      // library (string, bukan undefined) -- gak masalah karena
      // allowRemoteModels=true bikin library tetap coba Hub duluan.

      const modelId = process.env.HF_MODEL_ID || "taufiqdp/indonesian-sentiment";

      return pipeline("text-classification", modelId, {
        dtype: "fp32",
      });
    })();
  }
  return pipelinePromise;
}

const LABEL_MAP = { negatif: "Negatif", netral: "Netral", positif: "Positif" };

// texts: string[] -> label[] ("Positif"/"Netral"/"Negatif"), urutan sama
async function classifyBatch(texts) {
  const classifier = await getPipeline();
  const trimmed = texts.map((t) => (t || "").slice(0, 2000));
  const outputs = await classifier(trimmed);
  return outputs.map((o) => LABEL_MAP[o.label] || "Netral");
}

module.exports = { classifyBatch };