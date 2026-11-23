import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// es2017 keeps optional chaining and other new syntax out of older Android WebViews.
export default defineConfig({ plugins: [react()], build: { target: 'es2017' } })
