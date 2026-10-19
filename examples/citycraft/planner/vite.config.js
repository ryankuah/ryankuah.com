import { defineConfig } from 'vite';

export default defineConfig({
  base: '/minecraft/citycraft/planner/',
  build: { outDir: '../../../public/minecraft/citycraft/planner', emptyOutDir: true },
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
