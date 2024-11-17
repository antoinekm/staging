# staging

Open-source alternative to Vercel's Password Protection feature

## Features

* 🔐 Simple password protection
* 🎨 Beautiful, modern login page with light/dark mode
* ⚡️ Works with Express and Next.js
* 🎯 Flexible route protection with regex support
* 🔄 Session support for better UX
* 🌍 Environment variables configuration
* 🛡️ Secure by default
* 📱 Mobile-friendly design

## Installation

```bash
npm install staging
# or
yarn add staging
```

## Quick Start

### Express

```typescript
import express from 'express';
import { staging } from 'staging';
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
import { staging } from 'staging';
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

## Configuration

### Options

```typescript
interface StagingOptions {
  /** Required password for accessing protected routes */
  password?: string;
  
  /** Cookie max age in milliseconds. Default: 7 days */
  cookieMaxAge?: number;
  
  /** JWT secret for signing cookies. Default: random */
  jwtSecret?: string;
  
  /** Login page path. Default: '/protected' */
  loginPath?: string;
  
  /** Site name shown on login page. Default: 'Protected Page' */
  siteName?: string;
  
  /** Routes that should be protected (regex supported) */
  protectedRoutes?: string[];
  
  /** Routes that should be public (regex supported) */
  publicRoutes?: string[];
  
  /** URL to redirect to after login. Default: original URL */
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

MIT
