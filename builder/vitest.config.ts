import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    esbuild: { jsx: 'automatic' },
    test: {
        root: fileURLToPath(new URL('.', import.meta.url)),
        environment: 'jsdom',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        css: false,
        setupFiles: ['tests/setup.ts'],
    },
});
