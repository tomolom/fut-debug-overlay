import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'extension/*',
          dest: '.',
        },
      ],
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'FUTDebugOverlay',
      formats: ['iife'],
      fileName: () => 'js/main.js',
    },
    outDir: 'dist',
    minify: false,
    target: 'esnext',
    cssCodeSplit: false,
  },
});
