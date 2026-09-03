import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the static build runs from any path — GitHub Pages
  // project sites, a subfolder, or file:// — without a rebuild.
  base: './',
  plugins: [react()],
})
