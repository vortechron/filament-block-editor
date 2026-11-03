import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { linkOrReference } from '../src/blocks/button-url';
import { cleanClassNames, cleanCustomCss } from '../src/lib/advanced';
import { cleanStyleBag } from '../src/lib/style-bag';

/**
 * The cases in tests/fixtures/shared, which tests/Unit/SharedFixturesTest.php
 * runs too: the builder and the server must clean each input to the same
 * output, for the rules a table of limits can not hold.
 */
const DIRECTORY = join(__dirname, '../../tests/fixtures/shared');

type Case<T> = T & { name: string };

function cases<T>(file: string): Case<T>[] {
    return JSON.parse(readFileSync(join(DIRECTORY, file), 'utf8')).cases;
}

describe('a style value', () => {
    it.each(
        cases<{ key: string; input: unknown; output: string | null }>('style-values.json'),
    )('$name', ({ key, input, output }) => {
        expect(cleanStyleBag({ desktop: { [key]: input } })?.desktop?.[key] ?? null).toBe(output);
    });
});

describe('class names', () => {
    it.each(cases<{ input: unknown; output: string | null }>('class-names.json'))(
        '$name',
        ({ input, output }) => {
            expect(cleanClassNames(input)).toBe(output);
        },
    );
});

describe('custom CSS', () => {
    it.each(cases<{ input: unknown; output: string | null }>('custom-css.json'))(
        '$name',
        ({ input, output }) => {
            expect(cleanCustomCss(input)).toBe(output);
        },
    );
});

describe('a link or a dynamic value', () => {
    it.each(cases<{ input: unknown; output: string | null }>('links.json'))(
        '$name',
        ({ input, output }) => {
            expect(linkOrReference(input)).toBe(output);
        },
    );
});
