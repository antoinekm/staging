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

  // Create reusable callbacks object
  const createCallbacks = (event: H3Event) => ({
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
      setCookie(event, name, value, {
        ...options,
        maxAge: options.maxAge ? Math.floor(options.maxAge / 1000) : undefined,
      });
      return undefined;
    },
    clearCookie: (name: string) => {
      setCookie(event, name, "", { maxAge: -1, path: "/" });
      return undefined;
    },
    setSessionValue: (key: string, value: string) => {
      setCookie(event, `staging_${key}`, value, {
        httpOnly: true,
        maxAge: 300,
        path: "/",
      });
      return undefined;
    },
    clearSessionValue: (key: string) => {
      setCookie(event, `staging_${key}`, "", { maxAge: -1, path: "/" });
      return undefined;
    },
    next: () => undefined,
  });

  return defineEventHandler(async (event: H3Event) => {
    try {
      const url = event.node.req.url || "/";
      const method = event.node.req.method || "GET";
      const callbacks = createCallbacks(event);

      // Create base context
      const baseContext = {
        url,
        method,
        cookies: parseCookies(event),
        originalUrl: url,
      };

      // Handle POST to login path
      if (method === "POST" && url === mergedOptions.loginPath) {
        const body = await readBody(event);
        return await handleStagingProcess({
          context: {
            ...baseContext,
            password: body.password,
          },
          options: mergedOptions,
          staticPrefix,
          cssRoute,
          callbacks,
        });
      }

      // Handle all other requests
      return await handleStagingProcess({
        context: baseContext,
        options: mergedOptions,
        staticPrefix,
        cssRoute,
        callbacks,
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
