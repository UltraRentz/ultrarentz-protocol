
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true
        })
      ]
    }
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  server: {
    // Temporarily removed backend proxy for standalone frontend testing
  },
});
