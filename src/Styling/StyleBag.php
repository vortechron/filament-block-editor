<?php

namespace Vortechron\FilamentBlockEditor\Styling;

/**
 * The open-ended look of a section or a block, per device:
 *
 *     ['desktop' => ['padding_top' => '24px', 'color' => 'kit:text'],
 *      'tablet' => ['padding_top' => '16px'],
 *      'phone' => ['padding_top' => '12px', 'font_size' => '1rem'],
 *      'hover' => ['background_color' => 'kit:primary']]
 *
 * `desktop` is the base, `tablet` applies at max-width 1024px, `phone` at
 * max-width 767px. `hover` allows only HOVER_KEYS. Values are typed (see
 * CssValue), never raw CSS: clean() drops anything that does not fit, and
 * unknown keys.
 */
final class StyleBag
{
    public const VARIANTS = ['desktop', 'tablet', 'phone', 'hover'];

    public const HOVER_KEYS = ['color', 'background_color', 'border_color', 'shadow', 'opacity'];

    public const SHADOWS = ['none', 'sm', 'md', 'lg', 'xl'];

    /**
     * Each key: its CSS property and the kind of value it takes (see
     * cleanValue()). Exported to the builder by Support\BuilderRules.
     *
     * @var array<string, array{0: string, 1: string}>
     */
    public const KEYS = [
        'padding_top' => ['padding-top', 'length'],
        'padding_right' => ['padding-right', 'length'],
        'padding_bottom' => ['padding-bottom', 'length'],
        'padding_left' => ['padding-left', 'length'],
        'margin_top' => ['margin-top', 'length'],
        'margin_bottom' => ['margin-bottom', 'length'],
        'width' => ['width', 'length'],
        'max_width' => ['max-width', 'length'],
        'min_height' => ['min-height', 'length'],
        'gap' => ['gap', 'length'],
        'color' => ['color', 'color'],
        'background_color' => ['background-color', 'color'],
        'border_color' => ['border-color', 'color'],
        'font_family' => ['font-family', 'font'],
        'font_size' => ['font-size', 'length'],
        'letter_spacing' => ['letter-spacing', 'length'],
        'font_weight' => ['font-weight', 'weight'],
        'line_height' => ['line-height', 'line_height'],
        'text_transform' => ['text-transform', 'choice'],
        'text_align' => ['text-align', 'choice'],
        'border_width' => ['border-width', 'length'],
        'border_style' => ['border-style', 'choice'],
        'radius' => ['border-radius', 'radius'],
        'shadow' => ['box-shadow', 'shadow'],
        'opacity' => ['opacity', 'opacity'],
    ];

    /**
     * Keys whose length must be 0 or more. Only margins and letter spacing
     * may go below zero.
     */
    public const NON_NEGATIVE = [
        'padding_top', 'padding_right', 'padding_bottom', 'padding_left', 'width', 'max_width', 'min_height', 'gap',
        'font_size', 'line_height', 'border_width', 'radius',
    ];

    /**
     * The words a "choice" key allows.
     *
     * @var array<string, list<string>>
     */
    public const CHOICES = [
        'text_transform' => ['none', 'uppercase', 'lowercase', 'capitalize'],
        'text_align' => ['left', 'center', 'right', 'justify'],
        'border_style' => ['none', 'solid', 'dashed', 'dotted'],
    ];

    public const LINE_HEIGHT_MIN = 0.8;

    public const LINE_HEIGHT_MAX = 3;

    public const OPACITY_MIN = 0;

    public const OPACITY_MAX = 1;

    /**
     * Keys that a section's words have their own value for (.sf-rich), so
     * a section's own value is written for its words too.
     */
    public const SECTION_TEXT_KEYS = ['font_size', 'line_height'];

    /**
     * The known variants that have a valid value, in VARIANTS order. Empty
     * variants are left out, so an unstyled element has `[]`.
     *
     * @return array<string, array<string, string>>
     */
    public static function clean(mixed $bag): array
    {
        if (! is_array($bag)) {
            return [];
        }

        $clean = [];

        foreach (self::VARIANTS as $variant) {
            $values = self::cleanValues($bag[$variant] ?? null, $variant === 'hover' ? self::HOVER_KEYS : null);

            if ($values !== []) {
                $clean[$variant] = $values;
            }
        }

        return $clean;
    }

    /**
     * Whether any variant sets `$key`.
     *
     * @param  array<string, array<string, string>>  $bag  a cleaned bag
     */
    public static function sets(array $bag, string $key): bool
    {
        foreach ($bag as $values) {
            if (isset($values[$key])) {
                return true;
            }
        }

        return false;
    }

    /**
     * The CSS declarations of cleaned values, such as "padding-top:24px".
     * A colour also sets the words' colour tokens (--sf-words,
     * --sf-heading), so text inside follows it.
     *
     * @param  array<string, string>  $values
     * @return list<string>
     */
    public static function declarations(array $values): array
    {
        $css = [];

        foreach ($values as $key => $value) {
            if (! isset(self::KEYS[$key])) {
                continue;
            }

            $css[] = self::KEYS[$key][0].':'.self::valueCss(self::KEYS[$key][1], $value);

            if ($key === 'color') {
                $css[] = '--sf-words:'.CssValue::colorCss($value);
                $css[] = '--sf-heading:'.CssValue::colorCss($value);
            }
        }

        return $css;
    }

    /**
     * @param  list<string>|null  $only
     * @return array<string, string>
     */
    private static function cleanValues(mixed $values, ?array $only): array
    {
        if (! is_array($values) || array_is_list($values)) {
            return [];
        }

        $clean = [];

        foreach (array_keys(self::KEYS) as $key) {
            if (! array_key_exists($key, $values) || ($only !== null && ! in_array($key, $only, true))) {
                continue;
            }

            $value = self::cleanValue($key, $values[$key]);

            if ($value !== null) {
                $clean[$key] = $value;
            }
        }

        return $clean;
    }

    private static function cleanValue(string $key, mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;
        $negative = ! in_array($key, self::NON_NEGATIVE, true);

        return match (self::KEYS[$key][1]) {
            'length' => CssValue::length($value, negative: $negative),
            'color' => CssValue::color($value),
            'font' => CssValue::font($value),
            'weight' => CssValue::fontWeight($value),
            'line_height' => CssValue::number($value, self::LINE_HEIGHT_MIN, self::LINE_HEIGHT_MAX) ?? CssValue::length($value, negative: $negative),
            'choice' => is_string($value) && in_array($value, self::CHOICES[$key], true) ? $value : null,
            'radius' => $value === 'kit:radius' ? $value : CssValue::length($value, negative: $negative),
            'shadow' => is_string($value) && in_array($value, self::SHADOWS, true) ? $value : null,
            'opacity' => CssValue::number($value, self::OPACITY_MIN, self::OPACITY_MAX),
            default => null,
        };
    }

    private static function valueCss(string $type, string $value): string
    {
        return match ($type) {
            'color' => CssValue::colorCss($value),
            'font' => CssValue::fontCss($value),
            'radius' => $value === 'kit:radius' ? 'var(--kit-radius)' : $value,
            'shadow' => $value === 'none' ? 'none' : 'var(--kit-shadow-'.$value.')',
            default => $value,
        };
    }
}
