import { StagingOptions } from "../types";
import { DEFAULT_OPTIONS } from "./options";

export const getEnvValue = (key: string): string | undefined => {
  const envKey = `STAGING_${key.toUpperCase()}`;
  return process.env[envKey];
};

export const getEnvArray = (key: string): string[] => {
  const value = getEnvValue(key);
  return value ? value.split(",").map((route) => route.trim()) : [];
};

export const getEnvNumber = (key: string): number | undefined => {
  const value = getEnvValue(key);
  return value ? parseInt(value, 10) : undefined;
};

export const getEnvBoolean = (key: string): boolean | undefined => {
  const value = getEnvValue(key);
  return value ? value === "true" : undefined;
};

export const mergeWithEnv = (
  defaults: typeof DEFAULT_OPTIONS,
): StagingOptions => {
  const enabled = getEnvBoolean("ENABLED");
  const cookieMaxAge = getEnvNumber("COOKIE_MAX_AGE");
  const password = getEnvValue("PASSWORD");
  const jwtSecret = getEnvValue("JWT_SECRET");
  const loginPath = getEnvValue("LOGIN_PATH");
  const siteName = getEnvValue("SITE_NAME");
  const protectedRoutes = getEnvArray("PROTECTED_ROUTES");
  const publicRoutes = getEnvArray("PUBLIC_ROUTES");
  const redirectUrl = getEnvValue("REDIRECT_URL");

  if (process.env.DEBUG) {
    console.log("Staging Environment Configuration:", {
      enabled,
      password: password ? "[SET]" : "[NOT SET]",
      jwtSecret: jwtSecret ? "[SET]" : "[NOT SET]",
      loginPath,
      siteName,
      protectedRoutes,
      publicRoutes,
      redirectUrl,
    });
  }

  return {
    enabled: enabled ?? defaults.enabled,
    cookieMaxAge: cookieMaxAge ?? defaults.cookieMaxAge,
    password,
    jwtSecret,
    loginPath: loginPath ?? defaults.loginPath,
    siteName: siteName ?? defaults.siteName,
    protectedRoutes,
    publicRoutes,
    redirectUrl: redirectUrl ?? defaults.redirectUrl,
  };
};
