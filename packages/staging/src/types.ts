import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      session?: {
        returnTo?: string;
        [key: string]: any;
      };
    }
  }
}

export interface StagingOptions {
  /** The password required to access protected routes. Can be set via STAGING_PASSWORD env var */
  password?: string;
  /** Duration in milliseconds for how long the auth cookie remains valid. Default: 7 days. Can be set via STAGING_COOKIE_MAX_AGE env var (in days) */
  cookieMaxAge?: number;
  /** Secret used to sign the JWT token. Default: randomly generated. Can be set via STAGING_JWT_SECRET env var */
  jwtSecret?: string;
  /** Path for the login endpoint. Default: '/protected'. Can be set via STAGING_LOGIN_PATH env var */
  loginPath?: string;
  /** Name displayed on the login page. Default: 'Protected Page'. Can be set via STAGING_SITE_NAME env var */
  siteName?: string;
  /** Routes that should be protected. Default: all routes except loginPath. Can be set via STAGING_PROTECTED_ROUTES env var as comma-separated paths */
  protectedRoutes?: string[];
  /** Routes that should never be protected. Default: []. Can be set via STAGING_PUBLIC_ROUTES env var as comma-separated paths */
  publicRoutes?: string[];
  /** URL to redirect to after successful login. Default: the original requested URL. Can be set via STAGING_REDIRECT_URL env var */
  redirectUrl?: string;
}
