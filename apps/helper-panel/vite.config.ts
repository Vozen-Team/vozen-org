import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Production serves the Helper as an isolated application within vozen.org.
  // Keep asset URLs stable while clean /panel/... entries serve the same application.
  base: command === 'serve' ? '/' : '/panel/helper-tracker/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
}));
