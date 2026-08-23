/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Preflight (Tailwind's base reset) pre-sets every element's border
      // color to its own built-in gray-200 fallback. It's inert wherever a
      // border-* color utility is used (those override it), but pointing
      // the fallback at our own token too means there's no hardcoded hex
      // left in the shipped CSS, even as dead weight.
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
      colors: {
        bg: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          hover: "var(--color-surface-hover)",
        },
        border: "var(--color-border)",
        overlay: "var(--color-overlay)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-inverse": {
          DEFAULT: "var(--color-text-inverse)",
          subtle: "var(--color-text-inverse-subtle)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
          muted: "var(--color-accent-muted)",
        },
        success: "var(--color-success)",
        danger: {
          DEFAULT: "var(--color-danger)",
          muted: "var(--color-danger-muted)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          subtle: "var(--color-warning-subtle)",
          muted: "var(--color-warning-muted)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          subtle: "var(--color-info-subtle)",
        },
        swatch: {
          1: "var(--color-swatch-1)",
          2: "var(--color-swatch-2)",
          3: "var(--color-swatch-3)",
          4: "var(--color-swatch-4)",
          5: "var(--color-swatch-5)",
          6: "var(--color-swatch-6)",
        },
      },
    },
  },
  plugins: [],
};
