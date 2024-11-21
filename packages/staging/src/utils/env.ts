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

export const mergeWithEnv = (
  defaults: typeof DEFAULT_OPTIONS,
): Partial<StagingOptions> => {
  return {
    enabled: getEnvValue("ENABLED") === "false" ? false : defaults.enabled,
    cookieMaxAge: getEnvNumber("COOKIE_MAX_AGE") ?? defaults.cookieMaxAge,
    jwtSecret: getEnvValue("JWT_SECRET"),
    loginPath: getEnvValue("LOGIN_PATH") ?? defaults.loginPath,
    siteName: getEnvValue("SITE_NAME") ?? defaults.siteName,
    protectedRoutes: getEnvArray("PROTECTED_ROUTES"),
    publicRoutes: getEnvArray("PUBLIC_ROUTES"),
    redirectUrl: getEnvValue("REDIRECT_URL") ?? defaults.redirectUrl,
  };
};
