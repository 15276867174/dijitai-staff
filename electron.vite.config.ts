import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['electron', 'electron-store', 'tesseract.js', 'sharp']
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: resolve(__dirname, 'dist/renderer')
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [vue()]
  }
})
