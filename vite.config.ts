import { defineConfig } from 'vite';

export default defineConfig({
  server: { open: true, port: 5173 },
  build: {
    target: 'es2020',
    sourcemap: true,
    // three.js alone is ~600 kB minified; it lives in its own cacheable chunk.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          peerjs: ['peerjs'],
        },
      },
    },
  },
});
