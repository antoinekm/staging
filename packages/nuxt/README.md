# staging-nuxt

Nuxt.js integration for [staging](https://github.com/AntoineKM/staging) password protection middleware.

[![npm version](https://img.shields.io/npm/v/staging-nuxt.svg)](https://www.npmjs.com/package/staging-nuxt)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/staging-nuxt)](https://bundlephobia.com/package/staging-nuxt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

### Live Demo

Try out our Nuxt.js demo (password: `demo`):
⚡️ [staging-nuxt.vercel.app](https://staging-nuxt.vercel.app/)

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
import staging from 'staging-nuxt';

export default staging({
  password: process.env.STAGING_PASSWORD,
  siteName: "My Protected Site"
});
```

## Features

* Native Nuxt.js middleware integration
* Built-in H3 support
* Cookie-based session handling
* Nitro compatibility

## Configuration

See the [main documentation](../../README.md#configuration) for base options.

### Nuxt-specific Options

Additional options available for Nuxt:

```typescript
interface StagingNuxtOptions extends StagingOptions {
  // Future Nuxt-specific options will be added here
}
```

### Default Configuration

The middleware comes with Nuxt-specific defaults:

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
export default staging({
  password: process.env.STAGING_PASSWORD,
  publicRoutes: [
    "^/public(/.*)?$",
    "^/api/public(/.*)?$"
  ] // These will be merged with default public routes
});
```

### Example

A complete working example is available in our repository:

* [Nuxt.js Example](https://github.com/AntoineKM/staging/tree/master/examples/nuxt)

## License

[MIT](https://github.com/AntoineKM/staging/blob/master/LICENSE)
