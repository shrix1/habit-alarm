/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        text: "var(--text)",
        secondary: "var(--secondary)",
        error: "var(--error)",
        white: "#ffffff",
      },
    },
  },
  plugins: [],
};
