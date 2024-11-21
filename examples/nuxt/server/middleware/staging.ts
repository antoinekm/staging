import { stagingMiddleware } from "staging-nuxt";

export default stagingMiddleware({
  enabled: process.env.VERCEL_ENV === "preview" || true,
  password: "demo",
});
