import { StagingOptions } from "../types";

export const normalizePath = (path: string): string => {
  return "/" + path.replace(/^\/+|\/+$/g, "");
};

export const createRegexFromPattern = (pattern: string): RegExp => {
  try {
    pattern = normalizePath(pattern);

    if (!/[*?{}()\[\]\\]/.test(pattern)) {
      return new RegExp(`^${pattern}$`);
    }

    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]");

    if (regexPattern.endsWith(".*")) {
      regexPattern = regexPattern.slice(0, -2) + "(?:/.*)?";
    }

    return new RegExp(`^${regexPattern}$`);
  } catch (err) {
    console.error("Error creating regex from pattern:", pattern, err);
    return new RegExp("^$");
  }
};

export const isRouteMatch = (path: string, patterns: string[]): boolean => {
  const normalizedPath = normalizePath(path);

  return patterns.some((pattern) => {
    try {
      const regex = createRegexFromPattern(pattern);
      const isMatch = regex.test(normalizedPath);

      if (process.env.DEBUG) {
        console.log(
          `Testing path: ${normalizedPath} against pattern: ${pattern} (${regex}) = ${isMatch}`,
        );
      }

      return isMatch;
    } catch (err) {
      console.error("Error matching route:", path, pattern, err);
      return false;
    }
  });
};

export const isProtectedRoute = (
  path: string,
  options: Required<StagingOptions>,
): boolean => {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === options.loginPath) {
    return false;
  }

  if (isRouteMatch(normalizedPath, options.publicRoutes)) {
    return false;
  }

  if (options.protectedRoutes.length > 0) {
    return isRouteMatch(normalizedPath, options.protectedRoutes);
  }

  return true;
};

export const normalizeRoute = (route: string): string => {
  if (route.endsWith("/")) {
    return route + "**";
  }
  if (route.includes("/api/")) {
    return route.endsWith("*") ? route : route + "/*";
  }
  return route;
};
