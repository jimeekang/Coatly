import { describe, expect, it } from 'vitest';
import { resolveSafeInternalPath } from '@/lib/security/paths';

describe('resolveSafeInternalPath', () => {
  it('keeps normal internal paths with query strings', () => {
    expect(resolveSafeInternalPath('/settings?tab=billing', '/settings')).toBe(
      '/settings?tab=billing'
    );
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(resolveSafeInternalPath('https://evil.example', '/settings')).toBe(
      '/settings'
    );
    expect(resolveSafeInternalPath('//evil.example/path', '/settings')).toBe(
      '/settings'
    );
  });

  it('rejects backslash URL confusion and control characters', () => {
    expect(resolveSafeInternalPath('/\\evil.example', '/settings')).toBe(
      '/settings'
    );
    expect(resolveSafeInternalPath('/settings\nSet-Cookie:x=y', '/settings')).toBe(
      '/settings'
    );
  });

  it('enforces allowed route prefixes', () => {
    expect(resolveSafeInternalPath('/settings/profile', '/settings', ['/settings'])).toBe(
      '/settings/profile'
    );
    expect(resolveSafeInternalPath('/dashboard', '/settings', ['/settings'])).toBe(
      '/settings'
    );
  });
});
