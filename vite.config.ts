/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [typescript({ tsconfig: './tsconfig.json' })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Scraper',
      fileName: (format) => `scraper.${format === 'es' ? 'js' : 'umd.js'}`
    },
    sourcemap: true,
    // Ensure ESM compatibility
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  },
})