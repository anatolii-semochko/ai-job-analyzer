import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@react/api': path.resolve(__dirname, 'src/api'),
            '@config': path.resolve(__dirname, '../config'),
        },
    },
    server: {
        proxy: {
            '/node': {
                target: 'http://localhost:3747',
                changeOrigin: true,
            },
        },
    },
})
