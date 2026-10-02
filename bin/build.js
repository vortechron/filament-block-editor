import * as esbuild from 'esbuild';

const isDev = process.argv.includes('--dev');

/**
 * The editor bundle. Filament loads it on demand with x-load, as an ES module
 * whose default export is the Alpine component.
 */
const scripts = {
    entryPoints: ['resources/js/index.js'],
    outfile: 'resources/dist/components/block-note-editor.js',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    loader: { '.js': 'jsx' },
    minify: ! isDev,
    sourcemap: isDev ? 'inline' : false,
    treeShaking: true,
    define: {
        'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
    },
    logLevel: 'info',
};

/**
 * blocknote.css: BlockNote + editor styles, loaded with the editor.
 * filament-block-editor.css: library, swatches and previews, on every panel page.
 * page.css: the public styles for rendered blocks.
 */
const styles = [
    ['resources/css/blocknote.css', 'resources/dist/blocknote.css'],
    ['resources/css/admin.css', 'resources/dist/filament-block-editor.css'],
    ['resources/css/page.css', 'resources/dist/page.css'],
].map(([entry, outfile]) => ({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: ! isDev,
    conditions: ['style'],
    loader: { '.woff': 'empty', '.woff2': 'empty', '.ttf': 'empty' },
    logLevel: 'info',
}));

await Promise.all([esbuild.build(scripts), ...styles.map((options) => esbuild.build(options))]);
