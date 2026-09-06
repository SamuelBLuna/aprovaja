import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: troque 'aprovaja' pelo nome exato do seu repositório no GitHub
// Ex: se o repo é github.com/seu-usuario/aprovaja-app, use base: '/aprovaja-app/'
export default defineConfig({
  plugins: [react()],
  base: '/aprovaja/',
})
