<?php

namespace Vortechron\FilamentBlockEditor\Design;

use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\Styling\CssValue;

/**
 * The site's design values: colours, fonts, text, corners, buttons and
 * forms. Stored by the host (the CMS keeps one document of kind "kit"),
 * read through a KitSource, and written as CSS variables by css():
 *
 *     ['version' => 1,
 *      'colors' => ['primary' => '#2563eb', 'secondary' => ..., 'accent' => ..., 'text' => ...,
 *                   'muted' => ..., 'background' => ..., 'surface' => ..., 'border' => ...],
 *      'custom_colors' => [['key' => 'gold', 'label' => 'Emas', 'value' => '#c59d6e']],
 *      'fonts' => ['heading' => 'theme', 'body' => 'theme'],
 *      'text' => ['base_size' => '1.0625rem', 'heading_weight' => '800'],
 *      'radius' => '1.25rem',
 *      'buttons' => ['style' => 'solid', 'radius' => '0.75rem', 'size' => 'md', 'text_transform' => 'none', 'font_weight' => '800'],
 *      'forms' => ['style' => 'outline', 'radius' => '0.75rem', 'labels' => 'above']]
 *
 * The package defaults are today's look, so a page with the default kit
 * looks exactly as it did before the kit existed.
 */
final class Kit
{
    public const VERSION = 1;

    public const MAX_CUSTOM_COLORS = 12;

    /**
     * The longest a custom colour's label may be.
     */
    public const CUSTOM_LABEL_LENGTH = 60;

    public const COLORS = ['primary', 'secondary', 'accent', 'text', 'muted', 'background', 'surface', 'border'];

    public const BUTTON_STYLES = ['solid', 'outline', 'pill', 'shadow'];

    public const BUTTON_SIZES = ['sm', 'md', 'lg'];

    public const FORM_STYLES = ['outline', 'filled', 'underline'];

    public const FORM_LABELS = ['above', 'hidden'];

    public const TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'];

    /**
     * Today's look (resources/css/page/tokens.css and parts.css).
     */
    public const PACKAGE_DEFAULTS = [
        'version' => self::VERSION,
        'colors' => [
            'primary' => '#2563eb',
            'secondary' => '#0f172a',
            'accent' => '#f59e0b',
            'text' => '#475569',
            'muted' => '#64748b',
            'background' => '#ffffff',
            'surface' => '#f8fafc',
            'border' => '#e2e8f0',
        ],
        'custom_colors' => [],
        'fonts' => ['heading' => 'theme', 'body' => 'theme'],
        'text' => ['base_size' => '1.0625rem', 'heading_weight' => '800'],
        'radius' => '1.25rem',
        'buttons' => ['style' => 'solid', 'radius' => '0.75rem', 'size' => 'md', 'text_transform' => 'none', 'font_weight' => '800'],
        'forms' => ['style' => 'outline', 'radius' => '0.75rem', 'labels' => 'above'],
    ];

    /**
     * The package defaults with `config('filament-block-editor.kit')`
     * merged over them, cleaned.
     *
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return self::clean(config('filament-block-editor.kit', []), self::PACKAGE_DEFAULTS);
    }

    /**
     * A kit cleaned: each value of the right type, or the default in its
     * place. Unknown keys are dropped.
     *
     * @return array<string, mixed>
     */
    public static function normalize(mixed $raw): array
    {
        return self::clean($raw, self::defaults());
    }

    /**
     * The `.sf-page{...}` CSS of a kit (it is cleaned first). See KitCss.
     *
     * @param  array<mixed>  $kit
     */
    public static function css(array $kit): string
    {
        return KitCss::write(self::normalize($kit));
    }

    /**
     * The fonts a kit or a style can use by name (Design\Fonts).
     *
     * @return array<string, array{label: string, stack: string, href: string|null}>
     */
    public static function fonts(): array
    {
        return Fonts::all();
    }

    /**
     * Request validation for the outer shape of a kit. Values are cleaned by
     * normalize(), so these rules only guard the shape.
     *
     * @return array<string, list<string>>
     */
    public static function rules(string $attribute = 'kit'): array
    {
        return [
            $attribute => ['required', 'array'],
            "{$attribute}.version" => ['sometimes', 'integer'],
            "{$attribute}.colors" => ['sometimes', 'array'],
            "{$attribute}.custom_colors" => ['sometimes', 'array', 'max:'.self::MAX_CUSTOM_COLORS],
            "{$attribute}.custom_colors.*" => ['array'],
            "{$attribute}.fonts" => ['sometimes', 'array'],
            "{$attribute}.text" => ['sometimes', 'array'],
            "{$attribute}.buttons" => ['sometimes', 'array'],
            "{$attribute}.forms" => ['sometimes', 'array'],
        ];
    }

    /**
     * @param  array<string, mixed>  $base  a clean kit to fall back on
     * @return array<string, mixed>
     */
    private static function clean(mixed $raw, array $base): array
    {
        $raw = is_array($raw) ? $raw : [];
        $part = fn (string $key): array => is_array($raw[$key] ?? null) ? $raw[$key] : [];

        $colors = [];

        foreach (self::COLORS as $key) {
            $colors[$key] = CssValue::color($part('colors')[$key] ?? null, kit: false) ?? $base['colors'][$key];
        }

        return [
            'version' => self::VERSION,
            'colors' => $colors,
            'custom_colors' => array_key_exists('custom_colors', $raw) ? self::customColors($raw['custom_colors']) : $base['custom_colors'],
            'fonts' => [
                'heading' => self::font($part('fonts')['heading'] ?? null) ?? $base['fonts']['heading'],
                'body' => self::font($part('fonts')['body'] ?? null) ?? $base['fonts']['body'],
            ],
            'text' => [
                'base_size' => self::size($part('text')['base_size'] ?? null) ?? $base['text']['base_size'],
                'heading_weight' => CssValue::fontWeight($part('text')['heading_weight'] ?? null) ?? $base['text']['heading_weight'],
            ],
            'radius' => self::size($raw['radius'] ?? null) ?? $base['radius'],
            'buttons' => [
                'style' => self::pick($part('buttons')['style'] ?? null, self::BUTTON_STYLES) ?? $base['buttons']['style'],
                'radius' => self::size($part('buttons')['radius'] ?? null) ?? $base['buttons']['radius'],
                'size' => self::pick($part('buttons')['size'] ?? null, self::BUTTON_SIZES) ?? $base['buttons']['size'],
                'text_transform' => self::pick($part('buttons')['text_transform'] ?? null, self::TEXT_TRANSFORMS) ?? $base['buttons']['text_transform'],
                'font_weight' => CssValue::fontWeight($part('buttons')['font_weight'] ?? null) ?? $base['buttons']['font_weight'],
            ],
            'forms' => [
                'style' => self::pick($part('forms')['style'] ?? null, self::FORM_STYLES) ?? $base['forms']['style'],
                'radius' => self::size($part('forms')['radius'] ?? null) ?? $base['forms']['radius'],
                'labels' => self::pick($part('forms')['labels'] ?? null, self::FORM_LABELS) ?? $base['forms']['labels'],
            ],
        ];
    }

    /**
     * @return list<array{key: string, label: string, value: string}>
     */
    private static function customColors(mixed $colors): array
    {
        $clean = [];

        foreach (is_array($colors) ? $colors : [] as $color) {
            $key = is_array($color) && is_string($color['key'] ?? null) ? $color['key'] : '';
            $value = is_array($color) ? CssValue::color($color['value'] ?? null, kit: false) : null;

            if (count($clean) >= self::MAX_CUSTOM_COLORS) {
                break;
            }

            if ($value === null || preg_match('/^'.CssValue::KIT_KEY.'$/', $key) !== 1 || in_array($key, self::COLORS, true) || isset($clean[$key])) {
                continue;
            }

            $label = is_string($color['label'] ?? null) && trim($color['label']) !== '' ? Str::limit(trim($color['label']), self::CUSTOM_LABEL_LENGTH, '') : Str::headline($key);
            $clean[$key] = ['key' => $key, 'label' => $label, 'value' => $value];
        }

        return array_values($clean);
    }

    private static function font(mixed $value): ?string
    {
        return $value === 'theme' || Fonts::has($value) ? $value : null;
    }

    /**
     * A length in px, rem or em (CssValue::length), for sizes and corners.
     */
    private static function size(mixed $value): ?string
    {
        $length = CssValue::length($value);

        return $length !== null && ($length === '0' || preg_match('/(px|rem|em)$/', $length) === 1) ? $length : null;
    }

    /**
     * @param  list<string>  $allowed
     */
    private static function pick(mixed $value, array $allowed): ?string
    {
        return is_string($value) && in_array($value, $allowed, true) ? $value : null;
    }
}
