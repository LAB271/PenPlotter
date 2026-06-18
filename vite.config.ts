import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The gateway daemon writes runtime files (e.g. the persisted position) into
    // the project ~every 2 s. Don't let that hot-reload the dev UI — it would drop
    // the WebSocket and reconnect in a loop.
    watch: { ignored: ['**/gateway/.plotter-state.json', '**/.plotter-state.json'] },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});

