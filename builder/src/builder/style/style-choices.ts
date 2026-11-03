import { useHost } from '@/lib/host';
import { kitColorChoices, type KitColorChoice } from '@/lib/kit';
import type { FontChoice } from '@/types';
import { FONTS } from '../../editor/rich-style-fields';
import { useBuilderContext } from '../builder-context';

/** A font a style may use, with its label in English when it is the builder's own. */
export type StyleFont = FontChoice & { builtIn: boolean };

/**
 * The fonts a style may use: the kit's heading and body fonts, the fixed
 * section fonts, then the host's own (options.fonts).
 */
export function styleFonts(hostFonts: readonly FontChoice[]): StyleFont[] {
    const fixed: StyleFont[] = [
        { value: 'kit:heading', label: 'Heading font', builtIn: true },
        { value: 'kit:body', label: 'Body font', builtIn: true },
        ...FONTS.filter((font) => font.value !== 'theme').map((font) => ({
            value: font.value,
            label: font.label,
            builtIn: true,
        })),
    ];
    const known = new Set(fixed.map((font) => font.value));

    return [
        ...fixed,
        ...hostFonts
            .filter((font) => font.value !== 'theme' && !known.has(font.value))
            .map((font) => ({ ...font, builtIn: false })),
    ];
}

/** What the style controls offer: the kit's colours (unsaved ones too) and the fonts. */
export function useStyleChoices(): { colors: KitColorChoice[]; fonts: StyleFont[] } {
    const { fonts } = useHost();
    const { kit } = useBuilderContext();

    return { colors: kitColorChoices(kit.kit), fonts: styleFonts(fonts) };
}
