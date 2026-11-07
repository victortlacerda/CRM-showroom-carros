import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run dev`   → servidor de desenvolvimento
// `npm run build` → pasta dist/ com UM único arquivo index.html (abre com duplo clique, sem servidor)
export default defineConfig({
  plugins: [viteSingleFile()],
  server: { port: 5173, open: true },
  build: { chunkSizeWarningLimit: 1500 },
});
