/** @type {import('tailwindcss').Config} */
// Warna sama seperti lib/theme.js (palet "Ocean Sunset") — di-hardcode di sini
// (bukan require lib/theme.js) supaya tidak bergantung ke resolusi path Node
// saat proses build Tailwind/PostCSS.
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    screens: {
      mobile: { max: "767px" },
      tablet: "768px",
      desktop: "1024px",
      wide: "1440px",
    },
    extend: {
      colors: {
        ink: "#001219",
        teal: {
          DEFAULT: "#0A9396",
          light: "#94D2BD",
          dark: "#005F73",
        },
        gold: "#EE9B00",
        plum: "#0A9396",
        slate: {
          ink: "#001219",
          soft: "#5B6B76",
        },
        bg: "#F6F5F0",
        card: "#FFFFFF",
        line: "#E4E2DC",
        coral: "#AE2012",
        positive: "#0A9396",
        neutral: "#94D2BD",
        sand: "#E9D8A6",
        amber: "#CA6702",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,42,61,0.06), 0 1px 8px rgba(15,42,61,0.04)",
      },
    },
  },
  plugins: [],
};