import cookieParser from "cookie-parser";
import crypto from "crypto";
import type { Request, Response } from "express";
import express from "express";
import session from "express-session";
import { defineEventHandler, createError } from "h3";
import staging, { StagingOptions } from "staging";

const app = express;

const defaultOptions = {
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
  const stagingApp = app();

  stagingApp.use(app.urlencoded({ extended: true }));
  stagingApp.use(cookieParser());
  stagingApp.use(
    session({
      secret: crypto.randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  const middleware = staging({
    ...defaultOptions,
    ...options,
    publicRoutes: [
      ...defaultOptions.publicRoutes,
      ...(options.publicRoutes || []),
    ],
  });

  stagingApp.use(middleware);

  return defineEventHandler(async (event) => {
    const req = event.node.req as Request;
    const res = event.node.res as Response;

    return new Promise<void>((resolve, reject) => {
      stagingApp(req, res, (err: unknown) => {
        if (err) {
          reject(
            createError({
              statusCode: 500,
              message: "Authentication middleware error",
            }),
          );
        } else {
          resolve();
        }
      });
    });
  });
};
