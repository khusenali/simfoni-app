// lib/metaApi.js
// Pengambilan data otomatis dari Instagram & Facebook memakai Meta Graph API resmi (gratis).
//
// SYARAT (disiapkan sekali oleh admin BPS, bukan oleh pengguna dashboard):
//   1. Buat Meta App di https://developers.facebook.com/apps
//   2. Aktifkan produk "Instagram Graph API" & "Facebook Pages API"
//   3. Hubungkan Halaman Facebook resmi (mis. Facebook Pemkab Raja Ampat) yang
//      dikelola BPS/Diskominfo, dapatkan Page Access Token jangka panjang.
//   4. Untuk akun Instagram (mis. @diskominfo), akun harus berupa
//      Instagram Business/Creator yang ditautkan ke Halaman Facebook tsb.
//   5. Simpan token di file .env.local sebagai META_ACCESS_TOKEN (lihat .env.example)
//
// Catatan penting: Graph API hanya bisa mengambil konten dari akun/Halaman yang
// sudah terhubung & diberi izin ke App ini (bukan sembarang akun publik orang lain).
// Ini sesuai kebijakan Meta dan mencegah penyalahgunaan data pribadi.

const { extractKeywords, analyzeSentiment, detectSektor, isRajaAmpatRelated } = require("./textmining");
const { insertFenomena, findByUrl, findSimilarFenomena } = require("./fenomenaRepo");

const GRAPH_VERSION = "v20.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function getAccessToken() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "META_ACCESS_TOKEN belum diatur. Tambahkan pada file .env.local (lihat .env.example)."
    );
  }
  return token;
}

// sumber.identifier untuk Instagram = Instagram Business Account ID
async function fetchInstagramPosts(igUserId, limit = 25) {
  const token = getAccessToken();
  const fields = "id,caption,timestamp,permalink,media_type,media_url,like_count";
  const url = `${GRAPH_BASE}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${token}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`Instagram Graph API error: ${json.error.message}`);
  return json.data || [];
}

// sumber.identifier untuk Facebook = Page ID
async function fetchFacebookPosts(pageId, limit = 25) {
  const token = getAccessToken();
  const fields = "id,message,created_time,permalink_url";
  const url = `${GRAPH_BASE}/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${token}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`Facebook Graph API error: ${json.error.message}`);
  return json.data || [];
}

function ingestSocialPost({ text, url, tanggal, namaSumber }) {
  if (!url || findByUrl(url)) return false;
  if (!text || !text.trim()) return false;
  // Aturan: hanya simpan postingan yang benar-benar terkait Raja Ampat.
  // Akun sumber (mis. Instagram Diskominfo, Facebook Pemkab) umumnya sudah
  // lokal, namun filter ini tetap dijalankan agar konsisten dengan aturan
  // relevansi pada ketiga jenis sumber data.
  if (!isRajaAmpatRelated(text)) return false;
  const { detectDistrik } = require("./wilayah");
  const mirip = findSimilarFenomena(text, tanggal);
  insertFenomenaWithSimilarity({
    // timestamp/created_time dari Graph API sudah menyertakan jam, disimpan
    // apa adanya (ISO 8601) agar informasi jam kejadian/unggahan tidak hilang.
    tanggal: tanggal || new Date().toISOString(),
    judul: text.slice(0, 120),
    uraian: text.slice(0, 800),
    sumber_tipe: "media_sosial",
    nama_sumber: namaSumber,
    url,
    lokasi: null,
    sektor_nama: detectSektor(text),
    keyword: extractKeywords(text),
    sentimen: analyzeSentiment(text),
    status: "Draft",
    media: "Media Sosial",
    miripDenganId: mirip?.id || null,
    skorKemiripan: mirip ? Math.round(mirip.score * 100) : null,
    lokasi: detectDistrik(fullText),
    distrik_nama: detectDistrik(fullText),
  });
  if (mirip) results.mirip = (results.mirip || 0) + 1;
  results.inserted++;
}

// sumberList: baris tabel `sumber` dengan platform 'instagram' | 'facebook'
async function scrapeMetaSources(sumberList) {
  const results = { inserted: 0, skipped: 0, errors: [] };
  for (const s of sumberList) {
    try {
      if (s.platform === "instagram") {
        const posts = await fetchInstagramPosts(s.identifier);
        for (const p of posts) {
          const ok = ingestSocialPost({
            text: p.caption,
            url: p.permalink,
            tanggal: p.timestamp,
            namaSumber: s.nama,
          });
          ok ? results.inserted++ : results.skipped++;
        }
      } else if (s.platform === "facebook") {
        const posts = await fetchFacebookPosts(s.identifier);
        for (const p of posts) {
          const ok = ingestSocialPost({
            text: p.message,
            url: p.permalink_url,
            tanggal: p.created_time,
            namaSumber: s.nama,
          });
          ok ? results.inserted++ : results.skipped++;
        }
      }
    } catch (err) {
      results.errors.push({ sumber: s.nama, message: err.message });
    }
  }
  return results;
}

module.exports = { scrapeMetaSources, fetchInstagramPosts, fetchFacebookPosts };
