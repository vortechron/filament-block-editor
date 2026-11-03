import { describe, expect, it } from 'vitest';
import type { Kit } from '@/types';
import { DEFAULT_KIT, normalizeKit } from './kit';

/** A host's Kit::defaults(): the package defaults with its config over them. */
const HOST_DEFAULTS: Kit = {
    ...DEFAULT_KIT,
    colors: { ...DEFAULT_KIT.colors, primary: '#c59d6e', text: '#1f2328' },
    radius: '8px',
};

describe('the design kit', () => {
    it('starts from the package defaults of Design\\Kit, today’s look', () => {
        expect(DEFAULT_KIT.colors.text).toBe('#475569');
        expect(DEFAULT_KIT.radius).toBe('1.25rem');
        expect(DEFAULT_KIT.text).toEqual({ base_size: '1.0625rem', heading_weight: '800' });
        expect(DEFAULT_KIT.buttons).toEqual({
            style: 'solid',
            radius: '0.75rem',
            size: 'md',
            text_transform: 'none',
            font_weight: '800',
        });
        expect(DEFAULT_KIT.forms).toEqual({ style: 'outline', radius: '0.75rem', labels: 'above' });
    });

    it('fills a gap with the host’s defaults, not the package’s', () => {
        const kit = normalizeKit({ colors: { accent: '#ff0000' } }, HOST_DEFAULTS);

        expect(kit.colors.accent).toBe('#ff0000');
        expect(kit.colors.primary).toBe('#c59d6e');
        expect(kit.colors.text).toBe('#1f2328');
        expect(kit.radius).toBe('8px');
    });

    it('keeps the server’s rules: sizes in px, rem or em, and no custom colour without a colour', () => {
        const kit = normalizeKit(
            {
                radius: '50%',
                text: { base_size: '2vw' },
                custom_colors: [
                    { key: 'gold', label: 'Emas', value: '#C59D6E' },
                    { key: 'nope', label: 'Tiada', value: 'red' },
                ],
            },
            HOST_DEFAULTS,
        );

        expect(kit.radius).toBe('8px');
        expect(kit.text.base_size).toBe(DEFAULT_KIT.text.base_size);
        expect(kit.custom_colors).toEqual([{ key: 'gold', label: 'Emas', value: '#c59d6e' }]);
    });
});
