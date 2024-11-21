import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

import { StagingOptions } from "./types";
import { mergeWithEnv } from "./utils/env";
import { CookieOptions, handleStagingProcess } from "./utils/process";
import { normalizeRoute } from "./utils/routes";

export * from "./templates";
export * from "./types";
export * from "./utils";

export const DEFAULT_OPTIONS = {
  enabled: true,
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  loginPath: "/protected" as string,
  siteName: "Protected Page" as string,
  protectedRoutes: [] as string[],
  publicRoutes: ["/favicon.ico", "/robots.txt", "/sitemap.xml"] as string[],
  redirectUrl: "/",
  jwtSecret: crypto.randomBytes(32).toString("hex"),
} as const;

export const mergeOptions = (
  defaultOptions: Partial<StagingOptions>,
  envOptions: Partial<StagingOptions>,
  userOptions: Partial<StagingOptions>,
): Required<StagingOptions> => {
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

  return {
    ...DEFAULT_OPTIONS,
    ...defaultOptions,
    ...envOptions,
    ...userOptions,
    publicRoutes: combinedPublicRoutes,
    protectedRoutes: combinedProtectedRoutes,
    password: userOptions.password || "",
  };
};

export default function staging(options: StagingOptions = {}) {
  const envOptions = mergeWithEnv(DEFAULT_OPTIONS);
  const mergedOptions = mergeOptions(DEFAULT_OPTIONS, envOptions, options);

  // Define static routes
  const staticPrefix = "/_staging";
  const cssRoute = `${staticPrefix}/styles.css`;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handleStagingProcess<Response>({
        context: {
          url: req.path,
          method: req.method,
          password: req.body?.password,
          cookies: req.cookies || {},
          originalUrl: req.originalUrl,
          session: req.session as any,
        },
        options: mergedOptions,
        staticPrefix,
        cssRoute,
        callbacks: {
          sendHtml: (html, statusCode) => {
            res.status(statusCode);
            return res.send(html);
          },
          sendCss: (css) => {
            res.type("text/css");
            return res.send(css);
          },
          redirect: (url) => {
            res.redirect(url);
            return res;
          },
          setCookie: (name, value, options: CookieOptions) => {
            return res.cookie(name, value, options);
          },
          clearCookie: (name) => res.clearCookie(name),
          setSessionValue: (key, value) => {
            if (req.session) {
              (req.session as any)[key] = value;
            }
            return res;
          },
          clearSessionValue: (key) => {
            if (req.session) {
              delete (req.session as any)[key];
            }
            return res;
          },
          next: () => {
            next();
            return res;
          },
        },
      });

      return result;
    } catch (error) {
      next(error);
    }
  };
}
