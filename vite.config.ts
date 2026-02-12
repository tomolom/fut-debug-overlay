import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'extension/*',
          dest: '.',
        },
        {
          src: 'src/devtools/panel.html',
          dest: '.',
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.ts'),
        devtools: resolve(__dirname, 'src/devtools/devtools.ts'),
        panel: resolve(__dirname, 'src/devtools/panel.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main') {
            return 'js/[name].js';
          }
          return '[name].js';
        },
        format: 'es',
      },
    },
    outDir: 'dist',
    minify: false,
    target: 'esnext',
    cssCodeSplit: false,
  },
});
