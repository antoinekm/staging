# staging-next

Next.js integration for [staging](https://github.com/AntoineKM/staging) password protection middleware.

[![npm version](https://img.shields.io/npm/v/staging-next.svg)](https://www.npmjs.com/package/staging-next)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/staging-next)](https://bundlephobia.com/package/staging-next)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Overview

Edge Runtime compatible password protection for Next.js applications.

### Live Demo

Try out our Next.js demo (password: `demo`):
🚀 [staging-next.vercel.app](https://staging-next.vercel.app/)

## Installation

```bash
npm install staging-next
# or
yarn add staging-next
# or
pnpm add staging-next
```

## Usage

Create a middleware file in your Next.js project:

```typescript
// middleware.ts
import staging from 'staging-next';

export const middleware = staging({
  password: process.env.STAGING_PASSWORD,
  siteName: "My Protected Site"
});
```

## Features

* Edge Runtime compatible
* Native Next.js middleware integration
* Cookie-based session handling
* Custom route matcher support
* No Node.js dependencies

## Configuration

See the [main documentation](../../README.md#configuration) for base options.

### Next.js-specific Options

Additional options available for Next.js:

```typescript
interface StagingNextOptions extends StagingOptions {
  /** Custom matcher patterns for middleware */
  matcher?: string[];
}
```

### Route Matching

Configure which routes should be handled by the middleware:

```typescript
export const middleware = staging({
  password: process.env.STAGING_PASSWORD,
  matcher: [
    // Custom matcher patterns
    "/((?!_next|public|api).*)",
  ],
  publicRoutes: [
    "^/public(/.*)?$",
    "^/api/public(/.*)?$"
  ]
});
```

### Advanced Middleware Configuration

#### Combining with Custom Auth Middleware

While we recommend using [Nemo](https://nemo.rescale.build/) for a more robust authentication solution, according to [Next.js documentation about nested middleware](https://nextjs.org/docs/messages/nested-middleware), you can also combine multiple middleware functions. Here's how to combine staging protection with your own authentication middleware to handle both password protection for staging environments and user authentication:

```typescript
import { NextRequest, NextResponse } from "next/server";
import staging from "staging-next";
import { getToken } from "@/services/jwt";

// Your custom auth middleware implementation
async function authMiddleware(request: NextRequest) {
  // Add your auth logic here
  return NextResponse.redirect(new URL("/auth", request.url));
}

// Routes that require authentication
const authMiddlewareMatcher = [
  "/dashboard",
  "/settings",
  "/checkout",
];

// Configure staging middleware
const stagingMiddleware = staging({
  siteName: "My Protected Site",
});

// Combined middleware function
export function middleware(request: NextRequest) {
  if (authMiddlewareMatcher.some((path) => 
    request.nextUrl.pathname.startsWith(path)
  )) {
    return authMiddleware(request);
  }
  return stagingMiddleware(request);
}
```

### Example

A complete working example is available in our repository:

* [Next.js Example](https://github.com/AntoineKM/staging/tree/master/examples/next)

## License

[MIT](https://github.com/AntoineKM/staging/blob/master/LICENSE)
