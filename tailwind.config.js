/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5848FF",
          50: "#EEEBFF",
          100: "#DDD7FF",
          200: "#BBB0FF",
          300: "#9988FF",
          400: "#7766FF",
          500: "#5848FF",
          600: "#4737CC",
          700: "#352999",
          800: "#241B66",
          900: "#120E33",
        },
        qris: {
          red: "#D71920",
          dark: "#231F20",
          soft: "#FFF1F1",
          line: "#F7D6D7",
        },
        ink: {
          DEFAULT: "#0F0F12",
          muted: "#6B6B73",
          soft: "#9B9BA3",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F4F4F5",
          dim: "#EAEAEC",
        },
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
        display: ["Baloo 2", "Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 8px 24px -8px rgba(15, 15, 18, 0.12)",
        soft: "0 2px 8px -2px rgba(15, 15, 18, 0.08)",
        glow: "0 24px 48px -12px rgba(88, 72, 255, 0.45)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        shake: "shake 0.28s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
      },
    },
  },
  plugins: [],
};
