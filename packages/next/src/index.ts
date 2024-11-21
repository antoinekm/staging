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
): Promise<{ password?: string }> {
  try {
    const formData = await request.formData();
    return {
      password: formData.get("password")?.toString(),
    };
  } catch {
    try {
      const json = (await request.json()) as { password?: string };
      return json;
    } catch {
      return {};
    }
  }
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

export default function staging(options: StagingNextOptions = {}) {
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

      const body =
        method === "POST" && url === mergedOptions.loginPath
          ? await getRequestBody(request)
          : {};

      const originalUrl =
        method === "POST" && url === mergedOptions.loginPath
          ? cookies["staging_returnTo"] || "/"
          : url;

      let response: NextResponse | null = null;

      // Create a base response for cookie handling
      const baseResponse = NextResponse.next();

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
                "Content-Type": "text/html",
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
            response = NextResponse.redirect(url, {
              // 307 preserves the request method and body
              status: 307,
              headers: baseResponse.headers,
            });
            return undefined;
          },
          setCookie: (name: string, value: string, options: CookieOptions) => {
            // Always set cookies on the base response first
            baseResponse.cookies.set(name, value, {
              ...options,
              maxAge: options.maxAge
                ? Math.floor(options.maxAge / 1000)
                : undefined,
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });

            // If we have a response, set it there too
            if (response) {
              response.cookies.set(name, value, {
                ...options,
                maxAge: options.maxAge
                  ? Math.floor(options.maxAge / 1000)
                  : undefined,
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });
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
              baseResponse.cookies.set("staging_returnTo", value, {
                httpOnly: true,
                maxAge: 300,
                path: "/",
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });
              if (response) {
                response.cookies.set("staging_returnTo", value, {
                  httpOnly: true,
                  maxAge: 300,
                  path: "/",
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                });
              }
            }
            return undefined;
          },
          clearSessionValue: (key: string) => {
            baseResponse.cookies.delete(`staging_${key}`);
            if (response) {
              response.cookies.delete(`staging_${key}`);
            }
            return undefined;
          },
          next: () => {
            response = baseResponse;
            return undefined;
          },
        },
      });

      // Copy cookies from baseResponse to final response if they exist
      const finalResponse = response || baseResponse;
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
