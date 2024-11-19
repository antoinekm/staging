# staging

Open-source alternative to Vercel's Password Protection feature

[![npm version](https://img.shields.io/npm/v/staging.svg)](https://www.npmjs.com/package/staging)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/staging)](https://bundlephobia.com/package/staging)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![npm downloads](https://img.shields.io/npm/dm/staging.svg)](https://www.npmjs.com/package/staging)

## Overview

Staging provides a simple, secure way to password protect your staging environments. It works seamlessly with Express and Next.js applications, offering a modern, responsive login interface.

![Staging Login Page](https://raw.githubusercontent.com/AntoineKM/staging/master/screenshots/login-preview.png)

## Features

* 🔐 Simple password protection
* 🎨 Beautiful, modern login page with light/dark mode
* ⚡️ Works with Express, Next.js and Nuxt.js
* 🎯 Flexible route protection with regex support
* 🔄 Session support for better UX
* 🌍 Environment variables configuration
* 🛡️ Secure by default
* 📱 Mobile-friendly design

## Frameworks Support

* Express & Next.js: Use this package directly
* Nuxt.js: Use [staging-nuxt](https://github.com/AntoineKM/staging/tree/master/packages/nuxt)

## Installation

```bash
npm install staging
# or
yarn add staging
```

For Nuxt.js applications, install the Nuxt-specific package instead:

```bash
npm install staging-nuxt
```

## Quick Start

### Express

```typescript
import express from 'express';
import staging from 'staging';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(staging({
  password: process.env.SITE_PASSWORD
}));
```

### Next.js

```typescript
// server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import express from 'express';
import staging from 'staging';
import cookieParser from 'cookie-parser';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();

  expressApp.use(express.urlencoded({ extended: true }));
  expressApp.use(cookieParser());
  expressApp.use(staging({
    password: process.env.SITE_PASSWORD,
    publicRoutes: ['^/(_next|static|images|favicon\\.ico|api/health)(/.*)?$']
  }));

  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      
      // Create a middleware handler
      const handler = expressApp as any;
      
      // Run the middleware stack
      handler(req, res, (err: Error) => {
        if (err) throw err;
        handle(req, res, parsedUrl);
      });
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port);
});
```

### Nuxt.js

For Nuxt.js integration, please refer to [staging-nuxt](https://github.com/AntoineKM/staging/tree/master/packages/nuxt).

## Configuration

### Options

```typescript
interface StagingOptions {
  /** Whether the protection should be enabled. Default: true. Can be set via STAGING_ENABLED env var */
  enabled?: boolean;
  
  /** The password required to access protected routes. Can be set via STAGING_PASSWORD env var */
  password?: string;

  /** Duration in milliseconds for how long the auth cookie remains valid. Default: 7 days. Can be set via STAGING_COOKIE_MAX_AGE env var (in days) */
  cookieMaxAge?: number;

  /** Secret used to sign the JWT token. Default: randomly generated. Can be set via STAGING_JWT_SECRET env var */
  jwtSecret?: string;

  /** Path for the login endpoint. Default: '/protected'. Can be set via STAGING_LOGIN_PATH env var */
  loginPath?: string;

  /** Name displayed on the login page. Default: 'Protected Page'. Can be set via STAGING_SITE_NAME env var */
  siteName?: string;

  /** Routes that should be protected. Default: all routes except loginPath. Can be set via STAGING_PROTECTED_ROUTES env var as comma-separated paths */
  protectedRoutes?: string[];

  /** Routes that should never be protected. Default: []. Can be set via STAGING_PUBLIC_ROUTES env var as comma-separated paths */
  publicRoutes?: string[];

  /** URL to redirect to after successful login. Default: the original requested URL. Can be set via STAGING_REDIRECT_URL env var */
  redirectUrl?: string;
}
```

### Environment Variables

All options can be configured via environment variables. Copy the `.env.example` file to your project and customize it:

```bash
cp .env.example .env
```

Check the [.env.example](.env.example) file for all available options and their descriptions.

### Route Protection

You can use regex patterns to protect or expose routes:

```typescript
// Protect specific paths
app.use(staging({
  password: 'your-password',
  protectedRoutes: [
    '^/admin(/.*)?$',    // Protect /admin/*
    '^/dashboard(/.*)?$' // Protect /dashboard/*
  ]
}));

// Make specific paths public
app.use(staging({
  password: 'your-password',
  publicRoutes: [
    '^/(_next|static|images)(/.*)?$', // Public assets
    '^/api/public(/.*)?$'             // Public API routes
  ]
}));
```

## Session Support (Optional)

For better UX with redirects, you can add session support:

```typescript
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret',
  resave: false,
  saveUninitialized: false
}));
```

## Security

The middleware:

* Uses secure httpOnly cookies
* Implements JWT for token validation
* Enables secure cookies in production
* Implements sameSite cookie policy
* Generates random JWT secrets by default

## License

[MIT](LICENSE)

***

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/AntoineKM">Antoine Kingue</a></sub>
</p>
