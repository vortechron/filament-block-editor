import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import tailwind from '@tailwindcss/postcss';
import * as esbuild from 'esbuild';
import postcss from 'postcss';
import { scopeCss } from '../builder/build/scope-css.js';

const isDev = process.argv.includes('--dev');
const SCOPE = '.fbe-builder';

/**
 * Runs Tailwind on the builder's own stylesheet (builder/src/styles/
 * builder.css) when the JavaScript imports it. Every other CSS file, like
 * BlockNote's, goes to esbuild as it is.
 */
const tailwindPlugin = {
    name: 'fbe-tailwind',
    setup(build) {
        build.onLoad({ filter: /builder[\\/]src[\\/]styles[\\/]builder\.css$/ }, async (args) => {
            const source = await readFile(args.path, 'utf8');
            const result = await postcss([tailwind({ optimize: { minify: false } })]).process(source, {
                from: args.path,
            });

            return { contents: result.css, loader: 'css', resolveDir: 'builder/src/styles' };
        });
    },
};

/**
 * The page builder: one ES module with React and BlockNote inside, and
 * one stylesheet. Hosts load both; neither needs a build on their side.
 */
async function buildBuilder() {
    await esbuild.build({
        entryPoints: { 'page-builder': 'builder/src/index.tsx' },
        outdir: 'resources/dist',
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: ['es2022'],
        jsx: 'automatic',
        // "style" lets CSS imports like @blocknote/mantine/style.css resolve.
        conditions: ['style', 'browser', 'module'],
        tsconfig: 'builder/tsconfig.json',
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        treeShaking: true,
        legalComments: 'none',
        define: {
            'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        },
        loader: { '.woff': 'empty', '.woff2': 'empty', '.ttf': 'empty', '.svg': 'dataurl', '.png': 'dataurl' },
        plugins: [tailwindPlugin],
        logLevel: 'info',
    });

    // Everything under .fbe-builder, out of cascade layers.
    const cssFile = 'resources/dist/page-builder.css';
    const css = await readFile(cssFile, 'utf8');
    const scoped = await postcss([scopeCss({ scope: SCOPE })]).process(css, { from: cssFile });
    const { code } = await esbuild.transform(scoped.css, { loader: 'css', minify: !isDev, legalComments: 'none' });

    await writeFile(cssFile, code);
    console.log(`  ${cssFile} scoped under ${SCOPE}`);
}

/**
 * The public page stylesheet (plain CSS, written on the PHP side). Skipped
 * while its source does not exist yet.
 */
async function buildPageCss() {
    const entry = 'resources/css/page/index.css';

    if (!existsSync(entry)) {
        console.log(`  ${entry} does not exist yet, so resources/dist/page.css was not built.`);

        return;
    }

    await esbuild.build({
        entryPoints: [entry],
        outfile: 'resources/dist/page.css',
        bundle: true,
        minify: !isDev,
        legalComments: 'none',
        loader: { '.woff': 'file', '.woff2': 'file', '.svg': 'dataurl', '.png': 'dataurl' },
        logLevel: 'info',
    });
}

await rm('resources/dist/page-builder.js', { force: true });
await rm('resources/dist/page-builder.css', { force: true });
await Promise.all([buildBuilder(), buildPageCss()]);
