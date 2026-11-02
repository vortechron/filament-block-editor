<?php

namespace Vortechron\FilamentBlockEditor\Enums;

/**
 * The font of a section's headings. "theme" keeps the page's own heading
 * font (`--sf-heading-font`); the others swap in one of the fonts below, so a
 * section can stand out from the rest of the page.
 *
 * The package does not load web fonts. Load the fonts a page uses yourself
 * (fontsFor() lists them) or let the fallbacks in page.css apply. Each font
 * reads `--font-{alias}` first, so you can point it at your own font.
 */
enum SectionFont: string
{
    case Theme = 'theme';
    case Grotesk = 'grotesk';
    case Condensed = 'condensed';
    case Serif = 'serif';
    case Poster = 'poster';
    case Geometric = 'geometric';
    case Mono = 'mono';

    public function label(): string
    {
        return match ($this) {
            self::Theme => 'Theme',
            self::Grotesk => 'Bold',
            self::Condensed => 'Tall',
            self::Serif => 'Luxury',
            self::Poster => 'Poster',
            self::Geometric => 'Modern',
            self::Mono => 'Typewriter',
        };
    }

    /**
     * The font's slug on Bunny Fonts and Google Fonts, or null for the
     * page's own heading font.
     */
    public function fontAlias(): ?string
    {
        return match ($this) {
            self::Theme => null,
            self::Grotesk => 'bricolage-grotesque',
            self::Condensed => 'barlow-condensed',
            self::Serif => 'bodoni-moda',
            self::Poster => 'anton',
            self::Geometric => 'jost',
            self::Mono => 'geist-mono',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Every font alias a section can use.
     *
     * @return list<string>
     */
    public static function allFonts(): array
    {
        return array_values(array_filter(array_map(fn (self $font): ?string => $font->fontAlias(), self::cases())));
    }

    /**
     * The font aliases the given sections need, each once.
     *
     * @param  list<array{data?: array<string, mixed>}>  $sections
     * @return list<string>
     */
    public static function fontsFor(array $sections): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn (array $section): ?string => self::tryFrom((string) ($section['data']['font'] ?? ''))?->fontAlias(),
            $sections,
        ))));
    }
}
