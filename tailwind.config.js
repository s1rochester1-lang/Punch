/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1A17",
        panel: "#26221D",
        panelRaised: "#302B24",
        paper: "#F2EDE4",
        paperDim: "#D9D2C2",
        brass: "#C08A3E",
        brassBright: "#D9A24E",
        active: "#5C8A52",
        alert: "#B4483C",
        muted: "#A89D8A",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
