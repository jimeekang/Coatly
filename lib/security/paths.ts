const INTERNAL_ORIGIN = 'https://coatly.local';

function hasAllowedPrefix(pathname: string, allowedPrefixes?: readonly string[]) {
  if (!allowedPrefixes || allowedPrefixes.length === 0) {
    return true;
  }

  return allowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveSafeInternalPath(
  value: unknown,
  fallback: string,
  allowedPrefixes?: readonly string[]
) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, INTERNAL_ORIGIN);

    if (url.origin !== INTERNAL_ORIGIN) {
      return fallback;
    }

    if (!hasAllowedPrefix(url.pathname, allowedPrefixes)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
