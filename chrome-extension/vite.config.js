import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'build', // Output directory for the React app
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/index.html')
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name].[hash].js',
                assetFileNames: 'assets/[name].[ext]',
                format: 'es',
            },
            external: ['chrome']
        },
        target: 'es2020',
        sourcemap: true,
        emptyOutDir: false
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        exclude: ['background.js', 'notifications.js']
    },
    base: './'
});