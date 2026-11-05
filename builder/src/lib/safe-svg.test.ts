import { describe, expect, it } from 'vitest';
import { safeSvg } from './safe-svg';

describe('an icon picture from the host', () => {
    it('keeps the plain shapes and how they are drawn', () => {
        const svg = safeSvg(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="10"/></svg>',
        );

        expect(svg).toContain('viewBox="0 0 24 24"');
        expect(svg).toContain('stroke="currentColor"');
        expect(svg).toContain('<path d="M20 6 9 17l-5-5"');
        expect(svg).toContain('<circle cx="12" cy="12" r="10"');
    });

    it('drops scripts, handlers, links, styles and anything that is not a shape', () => {
        const svg = safeSvg(
            '<svg viewBox="0 0 24 24" onload="alert(1)"><script>alert(2)</script><foreignObject><p>x</p></foreignObject><a href="javascript:alert(3)"><path d="M1 1"/></a><use href="https://evil.test/x.svg#a"/><path d="M2 2" onclick="alert(4)" style="fill:url(javascript:1)"/></svg>',
        );

        expect(svg).not.toMatch(/alert|script|foreignObject|javascript|evil|onload|onclick|style=|<a|<use/);
        expect(svg).toContain('<path d="M2 2"');
    });

    it('turns down anything that is not an svg', () => {
        expect(safeSvg('<img src=x onerror="alert(1)">')).toBeNull();
        expect(safeSvg('not a picture')).toBeNull();
        expect(safeSvg('')).toBeNull();
    });
});
