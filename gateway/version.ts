import { readFileSync } from 'node:fs';

/**
 * The installed application version, reported by the daemon (so clients can show
 * what's running and whether an update exists).
 *
 * In the packaged build `__APP_VERSION__` is replaced at bundle time by esbuild's
 * `define`, so the version is baked in and the fallback below is tree-shaken away
 * (package.json is not shipped in the .deb). In dev (`tsx`, no define) the
 * fallback reads package.json from the source tree.
 */
declare const __APP_VERSION__: string | undefined;

function readPkgVersion(): string {
  const url = new URL('../package.json', import.meta.url);
  return (JSON.parse(readFileSync(url, 'utf8')) as { version: string }).version;
}

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : readPkgVersion();
