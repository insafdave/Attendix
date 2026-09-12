import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts:
    ['attendix-s2kt.onrender.com'],
  }
})