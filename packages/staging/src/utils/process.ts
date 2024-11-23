// packages/staging/src/utils/process.ts
import { SignJWT, jwtVerify } from "jose";

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

export interface SetupTemplateVariables {
  pageTitle: string;
  title: string;
  description: string;
  alertText: string;
  setupMethod1Label: string;
  setupMethod1: string;
  setupMethod2Label: string;
  setupMethod2: string;
  footerText: string;
  cssPath: string;
}

function renderSetupTemplate(variables: SetupTemplateVariables): string {
  let html = setupTemplate;
  Object.entries(variables).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return html;
}

function renderLoginTemplate(variables: {
  siteName: string;
  loginPath: string;
  cssPath: string;
  error?: string;
}): string {
  const templateVars = {
    siteName: variables.siteName,
    loginPath: variables.loginPath,
    cssPath: variables.cssPath,
    errorHtml: variables.error
      ? `<div class="error-message">${variables.error}</div>`
      : "",
    errorClass: variables.error ? " input-error" : "",
  };

  let html = loginTemplate;

  Object.entries(templateVars).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  });

  return html;
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

  // Verify JWT Secret is set
  if (!options.jwtSecret || options.jwtSecret === "unset") {
    const setupHtml = renderSetupTemplate({
      pageTitle: "Setup Required",
      title: "Setup Required",
      description: "JWT Secret not configured",
      alertText:
        "To protect your routes, you need to set up a JWT secret for token encryption. You can do this in two ways:",
      setupMethod1Label: "Using environment variable",
      setupMethod1: "STAGING_JWT_SECRET=your-secret",
      setupMethod2Label: "Or when initializing the middleware",
      setupMethod2: "staging({\n  jwtSecret: 'your-secret'\n})",
      footerText: "Please set up the JWT secret and restart your application.",
      cssPath: cssRoute,
    });
    return callbacks.sendHtml(setupHtml, 500);
  }

  // If no password is set, show setup instructions
  if (!options.password) {
    const setupHtml = renderSetupTemplate({
      pageTitle: "Setup Required",
      title: "Setup Required",
      description: "Password not configured",
      alertText:
        "To protect your routes, you need to set up a password. You can do this in two ways:",
      setupMethod1Label: "Using environment variable",
      setupMethod1: "STAGING_PASSWORD=your-password",
      setupMethod2Label: "Or when initializing the middleware",
      setupMethod2: "staging({\n  password: 'your-password'\n})",
      footerText: "Please set up the password and restart your application.",
      cssPath: cssRoute,
    });
    return callbacks.sendHtml(setupHtml, 500);
  }

  if (url === options.loginPath) {
    if (method === "POST") {
      if (context.password === options.password) {
        // Convert jwtSecret to Uint8Array for jose
        const secretKey = new TextEncoder().encode(options.jwtSecret);
        // Generate JWT token
        const token = await new SignJWT({})
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(secretKey);

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
        return callbacks.redirect(redirectUrl);
      }
      // Invalid password
      const html = renderLoginTemplate({
        siteName: options.siteName,
        loginPath: options.loginPath,
        cssPath: cssRoute,
        error: "Invalid password. Please try again.",
      });
      return callbacks.sendHtml(html, 401);
    }

    // GET request - show login form
    const html = renderLoginTemplate({
      siteName: options.siteName,
      loginPath: options.loginPath,
      cssPath: cssRoute,
    });
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
      const secretKey = new TextEncoder().encode(options.jwtSecret);
      await jwtVerify(token, secretKey);
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
  const html = renderLoginTemplate({
    siteName: options.siteName,
    loginPath: options.loginPath,
    cssPath: cssRoute,
  });
  return callbacks.sendHtml(html, 200);
}
