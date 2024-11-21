import crypto from "crypto";
import {
  defineEventHandler,
  readBody,
  setCookie,
  createError,
  H3Event,
  sendRedirect,
  setResponseHeader,
  setResponseStatus,
  parseCookies,
} from "h3";
import type { CookieOptions } from "staging";
import {
  DEFAULT_OPTIONS,
  StagingOptions,
  handleStagingProcess,
  mergeOptions,
  mergeWithEnv,
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

  return defineEventHandler(async (event: H3Event) => {
    try {
      const url = event.node.req.url || "/";
      const method = event.node.req.method || "GET";
      const cookies = parseCookies(event);

      // For login POST requests, use stored returnTo URL as originalUrl
      const originalUrl =
        method === "POST" && url === mergedOptions.loginPath
          ? cookies["staging_returnTo"] || "/"
          : url;

      // Get password from body if it's a POST request to login path
      const password =
        method === "POST" && url === mergedOptions.loginPath
          ? (await readBody(event)).password
          : undefined;

      return await handleStagingProcess({
        context: {
          url,
          method,
          password,
          cookies,
          originalUrl,
          session: {
            returnTo: cookies["staging_returnTo"],
          },
        },
        options: mergedOptions,
        staticPrefix,
        cssRoute,
        callbacks: {
          sendHtml: (html: string, statusCode: number) => {
            setResponseStatus(event, statusCode);
            setResponseHeader(event, "Content-Type", "text/html");
            return html;
          },
          sendCss: (css: string) => {
            setResponseHeader(event, "Content-Type", "text/css");
            return css;
          },
          redirect: async (redirectUrl: string) => {
            await sendRedirect(event, redirectUrl);
            return undefined;
          },
          setCookie: (name: string, value: string, options: CookieOptions) => {
            if (
              name === "staging_returnTo" &&
              value === mergedOptions.loginPath
            ) {
              // Don't store login path as return URL
              return undefined;
            }
            setCookie(event, name, value, {
              ...options,
              maxAge: options.maxAge
                ? Math.floor(options.maxAge / 1000)
                : undefined,
            });
            return undefined;
          },
          clearCookie: (name: string) => {
            setCookie(event, name, "", { maxAge: -1, path: "/" });
            return undefined;
          },
          setSessionValue: (key: string, value: string) => {
            if (key === "returnTo" && value !== mergedOptions.loginPath) {
              setCookie(event, "staging_returnTo", value, {
                httpOnly: true,
                maxAge: 300, // 5 minutes
                path: "/",
              });
            }
            return undefined;
          },
          clearSessionValue: (key: string) => {
            setCookie(event, `staging_${key}`, "", { maxAge: -1, path: "/" });
            return undefined;
          },
          next: () => undefined,
        },
      });
    } catch (error) {
      console.error("[staging] Middleware error:", error);
      const isKnownError = error instanceof Error;
      throw createError({
        statusCode:
          isKnownError && error.message === "Invalid password" ? 401 : 500,
        message: isKnownError ? error.message : "Internal server error",
      });
    }
  });
};

export default stagingMiddleware;
