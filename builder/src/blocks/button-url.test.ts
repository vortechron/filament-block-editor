import { describe, expect, it } from 'vitest';
import { safeButtonUrl } from './button-url';

describe('the button link', () => {
    it('allows web, mail and phone links, anchors and paths on this site', () => {
        expect(safeButtonUrl('https://example.com/a?b=1')).toBe(
            'https://example.com/a?b=1',
        );
        expect(safeButtonUrl('http://example.com')).toBe('http://example.com');
        expect(safeButtonUrl('mailto:hai@example.com')).toBe(
            'mailto:hai@example.com',
        );
        expect(safeButtonUrl('tel:+60123456789')).toBe('tel:+60123456789');
        expect(safeButtonUrl('#tentang')).toBe('#tentang');
        expect(safeButtonUrl('/hubungi')).toBe('/hubungi');
    });

    it('trims the spaces around a pasted link', () => {
        expect(safeButtonUrl('  https://example.com  ')).toBe(
            'https://example.com',
        );
    });

    it('refuses scripts, data, other hosts without a scheme and empty links', () => {
        expect(safeButtonUrl('javascript:alert(1)')).toBeNull();
        expect(safeButtonUrl('JavaScript:alert(1)')).toBeNull();
        expect(safeButtonUrl('data:text/html,hi')).toBeNull();
        expect(safeButtonUrl('//evil.example')).toBeNull();
        expect(safeButtonUrl('example.com')).toBeNull();
        expect(safeButtonUrl('')).toBeNull();
        expect(safeButtonUrl('#')).toBeNull();
        expect(safeButtonUrl('https://')).toBeNull();
    });
});
