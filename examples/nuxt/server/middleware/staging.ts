import crypto from "crypto";
import { stagingMiddleware } from "staging-nuxt";

// Generate a stable JWT secret or use from environment
const JWT_SECRET = crypto.randomBytes(64).toString("hex");

export default stagingMiddleware({
  password: "demo",
  jwtSecret: JWT_SECRET,
  siteName: "Your Site",
  publicRoutes: ["/api/health", "/public/*"],
});
