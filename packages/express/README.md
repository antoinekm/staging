# staging-express

Express.js integration for [staging](https://github.com/AntoineKM/staging) password protection middleware.

[![npm version](https://img.shields.io/npm/v/staging-express.svg)](https://www.npmjs.com/package/staging-express)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/staging-express)](https://bundlephobia.com/package/staging-express)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Installation

```bash
npm install staging-express
# or
yarn add staging-express
# or
pnpm add staging-express
```

## Usage

```typescript
import express from 'express';
import staging from 'staging-express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();

// Required middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Optional: Session support for better UX
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret',
  resave: false,
  saveUninitialized: false
}));

// Add password protection
app.use(staging({
  password: process.env.STAGING_PASSWORD,
  siteName: "My Protected Site"
}));
```

## Features

* Full Express.js middleware integration
* Session support
* Built-in cookie handling
* Custom Node.js optimizations

## Configuration

See the [main documentation](../../README.md#configuration) for base options.

### Session Support

For better UX with redirects, add session support:

```typescript
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));
```

### Example

A complete working example is available in our repository:

* [Express Example](https://github.com/AntoineKM/staging/tree/master/examples/express)

## License

[MIT](https://github.com/AntoineKM/staging/blob/master/LICENSE)
