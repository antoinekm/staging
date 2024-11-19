// nuxt.config.ts
export default defineNuxtConfig({
  // Runtime config
  runtimeConfig: {
    stagingPassword: process.env.STAGING_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
  },

  // Dev server config
  devServer: {
    port: 3000,
  },

  // Nitro config
  nitro: {
    // You can add specific nitro config here if needed
  },

  compatibilityDate: "2024-11-18",
});
