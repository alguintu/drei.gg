// Builds the desk's editor (app/) into dist/, served by scripts/desk.mjs under /__desk/.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default {
  root: here('./app'),
  base: '/__desk/',
  plugins: [react()],
  // A local tool loaded from disk; one bundle is fine.
  build: { outDir: here('./dist'), emptyOutDir: true, chunkSizeWarningLimit: 2000 },
};
