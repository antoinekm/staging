import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { StagingOptions } from './types';

const getEnvValue = (key: string): string | undefined => {
  const envKey = `STAGING_${key.toUpperCase()}`;
  return process.env[envKey];
};

const getEnvArray = (key: string): string[] => {
  const value = getEnvValue(key);
  return value ? value.split(',').map(route => route.trim()) : [];
};

const getEnvNumber = (key: string): number | undefined => {
  const value = getEnvValue(key);
  return value ? parseInt(value, 10) : undefined;
};

const defaultOptions = {
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  jwtSecret: crypto.randomBytes(64).toString('hex'),
  loginPath: '/protected',
  siteName: 'Protected Page',
  protectedRoutes: [] as string[],
  publicRoutes: [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ] as string[],
  redirectUrl: '/',
} as const;

const mergeWithEnv = (defaults: typeof defaultOptions) => {
  return {
    cookieMaxAge: getEnvNumber('COOKIE_MAX_AGE') ?? defaults.cookieMaxAge,
    jwtSecret: getEnvValue('JWT_SECRET') ?? defaults.jwtSecret,
    loginPath: getEnvValue('LOGIN_PATH') ?? defaults.loginPath,
    siteName: getEnvValue('SITE_NAME') ?? defaults.siteName,
    protectedRoutes: getEnvArray('PROTECTED_ROUTES'),
    publicRoutes: getEnvArray('PUBLIC_ROUTES'),
    redirectUrl: getEnvValue('REDIRECT_URL') ?? defaults.redirectUrl,
  };
};

const createRegexFromPattern = (pattern: string): RegExp => {
  // If it's already a Next.js-style pattern, return as is
  if (pattern.startsWith('/((?!')) {
    return new RegExp(pattern);
  }

  // Convert glob-style pattern to regex
  // Replace common glob patterns with regex equivalents
  const regexPattern = pattern
    // Handle path wildcards (e.g., /api/.*)
    .replace(/\.\*/g, '.*')
    // Handle single wildcards (e.g., /api/?)
    .replace(/\?/g, '.')
    // Escape other special regex characters
    .replace(/[|{}()[\]^$+\\]/g, '\\$&');

  return new RegExp(`^${regexPattern}$`);
};

const isRouteMatch = (path: string, patterns: string[]): boolean => {
  // Convert patterns to RegExp objects only once
  const regexPatterns = patterns.map(pattern => createRegexFromPattern(pattern));
  
  // Check if the path matches any of the patterns
  return regexPatterns.some(regex => regex.test(path));
};

const isProtectedRoute = (path: string, options: Required<StagingOptions>): boolean => {
  // First check if it matches any public routes
  if (isRouteMatch(path, options.publicRoutes)) {
    return false;
  }

  // Always allow access to the login page
  if (path === options.loginPath) {
    return false;
  }

  // If protected routes are specified, check if path matches any
  if (options.protectedRoutes.length > 0) {
    return isRouteMatch(path, options.protectedRoutes);
  }

  // If no protected routes specified, protect everything (except public routes)
  return true;
};

export function staging(options: StagingOptions = {}) {
  const password = options.password || getEnvValue('PASSWORD');
  
  const envOptions = mergeWithEnv(defaultOptions);
  const mergedOptions: Required<StagingOptions> = {
    ...defaultOptions,
    ...envOptions,
    ...options,
    password: password || '',
  };
  
  // Read and cache the templates and CSS
  const templatePath = path.join(__dirname, 'template.html');
  const setupPath = path.join(__dirname, 'setup.html');
  const cssPath = path.join(__dirname, 'styles.css');
  
  // Cache the file contents
  const template = fs.readFileSync(templatePath, 'utf-8');
  const setupTemplate = fs.readFileSync(setupPath, 'utf-8');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  
  // Define static routes
  const staticPrefix = '/_staging';
  const cssRoute = `${staticPrefix}/styles.css`;

  return (req: Request, res: Response, next: NextFunction) => {
    // Serve the CSS file
    if (req.path === cssRoute) {
      res.type('text/css').send(cssContent);
      return;
    }

    // Skip auth check for static assets
    if (req.path.startsWith(staticPrefix)) {
      return next();
    }

    // If no password is set, show setup instructions
    if (!password) {
      const setupHtml = setupTemplate.replace(
        /\{\{cssPath\}\}/g,
        cssRoute
      );
      return res.status(500).send(setupHtml);
    }

    // Store original URL for redirect after login
    const originalUrl = req.originalUrl || '/';
    
    // Check if the request is for the login page
    if (req.path === mergedOptions.loginPath) {
      if (req.method === 'POST') {
        if (req.body.password === password) {
          const token = jwt.sign({}, mergedOptions.jwtSecret, { expiresIn: mergedOptions.cookieMaxAge });
          res.cookie('staging', token, { 
            maxAge: mergedOptions.cookieMaxAge, 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
          
          // Redirect to the original URL or configured redirect URL
          let redirectTo = mergedOptions.redirectUrl;
          
          // If we have a stored return URL in the session, use that
          if (req.session?.returnTo) {
            redirectTo = req.session.returnTo;
            // Clear the stored URL after use
            delete req.session.returnTo;
          } else {
            // If no stored URL, use the original URL
            redirectTo = originalUrl;
          }
          
          return res.redirect(redirectTo);
        } else {
          return res.status(401).send('Invalid password');
        }
      }
      return next();
    }

    // Check if this route should be protected
    if (!isProtectedRoute(req.path, mergedOptions)) {
      return next();
    }

    // Check for valid JWT token in cookie
    const token = req.cookies.staging;
    if (token) {
      try {
        jwt.verify(token, mergedOptions.jwtSecret);
        return next();
      } catch (err) {
        res.clearCookie('staging');
      }
    }

    // Store return URL in session if available
    if (req.session) {
      req.session.returnTo = originalUrl;
    }

    // If no valid token, render login page with replacements
    const html = template
      .replace(/\{\{siteName\}\}/g, mergedOptions.siteName)
      .replace(/\{\{loginPath\}\}/g, mergedOptions.loginPath)
      .replace(/\{\{cssPath\}\}/g, cssRoute);

    res.status(401).send(html);
  };
}
