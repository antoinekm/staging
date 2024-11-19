import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { loginTemplate, setupTemplate, stylesContent } from "./templates";
import { StagingOptions } from "./types";
import { getEnvValue, mergeWithEnv } from "./utils/env";
import { isProtectedRoute, normalizeRoute } from "./utils/routes";

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
  const password = options.password || getEnvValue("PASSWORD");

  // Merge environment variables and provided options
  const envOptions = mergeWithEnv(DEFAULT_OPTIONS);
  const mergedOptions = mergeOptions(DEFAULT_OPTIONS, envOptions, {
    ...options,
    jwtSecret: options.jwtSecret,
  });

  if (process.env.DEBUG) {
    console.log("Merged public routes:", mergedOptions.publicRoutes);
  }

  // Define static routes
  const staticPrefix = "/_staging";
  const cssRoute = `${staticPrefix}/styles.css`;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip all checks if staging is disabled
    if (!mergedOptions.enabled) {
      return next();
    }

    if (process.env.DEBUG) {
      console.log("Incoming request path:", req.path);
    }

    // Serve the CSS file
    if (req.path === cssRoute) {
      res.type("text/css").send(stylesContent);
      return;
    }

    // Skip auth check for static assets
    if (req.path.startsWith(staticPrefix)) {
      return next();
    }

    // If no password is set, show setup instructions
    if (!password) {
      const setupHtml = setupTemplate
        .replace(/\{\{cssPath\}\}/g, cssRoute)
        .replace(/\{\{siteName\}\}/g, mergedOptions.siteName);
      return res.status(500).send(setupHtml);
    }

    // Store original URL for redirect after login
    const originalUrl = req.originalUrl || "/";

    // Check if the request is for the login page
    if (req.path === mergedOptions.loginPath) {
      if (req.method === "POST") {
        if (req.body.password === password) {
          const token = jwt.sign({}, mergedOptions.jwtSecret, {
            expiresIn: mergedOptions.cookieMaxAge,
          });
          res.cookie("staging", token, {
            maxAge: mergedOptions.cookieMaxAge,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          });

          // Redirect to the original URL or configured redirect URL
          let redirectTo = mergedOptions.redirectUrl;

          // If we have a stored return URL in the session, use that
          if (req.session?.returnTo) {
            redirectTo = req.session.returnTo;
            // Clear the stored URL after use
            delete req.session.returnTo;
          } else {
            // If no stored URL, use the original URL
            redirectTo = originalUrl;
          }

          return res.redirect(redirectTo);
        } else {
          return res.status(401).send("Invalid password");
        }
      }

      const html = loginTemplate
        .replace(/\{\{siteName\}\}/g, mergedOptions.siteName)
        .replace(/\{\{loginPath\}\}/g, mergedOptions.loginPath)
        .replace(/\{\{cssPath\}\}/g, cssRoute);

      return res.send(html);
    }

    // Check if this route should be protected
    if (!isProtectedRoute(req.path, mergedOptions)) {
      if (process.env.DEBUG) {
        console.log("Route is not protected, allowing access:", req.path);
      }
      return next();
    }

    // Check for valid JWT token in cookie
    const token = req.cookies?.staging;
    if (token) {
      try {
        jwt.verify(token, mergedOptions.jwtSecret);
        return next();
      } catch (err) {
        if (process.env.DEBUG) {
          console.log("Invalid token, clearing cookie");
        }
        res.clearCookie("staging");
      }
    }

    // Store return URL in session if available
    if (req.session) {
      req.session.returnTo = originalUrl;
    }

    // If no valid token, render login page with replacements
    const html = loginTemplate
      .replace(/\{\{siteName\}\}/g, mergedOptions.siteName)
      .replace(/\{\{loginPath\}\}/g, mergedOptions.loginPath)
      .replace(/\{\{cssPath\}\}/g, cssRoute);

    res.status(401).send(html);
  };
}
