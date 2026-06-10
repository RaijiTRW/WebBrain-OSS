import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#05070A",
        graphite: "#0B1016",
        panel: "#101821",
        line: "rgba(226, 246, 255, 0.12)",
        mist: "#DCE8EA",
        muted: "#8EA2AA",
        cyan: "#63E6FF",
        lime: "#C8FF5E",
        ember: "#FF8A5B"
      },
      borderRadius: {
        card: "8px"
      },
      boxShadow: {
        glass: "0 24px 80px rgba(0, 0, 0, 0.38)",
        glow: "0 0 70px rgba(99, 230, 255, 0.18)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-50%, 0, 0)" }
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        }
      },
      animation: {
        marquee: "marquee 26s linear infinite",
        scan: "scan 4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
