import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    logLevel: 'warning',
    build: {
        // Phaser alone is larger than Vite's default 500 kB warning threshold.
        chunkSizeWarningLimit: 2000
    }
});
