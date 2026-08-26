// lib/theme.js
export const PALETTE = [
  "#005F73", "#0A9396", "#94D2BD", "#EE9B00", "#CA6702",
  "#BB3E03", "#AE2012", "#9B2226", "#E9D8A6",
];

export const SEMANTIC = {
  ink: "#00212e",
  tealDark: "#005F73",
  teal: "#0A9396",
  tealLight: "#94D2BD",
  sand: "#E9D8A6",
  gold: "#EE9B00",
  amber: "#CA6702",
  positive: "#0A9396",
  neutral: "#94D2BD",
  negative: "#AE2012",
  line: "#E4E2DC",
  bg: "#F6F5F0",
};

export function paletteColor(index) {
  return PALETTE[index % PALETTE.length];
}

export const SENTIMEN_COLORS = {
  Positif: SEMANTIC.positive,
  Netral: SEMANTIC.neutral,
  Negatif: SEMANTIC.negative,
};

export const KONDISI_STYLES = {
  Tumbuh: { text: "#6EE7B7", bg: "rgba(110,231,183,0.18)" },
  Stagnan: { text: "#EE9B00", bg: "rgba(238,155,0,0.18)" },
  Kontraksi: { text: "#FCA5A5", bg: "rgba(252,165,165,0.18)" },
};

export default { PALETTE, SEMANTIC, paletteColor, SENTIMEN_COLORS, KONDISI_STYLES };