import cookieParser from "cookie-parser";
import crypto from "crypto";
import express, { Request, Response } from "express";
import session from "express-session";
import { defineEventHandler, createError } from "h3";
import staging from "staging";

const stagingApp = express();

stagingApp.use(express.urlencoded({ extended: true }));
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

const stagingMiddleware = staging({
  password: "demo",
  siteName: "Protected Nuxt Page",
  publicRoutes: [
    "/_nuxt/*",
    "/api/_content/*",
    "/__nuxt_error",
    "/favicon.ico",
    "/assets/*",
    "/_ipx/*",
  ],
});

stagingApp.use(stagingMiddleware);

export default defineEventHandler(async (event) => {
  // Adapt H3 req and res to Express-compatible format
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
