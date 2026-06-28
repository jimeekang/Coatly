type AppBaseUrlOptions = {
  env?: Pick<NodeJS.ProcessEnv, 'NEXT_PUBLIC_APP_URL' | 'NEXT_PUBLIC_SITE_URL' | 'VERCEL_URL'>;
  fallback?: string;
};

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function normalizeVercelUrl(value: string): string {
  const withoutProtocol = value.trim().replace(/^https?:\/\//i, '');
  return `https://${withoutProtocol}`.replace(/\/+$/, '');
}

export function getAppBaseUrl(options: AppBaseUrlOptions = {}) {
  const env = options.env ?? process.env;
  const configuredUrl = env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl?.trim()) {
    return normalizeUrl(configuredUrl);
  }

  if (env.VERCEL_URL?.trim()) {
    return normalizeVercelUrl(env.VERCEL_URL);
  }

  return normalizeUrl(options.fallback ?? 'https://app.coatly.com.au');
}
