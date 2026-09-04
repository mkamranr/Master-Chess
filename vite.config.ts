import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The Stockfish build we ship is the *lite single-threaded* flavour, which
  // deliberately needs no cross-origin isolation. Do not add COOP/COEP headers
  // here: they are only required by the multi-threaded builds we avoid.
  worker: { format: 'es' },
})
