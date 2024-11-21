import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  mergeWithEnv,
  mergeOptions,
  DEFAULT_OPTIONS,
  StagingOptions,
  CookieOptions,
  handleStagingProcess,
} from "staging";

function generateRandomSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const NEXT_DEFAULT_OPTIONS = {
  ...DEFAULT_OPTIONS,
  siteName: "Protected Next Page",
  publicRoutes: [
    "/_next/*",
    "/static/*",
    "/images/*",
    "/favicon.ico",
    "/api/public/*",
  ] as string[],
  jwtSecret: "unset" as string,
} as const;

async function getRequestBody(
  request: NextRequest,
  loginPath: string,
): Promise<{ password?: string }> {
  // Only process body for POST requests to login path
  if (request.method !== "POST" || request.nextUrl.pathname !== loginPath) {
    return {};
  }

  const contentType = request.headers.get("content-type");

  try {
    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      return {
        password: formData.get("password")?.toString(),
      };
    }

    if (contentType?.includes("application/json")) {
      const json = (await request.json()) as { password?: string };
      return json;
    }
  } catch (error) {
    console.error("[staging] Error parsing request body:", error);
  }

  return {};
}

function convertCookieOptions(options: CookieOptions): Partial<ResponseCookie> {
  return {
    ...options,
    maxAge: options.maxAge ? Math.floor(options.maxAge / 1000) : undefined,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

function convertCookies(
  cookies: NextRequest["cookies"],
): Record<string, string> {
  const result: Record<string, string> = {};
  cookies.getAll().forEach((cookie) => {
    result[cookie.name] = cookie.value;
  });
  return result;
}

export interface StagingNextOptions extends StagingOptions {
  matcher?: string[];
}

export default function staging(options: StagingNextOptions) {
  const { matcher, ...stagingOptions } = options;

  const initializedOptions = {
    ...stagingOptions,
    jwtSecret: stagingOptions.jwtSecret || generateRandomSecret(),
  };

  const envOptions = mergeWithEnv(NEXT_DEFAULT_OPTIONS);
  const mergedOptions = mergeOptions(
    NEXT_DEFAULT_OPTIONS,
    envOptions,
    initializedOptions,
  );

  const staticPrefix = "/_staging";
  const cssRoute = `${staticPrefix}/styles.css`;

  const middleware = async (request: NextRequest) => {
    try {
      const url = request.nextUrl.pathname;
      const method = request.method;
      const cookies = convertCookies(request.cookies);

      // Get body only if necessary
      const body = await getRequestBody(request, mergedOptions.loginPath);

      // Create base response for cookie handling
      const baseResponse = NextResponse.next();

      let response: NextResponse | null = null;

      const originalUrl =
        method === "POST" && url === mergedOptions.loginPath
          ? cookies["staging_returnTo"] || "/"
          : url;

      await handleStagingProcess({
        context: {
          url,
          method,
          password: body.password,
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
            response = new NextResponse(html, {
              status: statusCode,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
              },
            });
            return html;
          },
          sendCss: (css: string) => {
            response = new NextResponse(css, {
              headers: {
                "Content-Type": "text/css",
              },
            });
            return css;
          },
          redirect: async (redirectUrl: string) => {
            const url = new URL(redirectUrl, request.url);
            if (method === "POST") {
              response = NextResponse.redirect(url, { status: 303 });
            } else {
              response = NextResponse.redirect(url);
            }
            return undefined;
          },
          setCookie: (name: string, value: string, options: CookieOptions) => {
            const cookieOptions = convertCookieOptions(options);

            baseResponse.cookies.set(name, value, cookieOptions);

            if (response) {
              response.cookies.set(name, value, cookieOptions);
            }
            return undefined;
          },
          clearCookie: (name: string) => {
            baseResponse.cookies.delete(name);
            if (response) {
              response.cookies.delete(name);
            }
            return undefined;
          },
          setSessionValue: (key: string, value: string) => {
            if (key === "returnTo" && value !== mergedOptions.loginPath) {
              const cookieOptions: Partial<ResponseCookie> = {
                httpOnly: true,
                maxAge: 300,
                path: "/",
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              };

              baseResponse.cookies.set(`staging_${key}`, value, cookieOptions);
              if (response) {
                response.cookies.set(`staging_${key}`, value, cookieOptions);
              }
            }
            return undefined;
          },
          clearSessionValue: (key: string) => {
            const cookieName = `staging_${key}`;
            baseResponse.cookies.delete(cookieName);
            if (response) {
              response.cookies.delete(cookieName);
            }
            return undefined;
          },
          next: () => {
            response = baseResponse;
            return undefined;
          },
        },
      });

      // Use response from callbacks or base response
      const finalResponse = response || baseResponse;

      // Ensure all cookies are properly set
      baseResponse.cookies.getAll().forEach((cookie) => {
        finalResponse.cookies.set(cookie.name, cookie.value, cookie);
      });

      return finalResponse;
    } catch (error) {
      console.error("[staging] Middleware error:", error);
      const isKnownError = error instanceof Error;
      return new NextResponse(
        isKnownError ? error.message : "Internal server error",
        {
          status:
            isKnownError && error.message === "Invalid password" ? 401 : 500,
        },
      );
    }
  };

  Object.defineProperty(middleware, "config", {
    value: {
      matcher: matcher || ["/((?!_next/static|_next/image|favicon.ico).*)"],
    },
  });

  return middleware;
}
