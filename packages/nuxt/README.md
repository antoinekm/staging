# staging-nuxt

Nuxt.js integration for [staging](https://github.com/AntoineKM/staging) password protection middleware.

[![npm version](https://img.shields.io/npm/v/staging-nuxt.svg)](https://www.npmjs.com/package/staging-nuxt)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/staging-nuxt)](https://bundlephobia.com/package/staging-nuxt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Overview

For full documentation and features, please refer to the [main staging documentation](../../README.md).

This package provides Nuxt.js integration for the staging password protection middleware.

## Installation

```bash
npm install staging-nuxt
# or
yarn add staging-nuxt
# or
pnpm add staging-nuxt
```

## Usage

Create a server middleware file in your Nuxt.js project:

```typescript
// server/middleware/staging.ts
import { stagingMiddleware } from "staging-nuxt";

export default stagingMiddleware({
  password: process.env.STAGING_PASSWORD || "your-password",
});
```

## Nuxt.js Specific Defaults

The middleware comes with Nuxt.js-specific public routes:

```typescript
const defaultOptions = {
  siteName: "Protected Nuxt Page",
  publicRoutes: [
    "/_nuxt/*",
    "/api/_content/*",
    "/__nuxt_error",
    "/favicon.ico",
    "/assets/*",
    "/_ipx/*",
  ]
};
```

You can add additional public or protected routes while keeping these defaults:

```typescript
export default stagingMiddleware({
  password: process.env.STAGING_PASSWORD,
  publicRoutes: [
    "^/public(/.*)?$",
    "^/api/public(/.*)?$"
  ] // These will be merged with default public routes
});
```

## License

[MIT](../../LICENSE)

***

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/AntoineKM">Antoine Kingue</a></sub>
</p>
