import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import {
  mergeWithEnv,
  mergeOptions,
  DEFAULT_OPTIONS,
  StagingOptions,
  CookieOptions,
  handleStagingProcess,
} from "staging";

export const EXPRESS_DEFAULT_OPTIONS = {
  ...DEFAULT_OPTIONS,
  siteName: "Protected Express Page",
  jwtSecret: crypto.randomBytes(32).toString("hex"),
} as const;

export default function staging(options: StagingOptions) {
  const envOptions = mergeWithEnv(EXPRESS_DEFAULT_OPTIONS);
  const mergedOptions = mergeOptions(
    EXPRESS_DEFAULT_OPTIONS,
    envOptions,
    options,
  );

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
