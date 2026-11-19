// lib/sentimentService.js
// Sentimen lexicon-based (lib/textmining.js). IndoBERT dilepas; nanti diganti
// model hasil latihan dari data label manual.
const { analyzeSentiment } = require("./textmining");

async function resolveSentiment(text) {
  return analyzeSentiment(text);
}

async function resolveSentimentBatch(texts) {
  return texts.map((t) => analyzeSentiment(t));
}

module.exports = { resolveSentiment, resolveSentimentBatch };