import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";

import { StagingOptions } from "./types";

const getEnvValue = (key: string): string | undefined => {
  const envKey = `STAGING_${key.toUpperCase()}`;
  return process.env[envKey];
};

const getEnvArray = (key: string): string[] => {
  const value = getEnvValue(key);
  return value ? value.split(",").map((route) => route.trim()) : [];
};

const getEnvNumber = (key: string): number | undefined => {
  const value = getEnvValue(key);
  return value ? parseInt(value, 10) : undefined;
};

const defaultOptions = {
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  jwtSecret: crypto.randomBytes(64).toString("hex"),
  loginPath: "/protected",
  siteName: "Protected Page",
  protectedRoutes: [] as string[],
  publicRoutes: ["/favicon.ico", "/robots.txt", "/sitemap.xml"] as string[],
  redirectUrl: "/",
} as const;

const mergeWithEnv = (defaults: typeof defaultOptions) => {
  return {
    cookieMaxAge: getEnvNumber("COOKIE_MAX_AGE") ?? defaults.cookieMaxAge,
    jwtSecret: getEnvValue("JWT_SECRET") ?? defaults.jwtSecret,
    loginPath: getEnvValue("LOGIN_PATH") ?? defaults.loginPath,
    siteName: getEnvValue("SITE_NAME") ?? defaults.siteName,
    protectedRoutes: getEnvArray("PROTECTED_ROUTES"),
    publicRoutes: getEnvArray("PUBLIC_ROUTES"),
    redirectUrl: getEnvValue("REDIRECT_URL") ?? defaults.redirectUrl,
  };
};

const normalizePath = (path: string): string => {
  // Remove trailing slashes and ensure leading slash
  return "/" + path.replace(/^\/+|\/+$/g, "");
};

const createRegexFromPattern = (pattern: string): RegExp => {
  try {
    // Normalize the pattern first
    pattern = normalizePath(pattern);

    // If it's a simple static path (no wildcards or special chars)
    if (!/[*?{}()\[\]\\]/.test(pattern)) {
      return new RegExp(`^${pattern}$`);
    }

    // Convert common glob/wildcard patterns to regex
    let regexPattern = pattern
      // Escape special regex characters except * and ?
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      // Convert glob ** to regex pattern
      .replace(/\*\*/g, ".*")
      // Convert glob * to regex pattern (excluding /)
      .replace(/\*/g, "[^/]*")
      // Convert glob ? to regex pattern (single character)
      .replace(/\?/g, "[^/]");

    // Handle /api/* type patterns
    if (regexPattern.endsWith(".*")) {
      regexPattern = regexPattern.slice(0, -2) + "(?:/.*)?";
    }

    return new RegExp(`^${regexPattern}$`);
  } catch (err) {
    console.error("Error creating regex from pattern:", pattern, err);
    return new RegExp("^$");
  }
};

const isRouteMatch = (path: string, patterns: string[]): boolean => {
  // Normalize the input path
  const normalizedPath = normalizePath(path);

  // Convert patterns to RegExp objects and test the path
  return patterns.some((pattern) => {
    try {
      const regex = createRegexFromPattern(pattern);
      const isMatch = regex.test(normalizedPath);

      if (process.env.DEBUG) {
        console.log(
          `Testing path: ${normalizedPath} against pattern: ${pattern} (${regex}) = ${isMatch}`,
        );
      }

      return isMatch;
    } catch (err) {
      console.error("Error matching route:", path, pattern, err);
      return false;
    }
  });
};

const isProtectedRoute = (
  path: string,
  options: Required<StagingOptions>,
): boolean => {
  const normalizedPath = normalizePath(path);

  if (process.env.DEBUG) {
    console.log("Checking protection for path:", normalizedPath);
    console.log("Public routes:", options.publicRoutes);
    console.log("Protected routes:", options.protectedRoutes);
  }

  // Always allow access to the login page
  if (normalizedPath === options.loginPath) {
    return false;
  }

  // First check if it matches any public routes
  if (isRouteMatch(normalizedPath, options.publicRoutes)) {
    if (process.env.DEBUG) {
      console.log("Path matches public route:", normalizedPath);
    }
    return false;
  }

  // If protected routes are specified, check if path matches any
  if (options.protectedRoutes.length > 0) {
    const isProtected = isRouteMatch(normalizedPath, options.protectedRoutes);
    if (process.env.DEBUG) {
      console.log(
        "Protected routes specified, path is protected:",
        isProtected,
      );
    }
    return isProtected;
  }

  // If no protected routes specified, protect everything (except public routes)
  if (process.env.DEBUG) {
    console.log("No protected routes specified, protecting by default");
  }
  return true;
};

export function staging(options: StagingOptions = {}) {
  const password = options.password || getEnvValue("PASSWORD");

  // Merge environment variables and provided options
  const envOptions = mergeWithEnv(defaultOptions);

  // Combine public routes from all sources and normalize them
  const combinedPublicRoutes = [
    ...defaultOptions.publicRoutes,
    ...envOptions.publicRoutes,
    ...(options.publicRoutes || []),
  ].map((route) => {
    // Add wildcard suffix for directory-style routes
    if (route.endsWith("/")) {
      return route + "**";
    }
    // Add automatic wildcard for API routes
    if (route.includes("/api/")) {
      return route.endsWith("*") ? route : route + "/*";
    }
    return route;
  });

  const mergedOptions: Required<StagingOptions> = {
    ...defaultOptions,
    ...envOptions,
    ...options,
    publicRoutes: combinedPublicRoutes,
    password: password || "",
  };

  if (process.env.DEBUG) {
    console.log("Merged public routes:", mergedOptions.publicRoutes);
  }

  // Read and cache the templates and CSS
  const templatePath = path.join(__dirname, "template.html");
  const setupPath = path.join(__dirname, "setup.html");
  const cssPath = path.join(__dirname, "styles.css");

  // Cache the file contents
  const template = fs.readFileSync(templatePath, "utf-8");
  const setupTemplate = fs.readFileSync(setupPath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  // Define static routes
  const staticPrefix = "/_staging";
  const cssRoute = `${staticPrefix}/styles.css`;

  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DEBUG) {
      console.log("Incoming request path:", req.path);
    }

    // Serve the CSS file
    if (req.path === cssRoute) {
      res.type("text/css").send(cssContent);
      return;
    }

    // Skip auth check for static assets
    if (req.path.startsWith(staticPrefix)) {
      return next();
    }

    // If no password is set, show setup instructions
    if (!password) {
      const setupHtml = setupTemplate.replace(/\{\{cssPath\}\}/g, cssRoute);
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
      return next();
    }

    // Check if this route should be protected
    if (!isProtectedRoute(req.path, mergedOptions)) {
      if (process.env.DEBUG) {
        console.log("Route is not protected, allowing access:", req.path);
      }
      return next();
    }

    // Check for valid JWT token in cookie
    const token = req.cookies.staging;
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
    const html = template
      .replace(/\{\{siteName\}\}/g, mergedOptions.siteName)
      .replace(/\{\{loginPath\}\}/g, mergedOptions.loginPath)
      .replace(/\{\{cssPath\}\}/g, cssRoute);

    res.status(401).send(html);
  };
}
