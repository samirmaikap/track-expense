import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // On GitHub Actions GITHUB_ACTIONS=true is automatically set; locally base stays '/'
  base: process.env.GITHUB_ACTIONS ? '/track-expense/' : '/',
})
