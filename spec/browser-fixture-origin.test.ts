import { afterEach, describe, expect, it, vi } from 'vitest';
import { boardFixtureOrigin } from '../tests/e2e/board-journey.ts';

const live = 'https://comp4020-final-naaeeen.fly.dev';
const approval = 'comp4020-final-naaeeen';
afterEach(() => vi.unstubAllEnvs());

describe('board browser fixture origin authorization', () => {
  it('retains the loopback default without live authorization', () => {
    vi.stubEnv('AUTHORIZED_LIVE_BOARD_TESTS', undefined);
    expect(boardFixtureOrigin(undefined)).toBe('http://127.0.0.1:4088');
    expect(boardFixtureOrigin('http://localhost:8080')).toBe('http://localhost:8080');
    expect(boardFixtureOrigin('https://127.0.0.1:4099')).toBe('https://127.0.0.1:4099');
  });

  it('rejects the live origin by default', () => {
    vi.stubEnv('AUTHORIZED_LIVE_BOARD_TESTS', undefined);
    expect(() => boardFixtureOrigin(live)).toThrow();
  });

  it('accepts only the explicit approved live origin opt-in', () => {
    vi.stubEnv('AUTHORIZED_LIVE_BOARD_TESTS', approval);
    expect(boardFixtureOrigin(live)).toBe(live);
    expect(boardFixtureOrigin(live + '/')).toBe(live + '/');
  });

  it.each(['', 'true', '1', 'foreign-app', 'comp4020-final-naaeeen ', 'COMP4020-FINAL-NAAEEEN'])
  ('rejects a wrong opt-in value %j', value => {
    vi.stubEnv('AUTHORIZED_LIVE_BOARD_TESTS', value);
    expect(() => boardFixtureOrigin(live)).toThrow();
  });

  it.each([
    'https://example.com',
    'https://comp4020-final-naaeeen.fly.dev.example.com',
    'https://comp4020-final-naaeeen.fly.dev.',
    'http://comp4020-final-naaeeen.fly.dev',
    'https://comp4020-final-naaeeen.fly.dev:444',
    'ftp://comp4020-final-naaeeen.fly.dev',
    'https://user@comp4020-final-naaeeen.fly.dev',
    'https://user:password@comp4020-final-naaeeen.fly.dev',
    'https://comp4020-final-naaeeen.fly.dev/board/',
    'https://comp4020-final-naaeeen.fly.dev/?token=value',
    'https://comp4020-final-naaeeen.fly.dev/#fragment',
  ])('rejects an unapproved live URL %j', value => {
    vi.stubEnv('AUTHORIZED_LIVE_BOARD_TESTS', approval);
    expect(() => boardFixtureOrigin(value)).toThrow();
  });

  it.each(['ftp://localhost:8080', 'http://user@127.0.0.1:4088', 'not a URL'])
  ('rejects malformed, credential-bearing or non-web loopback input %j', value => {
    vi.stubEnv('AUTHORIZED_LIVE_BOARD_TESTS', undefined);
    expect(() => boardFixtureOrigin(value)).toThrow();
  });
});
