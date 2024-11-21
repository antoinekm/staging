// packages/staging/src/utils/process.ts
import jwt from "jsonwebtoken";

import { loginTemplate, setupTemplate, stylesContent } from "../templates";
import { isProtectedRoute } from "./routes";
import { StagingOptions } from "../types";

export interface SessionData {
  returnTo?: string;
  [key: string]: any;
}

export interface StagingContext {
  url: string;
  method: string;
  password?: string;
  cookies: Record<string, string>;
  originalUrl?: string;
  session?: SessionData;
}

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export interface StagingCallbacks<ResponseType> {
  // Response handlers
  sendHtml: (html: string, statusCode: number) => ResponseType;
  sendCss: (css: string) => ResponseType;
  redirect: (url: string) => ResponseType | Promise<ResponseType>;

  // Cookie management
  setCookie: (
    name: string,
    value: string,
    options: CookieOptions,
  ) => ResponseType;
  clearCookie: (name: string) => ResponseType;

  // Session management
  setSessionValue?: (key: string, value: string) => ResponseType;
  clearSessionValue?: (key: string) => ResponseType;

  // Continue to next middleware
  next: () => ResponseType;
}

export interface StagingProcessOptions<ResponseType> {
  context: StagingContext;
  options: Required<StagingOptions>;
  staticPrefix: string;
  cssRoute: string;
  callbacks: StagingCallbacks<ResponseType>;
}

export async function handleStagingProcess<ResponseType>({
  context,
  options,
  staticPrefix,
  cssRoute,
  callbacks,
}: StagingProcessOptions<ResponseType>): Promise<ResponseType> {
  const { url, method, cookies, originalUrl = "/" } = context;

  // Skip if staging is disabled
  if (!options.enabled) {
    return callbacks.next();
  }

  if (process.env.DEBUG) {
    console.log("Incoming request path:", url);
  }

  // Serve CSS file
  if (url === cssRoute) {
    return callbacks.sendCss(stylesContent);
  }

  // Skip auth check for static assets
  if (url.startsWith(staticPrefix)) {
    return callbacks.next();
  }

  // If no password is set, show setup instructions
  if (!options.password) {
    const setupHtml = setupTemplate
      .replace(/\{\{cssPath\}\}/g, cssRoute)
      .replace(/\{\{siteName\}\}/g, options.siteName);
    return callbacks.sendHtml(setupHtml, 500);
  }

  // Handle login path
  if (url === options.loginPath) {
    if (method === "POST") {
      if (context.password === options.password) {
        // Generate JWT token
        const token = jwt.sign({}, options.jwtSecret, {
          expiresIn: options.cookieMaxAge,
        });

        // Set auth cookie
        await callbacks.setCookie("staging", token, {
          maxAge: options.cookieMaxAge,
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        // Get redirect URL from session or default
        let redirectUrl = options.redirectUrl;
        if (context.session?.returnTo) {
          redirectUrl = context.session.returnTo;
          callbacks.clearSessionValue?.("returnTo");
        } else {
          redirectUrl = originalUrl;
        }
        console.log("[staging] Redirecting to:", redirectUrl);
        return callbacks.redirect(redirectUrl);
      }
      // Invalid password
      return callbacks.sendHtml("Invalid password", 401);
    }

    // GET request - show login form
    const html = loginTemplate
      .replace(/\{\{siteName\}\}/g, options.siteName)
      .replace(/\{\{loginPath\}\}/g, options.loginPath)
      .replace(/\{\{cssPath\}\}/g, cssRoute);
    return callbacks.sendHtml(html, 200);
  }

  // Check if route should be protected
  if (!isProtectedRoute(url, options)) {
    if (process.env.DEBUG) {
      console.log("Route is not protected, allowing access:", url);
    }
    return callbacks.next();
  }

  // Verify JWT token
  const token = cookies.staging;
  if (token) {
    try {
      jwt.verify(token, options.jwtSecret);
      return callbacks.next();
    } catch (err) {
      if (process.env.DEBUG) {
        console.log("Invalid token, clearing cookie");
      }
      await callbacks.clearCookie("staging");
    }
  }

  // Store return URL
  if (callbacks.setSessionValue) {
    await callbacks.setSessionValue("returnTo", originalUrl);
  }

  // Show login form with 401 status
  const html = loginTemplate
    .replace(/\{\{siteName\}\}/g, options.siteName)
    .replace(/\{\{loginPath\}\}/g, options.loginPath)
    .replace(/\{\{cssPath\}\}/g, cssRoute);

  return callbacks.sendHtml(html, 401);
}
