import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'build', // Output directory for the React app
        rollupOptions: {
            input: {
                popup: './src/index.html', // Entry point for the popup
            },
        },
    },
});