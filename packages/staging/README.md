# staging

Free and open-source alternative to Vercel's Password Protection and Netlify's Password Protection for Non-Production Deploys - protect your staging environments without enterprise or pro plan requirements.

[![npm version](https://img.shields.io/npm/v/staging.svg)](https://www.npmjs.com/package/staging)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/staging)](https://bundlephobia.com/package/staging)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![npm downloads](https://img.shields.io/npm/dm/staging.svg)](https://www.npmjs.com/package/staging)

## Overview

Staging provides a simple, secure way to password protect your staging environments - for free. While Vercel's Password Protection requires an Enterprise plan and Netlify's protection requires a Pro plan, `staging` offers the same core functionality as an open-source solution. It works seamlessly with Express, Next.js and Nuxt.js applications, offering a modern, responsive login interface.

### Why Staging?

* 🆓 **Free and Open Source**: No enterprise or pro plans required
* 🔄 **Environment-based Protection**: Easily protect preview/staging environments using platform environment variables (`VERCEL_ENV`, `NETLIFY_ENV`, or your own)
* 🌐 **Framework Agnostic**: Works with Next.js, Nuxt.js, and Express.js out of the box
* ⚡️ **Edge Compatible**: Optimized for Edge Runtime in Next.js
* 🛠️ **Simple Setup**: Get running in minutes with just a few lines of code
* 💰 **Cost Effective**: Save hundreds of dollars per month compared to platform-specific solutions

https://github.com/user-attachments/assets/c9369415-bc26-41e3-88c8-2de7a72e14c5

### Live Demos

Try out our demo sites (password: `demo`):

* 🚀 Next.js Demo: [staging-next.vercel.app](https://staging-next.vercel.app/)
* ⚡️ Nuxt.js Demo: [staging-nuxt.vercel.app](https://staging-nuxt.vercel.app/)

## Features

* 🔐 Simple password protection
* 🎨 Beautiful, modern login page with light/dark mode
* ⚡️ Works with Express, Next.js and Nuxt.js
* 🎯 Flexible route protection with regex support
* 🔄 Session support for better UX
* 🌍 Environment variables configuration
* 🛡️ Secure by default
* 📱 Mobile-friendly design

## Protecting Platform Deployments

### Vercel Preview Deployments

```typescript
// Next.js example (middleware.ts)
import staging from 'staging-next';

export const middleware = staging({
  // Only enable password protection on preview deployments
  enabled: process.env.VERCEL_ENV === 'preview',
  password: process.env.STAGING_PASSWORD,
  siteName: "Preview Site"
});
```

### Netlify Deploy Previews and Branch Deploys

```typescript
// Next.js example (middleware.ts)
import staging from 'staging-next';

export const middleware = staging({
  // Protect deploy previews and branch deploys
  enabled: ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT),
  password: process.env.STAGING_PASSWORD,
  siteName: "Preview Site"
});
```

### Custom Environment Protection

You can protect specific environments based on your needs:

```typescript
const isProtectedEnvironment = 
  process.env.VERCEL_ENV === 'preview' ||     // Vercel preview deployments
  process.env.CONTEXT === 'deploy-preview' ||  // Netlify deploy previews
  process.env.NODE_ENV === 'staging' ||       // Staging environment
  process.env.PROTECT_ENV === 'true';         // Custom protection flag

export const middleware = staging({
  enabled: isProtectedEnvironment,
  password: process.env.STAGING_PASSWORD
});
```

## Framework Support

Each framework has its own package with specific optimizations and implementations:

* Express.js: [`staging-express`](packages/express/README.md)
* Next.js: [`staging-next`](packages/next/README.md)
* Nuxt.js: [`staging-nuxt`](packages/nuxt/README.md)

## Installation

Choose and install the package for your framework:

```bash
# For Express.js
npm install staging-express
# or
yarn add staging-express
# or
pnpm add staging-express

# For Next.js
npm install staging-next
# or
yarn add staging-next
# or
pnpm add staging-next

# For Nuxt.js
npm install staging-nuxt
# or
yarn add staging-nuxt
# or
pnpm add staging-nuxt
```

## Quick Start

### Express.js

```typescript
import express from 'express';
import staging from 'staging-express';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(staging({
  password: process.env.STAGING_PASSWORD
}));
```

For more Express.js specific features, check out the [Express.js docs](packages/express/README.md).

### Next.js

```typescript
// middleware.ts
import staging from 'staging-next';

export const middleware = staging({
  password: process.env.STAGING_PASSWORD
});
```

For Edge Runtime optimizations and Next.js specific features, check out the [Next.js docs](packages/next/README.md).

### Nuxt.js

```typescript
// server/middleware/staging.ts
import staging from "staging-nuxt";

export default staging({
  password: process.env.STAGING_PASSWORD
});
```

For Nuxt-specific features and H3 integration, check out the [Nuxt.js docs](packages/nuxt/README.md).

## Configuration

### Options

All frameworks support these base options:

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

Each framework may provide additional options. See their respective documentation for details.

### Environment Variables

All options can be configured via environment variables:

To generate secure secrets for your environment, you can use:

```bash
# Generate a secure JWT secret
openssl rand -base64 32
# or
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

Then set your environment variables:

```env
# Required
STAGING_PASSWORD=your-password

# Optional
STAGING_ENABLED=true
STAGING_JWT_SECRET=your-jwt-secret
STAGING_COOKIE_MAX_AGE=7 # days
STAGING_LOGIN_PATH=/protected
STAGING_SITE_NAME="Protected Page"
STAGING_PROTECTED_ROUTES=/admin/*,/dashboard/*
STAGING_PUBLIC_ROUTES=/api/public/*,/static/*
STAGING_REDIRECT_URL=/
```

### Route Protection

You can use regex patterns to protect or expose routes:

```typescript
{
  // Protect specific paths
  protectedRoutes: [
    '^/admin(/.*)?$',    // Protect /admin/*
    '^/dashboard(/.*)?$' // Protect /dashboard/*
  ],

  // Make specific paths public
  publicRoutes: [
    '^/(_next|static|images)(/.*)?$', // Public assets
    '^/api/public(/.*)?$'             // Public API routes
  ]
}
```

## Security

The middleware:

* Uses secure httpOnly cookies
* Implements JWT for token validation
* Enables secure cookies in production
* Implements sameSite cookie policy
* Generates random JWT secrets by default

## Examples

Full examples for each framework are available in the repository:

* [Express.js Example](examples/express)
* [Next.js Example](examples/next)
* [Nuxt.js Example](examples/nuxt)

## Framework-specific Features

Each framework implementation has its own optimizations and features:

* **Express.js** ([docs](packages/express/README.md))
  * Session support
  * Express middleware integration
  * Node.js optimized

* **Next.js** ([docs](packages/next/README.md))
  * Edge Runtime compatible
  * Next.js middleware
  * Cookie-based session handling

* **Nuxt.js** ([docs](packages/nuxt/README.md))
  * H3 integration
  * Nuxt-specific route handling
  * Cookie-based session handling

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

[MIT](LICENSE)

***

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/AntoineKM">Antoine Kingue</a></sub>
</p>
