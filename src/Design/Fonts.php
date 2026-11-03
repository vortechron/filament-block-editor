<?php

namespace Vortechron\FilamentBlockEditor\Design;

use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\Enums\SectionFont;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * The fonts a page can use by name: the section fonts (Enums\SectionFont,
 * except "theme") and the host's own fonts from
 * `config('filament-block-editor.fonts')`:
 *
 *     'fonts' => [
 *         'inter' => ['label' => 'Inter', 'stack' => "'Inter', sans-serif",
 *                     'href' => 'https://fonts.bunny.net/css?family=inter:400,700'],
 *     ],
 *
 * A host font needs a key of lowercase letters, digits and dashes that is
 * not a section font, and a stack of font names only. Anything else is
 * skipped. The package loads no web fonts itself: `href` is the host's
 * stylesheet for its font, linked by the styles component when the design
 * kit uses that font.
 */
final class Fonts
{
    /**
     * The section fonts' stacks. Keep in step with the .sf-font-* rules in
     * resources/css/page/styles.css.
     */
    private const STACKS = [
        'grotesk' => "var(--font-bricolage-grotesque, 'Bricolage Grotesque'), system-ui, sans-serif",
        'condensed' => "var(--font-barlow-condensed, 'Barlow Condensed'), 'Arial Narrow', system-ui, sans-serif",
        'serif' => "var(--font-bodoni-moda, 'Bodoni Moda'), 'Didot', Georgia, serif",
        'poster' => "var(--font-anton, Anton), Impact, 'Arial Narrow', sans-serif",
        'geometric' => 'var(--font-jost, Jost), system-ui, sans-serif',
        'mono' => "var(--font-geist-mono, 'Geist Mono'), ui-monospace, monospace",
    ];

    /**
     * Every font by key: `['label' => ..., 'stack' => ..., 'href' => ?url]`.
     *
     * @return array<string, array{label: string, stack: string, href: string|null}>
     */
    public static function all(): array
    {
        $fonts = [];

        foreach (SectionFont::cases() as $font) {
            if ($font !== SectionFont::Theme) {
                $fonts[$font->value] = ['label' => $font->label(), 'stack' => self::STACKS[$font->value], 'href' => null];
            }
        }

        foreach ((array) config('filament-block-editor.fonts', []) as $key => $font) {
            $clean = self::hostFont($key, $font);

            if ($clean !== null && ! isset($fonts[$key])) {
                $fonts[$key] = $clean;
            }
        }

        return $fonts;
    }

    public static function has(mixed $key): bool
    {
        return is_string($key) && isset(self::all()[$key]);
    }

    /**
     * The font-family list of a font key, or null.
     */
    public static function stack(string $key): ?string
    {
        return self::all()[$key]['stack'] ?? null;
    }

    /**
     * @return array{label: string, stack: string, href: string|null}|null
     */
    private static function hostFont(mixed $key, mixed $font): ?array
    {
        if (! is_string($key) || preg_match('/^[a-z0-9-]{1,30}$/', $key) !== 1 || $key === SectionFont::Theme->value || ! is_array($font)) {
            return null;
        }

        $stack = is_string($font['stack'] ?? null) ? trim($font['stack']) : '';

        // Font names, quotes, commas and var(--x) only: never a ; { } or <.
        if ($stack === '' || strlen($stack) > 300 || preg_match('/^[\w\s,\'"().-]+$/u', $stack) !== 1) {
            return null;
        }

        $href = Urls::media($font['href'] ?? null);

        return [
            'label' => is_string($font['label'] ?? null) && $font['label'] !== '' ? $font['label'] : Str::headline($key),
            'stack' => $stack,
            'href' => $href !== null && ! str_starts_with($href, 'http://') ? $href : null,
        ];
    }
}
