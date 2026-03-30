/**
 * Converts a route pattern like /api/v1/orgs/{orgId}/phoneSystems
 * into a RegExp that matches real URLs like /api/v1/orgs/42/phoneSystems
 */
function patternToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .split('/')
    .map(seg =>
      /^\{.+\}$/.test(seg)
        ? '[^/]+'
        : seg.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(`^${regexStr}$`);
}

/** Returns true if the request URL and method match a route's pattern and method. */
export function matchesRoute(url: string, method: string, routePattern: string, routeMethod: string): boolean {
  if (method.toUpperCase() !== routeMethod.toUpperCase()) return false;
  const urlPath = url.split('?')[0];
  return patternToRegex(routePattern).test(urlPath);
}
