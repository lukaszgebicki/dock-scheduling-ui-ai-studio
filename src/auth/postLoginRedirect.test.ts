import { describe, it, expect } from 'vitest';
import { getSafePostLoginPath } from './postLoginRedirect';

describe('getSafePostLoginPath', () => {
  it('returns valid local path', () => {
    expect(getSafePostLoginPath({ from: '/deliveries' })).toBe('/deliveries');
    expect(getSafePostLoginPath({ from: '/dock/123' })).toBe('/dock/123');
  });

  it('returns / when state is null or missing', () => {
    expect(getSafePostLoginPath(null)).toBe('/');
    expect(getSafePostLoginPath(undefined)).toBe('/');
    expect(getSafePostLoginPath({})).toBe('/');
  });

  it('returns / when from is not a string or empty', () => {
    expect(getSafePostLoginPath({ from: 123 })).toBe('/');
    expect(getSafePostLoginPath({ from: true })).toBe('/');
    expect(getSafePostLoginPath({ from: '' })).toBe('/');
  });

  it('returns / when from is /login', () => {
    expect(getSafePostLoginPath({ from: '/login' })).toBe('/');
  });

  it('returns / when from has protocol relative slashes or scheme', () => {
    expect(getSafePostLoginPath({ from: '//evil.example' })).toBe('/');
    expect(getSafePostLoginPath({ from: 'https://evil.example' })).toBe('/');
    expect(getSafePostLoginPath({ from: 'javascript:alert(1)' })).toBe('/');
    expect(getSafePostLoginPath({ from: 'data:text/html,test' })).toBe('/');
  });

  it('returns / when from has query or hash', () => {
    expect(getSafePostLoginPath({ from: '/target?token=secret' })).toBe('/');
    expect(getSafePostLoginPath({ from: '/target#secret' })).toBe('/');
  });
});
