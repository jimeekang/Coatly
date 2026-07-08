export function resolveAuthBaseUrl({
  envUrl,
  host,
  forwardedProto,
}: {
  envUrl: string | null | undefined;
  host: string | null;
  forwardedProto: string | null;
}) {
  const resolvedHost = host ?? 'localhost:3000';
  const isLocalHost =
    resolvedHost.startsWith('localhost') ||
    resolvedHost.startsWith('127.0.0.1') ||
    resolvedHost.startsWith('[::1]');

  if (envUrl && !isLocalHost) {
    return envUrl.replace(/\/$/, '');
  }

  const protocol = isLocalHost ? 'http' : (forwardedProto ?? 'https');

  return `${protocol}://${resolvedHost}`;
}
