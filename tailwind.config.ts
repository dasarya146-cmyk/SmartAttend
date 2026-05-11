import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
      },
      colors: {
        bg: {
          base: "#080c14",
          surface: "rgba(255,255,255,0.04)",
          elevated: "rgba(255,255,255,0.07)",
        },
        accent: {
          indigo: "#6366f1",
          violet: "#8b5cf6",
          cyan: "#06b6d4",
          emerald: "#10b981",
          rose: "#f43f5e",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          accent: "rgba(99,102,241,0.4)",
        },
        text: {
          1: "#f1f5f9",
          2: "#94a3b8",
          3: "#475569",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease both",
        "scale-in": "scaleIn 0.3s ease both",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "orb-float": "orbFloat 8s ease-in-out infinite",
        "slide-in-right": "slideInRight 0.3s ease both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99,102,241,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(99,102,241,0.7)" },
        },
        orbFloat: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-30px) scale(1.05)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(99,102,241,0.3)",
        "glow-cyan": "0 0 40px rgba(6,182,212,0.3)",
        "glow-emerald": "0 0 40px rgba(16,185,129,0.3)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
