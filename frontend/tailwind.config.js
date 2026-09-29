/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Colores personalizados para Klion
        "background-light": "rgb(250, 250, 250)",
        "background-dark": "rgb(10, 10, 10)",
        "surface-light": "rgb(255, 255, 255)",
        "surface-dark": "rgb(20, 20, 20)",
        "border-light": "rgb(229, 231, 235)",
        "border-dark": "rgb(55, 65, 81)",
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
      },
      textColor: {
        "ai-gradient": "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
      },
    },
  },
  plugins: [],
};
