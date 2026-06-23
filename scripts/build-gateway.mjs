// Bundle the gateway daemon (gateway/server.ts + its src/ imports) into a single
// dist-gateway/gateway.js so the packaged daemon runs on plain Node with no `tsx`
// at runtime. `serialport` (native binding) and `ws` stay external — they're
// resolved from the shipped node_modules at runtime, not bundled.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

await build({
  entryPoints: ['gateway/server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20', // current Node LTS line (matches the bundled runtime)
  outfile: 'dist-gateway/gateway.js',
  external: ['serialport', 'ws'],
  // Bake the version in (package.json is not shipped in the package).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'info',
});
