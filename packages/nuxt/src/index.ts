import crypto from "crypto";
import {
  defineEventHandler,
  readBody,
  getCookie,
  setCookie,
  createError,
  H3Event,
  sendRedirect,
  setResponseHeader,
  setResponseStatus,
} from "h3";
import jwt from "jsonwebtoken";
import {
  DEFAULT_OPTIONS,
  StagingOptions,
  isProtectedRoute,
  loginTemplate,
  mergeOptions,
  mergeWithEnv,
  setupTemplate,
  stylesContent,
} from "staging";

const NUXT_DEFAULT_OPTIONS = {
  ...DEFAULT_OPTIONS,
  siteName: "Protected Nuxt Page",
  publicRoutes: [
    "/_nuxt/*",
    "/api/_content/*",
    "/__nuxt_error",
    "/favicon.ico",
    "/assets/*",
    "/_ipx/*",
  ] as string[],
} as const;

export const stagingMiddleware = (options: StagingOptions) => {
  const envOptions = mergeWithEnv(NUXT_DEFAULT_OPTIONS);
  const mergedOptions = mergeOptions(NUXT_DEFAULT_OPTIONS, envOptions, {
    ...options,
    jwtSecret: options.jwtSecret || crypto.randomBytes(32).toString("hex"),
  });

  const staticPrefix = "/_staging";
  const cssRoute = `${staticPrefix}/styles.css`;

  const renderLoginPage = (event: H3Event, statusCode = 200) => {
    setResponseStatus(event, statusCode);
    setResponseHeader(event, "Content-Type", "text/html");
    return loginTemplate
      .replace(/\{\{siteName\}\}/g, mergedOptions.siteName)
      .replace(/\{\{loginPath\}\}/g, mergedOptions.loginPath)
      .replace(/\{\{cssPath\}\}/g, cssRoute);
  };

  return defineEventHandler(async (event: H3Event) => {
    try {
      // Skip if staging is disabled
      if (!mergedOptions.enabled) {
        return;
      }

      const url = event.node.req.url || "/";

      if (process.env.DEBUG) {
        console.log("Incoming request path:", url);
      }

      // Serve CSS file
      if (url === cssRoute) {
        setResponseHeader(event, "Content-Type", "text/css");
        return stylesContent;
      }

      // Skip auth check for static assets
      if (url.startsWith(staticPrefix)) {
        return;
      }

      // If no password is set, show setup instructions
      if (!mergedOptions.password) {
        setResponseStatus(event, 500);
        setResponseHeader(event, "Content-Type", "text/html");
        return setupTemplate
          .replace(/\{\{cssPath\}\}/g, cssRoute)
          .replace(/\{\{siteName\}\}/g, mergedOptions.siteName);
      }

      // Handle login path first
      if (url === mergedOptions.loginPath) {
        // Handle POST request for login
        if (event.node.req.method === "POST") {
          try {
            const body = await readBody(event);
            if (body.password === mergedOptions.password) {
              // Generate JWT token
              const token = jwt.sign({}, mergedOptions.jwtSecret, {
                expiresIn: mergedOptions.cookieMaxAge,
              });

              // Set auth cookie
              setCookie(event, "staging", token, {
                maxAge: mergedOptions.cookieMaxAge / 1000,
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });

              // Get redirect URL
              const redirectUrl =
                getCookie(event, "staging_redirect") ||
                mergedOptions.redirectUrl;

              // Clear redirect cookie
              setCookie(event, "staging_redirect", "", {
                maxAge: -1,
                path: "/",
              });

              // Perform redirect
              return sendRedirect(event, redirectUrl);
            }
          } catch (err) {
            console.error("Error processing login:", err);
          }
          throw createError({
            statusCode: 401,
            message: "Invalid password",
          });
        }

        // Return login page for GET request
        return renderLoginPage(event);
      }

      // Check if route should be protected
      if (!isProtectedRoute(url, mergedOptions)) {
        if (process.env.DEBUG) {
          console.log("Route is not protected, allowing access:", url);
        }
        return;
      }

      // Verify JWT token
      const token = getCookie(event, "staging");
      if (token) {
        try {
          jwt.verify(token, mergedOptions.jwtSecret);
          return; // Valid token, continue
        } catch (err) {
          if (process.env.DEBUG) {
            console.log("Invalid token, clearing cookie");
          }
          setCookie(event, "staging", "", {
            maxAge: -1,
            path: "/",
          });
        }
      }

      // Store current URL for redirect after login
      setCookie(event, "staging_redirect", url, {
        httpOnly: true,
        maxAge: 300,
        path: "/",
      });

      // Return login page with 401 status
      return renderLoginPage(event, 401);
    } catch (error) {
      console.error("Middleware error:", error);
      throw createError({
        statusCode: 500,
        message: "Internal server error",
      });
    }
  });
};

export default stagingMiddleware;
