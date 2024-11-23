// packages/staging/src/utils/options.ts
import { StagingOptions } from "../types";
import { normalizeRoute } from "./routes";

export const DEFAULT_OPTIONS = {
  enabled: true,
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  loginPath: "/protected" as string,
  siteName: "Protected Page" as string,
  protectedRoutes: [] as string[],
  publicRoutes: ["/favicon.ico", "/robots.txt", "/sitemap.xml"] as string[],
  redirectUrl: "/",
  jwtSecret: "unset" as string,
} as const;

export const mergeOptions = (
  defaultOptions: Partial<StagingOptions>,
  envOptions: Partial<StagingOptions>,
  userOptions: Partial<StagingOptions>,
): Required<StagingOptions> => {
  if (process.env.DEBUG) {
    console.log("Merging options:", {
      envPassword: envOptions.password ? "[SET]" : "[NOT SET]",
      userPassword: userOptions.password ? "[SET]" : "[NOT SET]",
    });
  }

  const combinedPublicRoutes = [
    ...(DEFAULT_OPTIONS.publicRoutes || []),
    ...(defaultOptions.publicRoutes || []),
    ...(envOptions.publicRoutes || []),
    ...(userOptions.publicRoutes || []),
  ].map(normalizeRoute);

  const combinedProtectedRoutes = [
    ...(DEFAULT_OPTIONS.protectedRoutes || []),
    ...(defaultOptions.protectedRoutes || []),
    ...(envOptions.protectedRoutes || []),
    ...(userOptions.protectedRoutes || []),
  ].map(normalizeRoute);

  // Password handling - prioritize user options over env options
  const password = userOptions.password || envOptions.password || "";

  // JWT Secret handling
  const jwtSecret =
    userOptions.jwtSecret ||
    envOptions.jwtSecret ||
    defaultOptions.jwtSecret ||
    DEFAULT_OPTIONS.jwtSecret;

  // Merge all options, with proper priority
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...defaultOptions,
    ...envOptions,
    ...userOptions,
    publicRoutes: combinedPublicRoutes,
    protectedRoutes: combinedProtectedRoutes,
    password, // Use our explicitly handled password
    jwtSecret, // Use our explicitly handled JWT secret
  };

  if (process.env.DEBUG) {
    console.log("Final merged options:", {
      ...mergedOptions,
      password: mergedOptions.password ? "[SET]" : "[NOT SET]",
      jwtSecret: mergedOptions.jwtSecret !== "unset" ? "[SET]" : "[NOT SET]",
    });
  }

  return mergedOptions;
};
