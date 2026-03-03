const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const config = {
  // When running tests, avoid loading PostCSS plugins (Vitest + Vite tries to load them and can fail).
  plugins: isTest ? {} : { "@tailwindcss/postcss": {} },
};

export default config;
