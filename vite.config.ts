// File: vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'BharatPOS Dukkan',
        short_name: 'BharatPOS',
        description: 'Retail Billing & Inventory OS',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        // Merchant POS App
        main: resolve(__dirname, 'index.html'),
        // Secure Customer Portal App
        customer: resolve(__dirname, 'customer/index.html')
      }
    }
  }
})