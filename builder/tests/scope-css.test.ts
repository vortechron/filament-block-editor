import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { scopeCss } from '../build/scope-css.js';

async function scoped(css: string): Promise<string> {
    const result = await postcss([scopeCss({ scope: '.fbe-builder' })]).process(
        css,
        { from: undefined },
    );

    return result.css.replace(/\s+/g, ' ').trim();
}

describe('scoping the builder styles', () => {
    it('puts every rule under the builder element', async () => {
        expect(await scoped('.flex { display: flex }')).toBe(
            '.fbe-builder .flex { display: flex }',
        );
        expect(await scoped('a, button:hover { color: red }')).toBe(
            '.fbe-builder a, .fbe-builder button:hover { color: red }',
        );
    });

    it('turns the page root into the builder element itself', async () => {
        expect(await scoped(':root, :host { --x: 1 }')).toBe(
            '.fbe-builder { --x: 1 }',
        );
        expect(await scoped('html, body { margin: 0 }')).toBe(
            '.fbe-builder { margin: 0 }',
        );
        expect(await scoped('html body .x { color: red }')).toBe(
            '.fbe-builder .x { color: red }',
        );
        expect(await scoped(':root[data-mode=dark] { --x: 2 }')).toBe(
            '.fbe-builder[data-mode=dark] { --x: 2 }',
        );
    });

    it('scopes the reset that styles every element', async () => {
        expect(await scoped('*, ::before, ::after { box-sizing: border-box }')).toBe(
            '.fbe-builder *, .fbe-builder ::before, .fbe-builder ::after { box-sizing: border-box }',
        );
    });

    it('leaves rules already scoped to the builder as they are', async () => {
        expect(await scoped('.fbe-builder { color: red }')).toBe(
            '.fbe-builder { color: red }',
        );
        expect(await scoped('.fbe-builder .x { color: red }')).toBe(
            '.fbe-builder .x { color: red }',
        );
    });

    it('leaves keyframes, font faces and property rules alone', async () => {
        expect(await scoped('@keyframes spin { from { opacity: 0 } to { opacity: 1 } }')).toBe(
            '@keyframes spin { from { opacity: 0 } to { opacity: 1 } }',
        );
        expect(
            await scoped("@property --tw-x { syntax: '*'; inherits: false }"),
        ).toBe("@property --tw-x { syntax: '*'; inherits: false }");
    });

    it('takes rules out of cascade layers, so host styles outside layers cannot win', async () => {
        expect(
            await scoped('@layer theme, base; @layer base { a { color: red } } @layer utilities { .p-1 { padding: 1px } }'),
        ).toBe('.fbe-builder a { color: red } .fbe-builder .p-1 { padding: 1px }');
    });

    it('scopes rules inside media and supports blocks', async () => {
        expect(
            await scoped('@media (min-width: 40rem) { .sm\\:flex { display: flex } }'),
        ).toBe('@media (min-width: 40rem) { .fbe-builder .sm\\:flex { display: flex } }');
    });
});
