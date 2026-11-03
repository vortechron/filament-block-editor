import { describe, expect, it } from 'vitest';
import { cleanAdvanced, cleanCustomCss } from './advanced';
import { cleanStyleBag, cleanStyleValue } from './style-bag';

describe('a style value, as the server keeps it', () => {
    it('takes lengths within each unit’s limit, with at most 3 decimals', () => {
        expect(cleanStyleValue('padding_top', '0')).toBe('0');
        expect(cleanStyleValue('padding_top', '24px')).toBe('24px');
        expect(cleanStyleValue('padding_top', '1.125rem')).toBe('1.125rem');
        expect(cleanStyleValue('padding_top', '2000px')).toBe('2000px');
        expect(cleanStyleValue('padding_top', '2001px')).toBeNull();
        expect(cleanStyleValue('padding_top', '201rem')).toBeNull();
        expect(cleanStyleValue('width', '101%')).toBeNull();
        expect(cleanStyleValue('padding_top', '1.1234rem')).toBeNull();
        expect(cleanStyleValue('padding_top', '12')).toBeNull();
        expect(cleanStyleValue('padding_top', 'calc(1px + 2px)')).toBeNull();
    });

    it('lets margins and letter spacing go below zero, and nothing else', () => {
        expect(cleanStyleValue('margin_top', '-12px')).toBe('-12px');
        expect(cleanStyleValue('letter_spacing', '-0.02em')).toBe('-0.02em');
        expect(cleanStyleValue('padding_top', '-12px')).toBeNull();
        expect(cleanStyleValue('radius', '-4px')).toBeNull();
    });

    it('stores hex colours in lower case, and takes kit colours and transparent', () => {
        expect(cleanStyleValue('color', '#ABC')).toBe('#abc');
        expect(cleanStyleValue('color', '#AABBCC')).toBe('#aabbcc');
        expect(cleanStyleValue('color', '#aabbcc80')).toBe('#aabbcc80');
        expect(cleanStyleValue('background_color', 'transparent')).toBe('transparent');
        expect(cleanStyleValue('border_color', 'kit:primary')).toBe('kit:primary');
        expect(cleanStyleValue('color', 'kit:Gold')).toBeNull();
        expect(cleanStyleValue('color', 'red')).toBeNull();
        expect(cleanStyleValue('color', 'rgb(0,0,0)')).toBeNull();
    });

    it('checks fonts, weights, line heights and the fixed choices', () => {
        expect(cleanStyleValue('font_family', 'kit:heading')).toBe('kit:heading');
        expect(cleanStyleValue('font_family', 'serif')).toBe('serif');
        expect(cleanStyleValue('font_family', 'theme')).toBeNull();
        expect(cleanStyleValue('font_family', 'Comic Sans')).toBeNull();
        expect(cleanStyleValue('font_weight', '700')).toBe('700');
        expect(cleanStyleValue('font_weight', 650)).toBeNull();
        expect(cleanStyleValue('line_height', '1.5')).toBe('1.5');
        expect(cleanStyleValue('line_height', '0.5')).toBeNull();
        expect(cleanStyleValue('line_height', '24px')).toBe('24px');
        expect(cleanStyleValue('text_transform', 'uppercase')).toBe('uppercase');
        expect(cleanStyleValue('text_align', 'justify')).toBe('justify');
        expect(cleanStyleValue('border_style', 'double')).toBeNull();
        expect(cleanStyleValue('radius', 'kit:radius')).toBe('kit:radius');
        expect(cleanStyleValue('shadow', 'lg')).toBe('lg');
        expect(cleanStyleValue('shadow', '0 0 4px #000')).toBeNull();
        expect(cleanStyleValue('opacity', 0.5)).toBe('0.5');
        expect(cleanStyleValue('opacity', '1.5')).toBeNull();
    });
});

describe('a style bag', () => {
    it('keeps only the hover keys under hover, and drops unknown keys and variants', () => {
        expect(
            cleanStyleBag({
                desktop: { padding_top: '24px', position: 'fixed' },
                hover: { color: '#fff', shadow: 'md', padding_top: '2px' },
                wide: { color: '#000' },
            }),
        ).toEqual({
            desktop: { padding_top: '24px' },
            hover: { color: '#fff', shadow: 'md' },
        });
    });

    it('is null when nothing is left', () => {
        expect(cleanStyleBag({ desktop: {}, phone: { color: 'nope' } })).toBeNull();
        expect(cleanStyleBag('padding: 4px')).toBeNull();
        expect(cleanStyleBag(null)).toBeNull();
    });
});

describe('the advanced part', () => {
    it('keeps up to 5 valid class names', () => {
        expect(
            cleanAdvanced({ class: 'a b 1c d-e f_g h i' })?.class,
        ).toBe('a b d-e f_g h');
    });

    it('drops custom CSS whole when it breaks a rule', () => {
        const ok = 'selector .bn-button { letter-spacing: .1em; }';

        expect(cleanCustomCss(ok)).toBe(ok);
        expect(cleanCustomCss('selector { background: url(https://a.test/x.png) }')).not.toBeNull();
        expect(cleanCustomCss("selector { background: url('/img/x.png') }")).not.toBeNull();
        expect(cleanCustomCss('selector { background: url(http://a.test/x.png) }')).toBeNull();
        expect(cleanCustomCss('selector { background: url(//a.test/x.png) }')).toBeNull();
        expect(cleanCustomCss('</style><script>')).toBeNull();
        expect(cleanCustomCss('@IMPORT "x.css";')).toBeNull();
        expect(cleanCustomCss('selector { width: expression(1) }')).toBeNull();
        expect(cleanCustomCss('selector { behavior: url(/x.htc) }')).toBeNull();
        expect(cleanCustomCss('x'.repeat(5001))).toBeNull();
    });

    it('keeps each known device to hide on once, and is null when empty', () => {
        expect(cleanAdvanced({ hide_on: ['phone', 'desktop', 'phone', 'tv'] })).toEqual({
            hide_on: ['desktop', 'phone'],
        });
        expect(cleanAdvanced({ class: '', css: '  ', hide_on: [] })).toBeNull();
    });
});
