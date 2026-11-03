<?php

namespace Vortechron\FilamentBlockEditor\Styling;

use Vortechron\FilamentBlockEditor\Design\Fonts;

/**
 * The value grammar of a style bag (StyleBag) and the design kit. Every
 * method returns the cleaned value, or null when the value does not fit,
 * so nothing but these shapes ever reaches a stylesheet:
 *
 * - length: `0`, or a number with at most 3 decimals and a unit px, rem,
 *   em, %, vw or vh. At most 2000px, 200rem or em, 100% / vw / vh. Stored
 *   in lower case with a leading zero (`.5REM` is `0.5rem`).
 * - colour: `#rgb`, `#rrggbb`, `#rrggbbaa` (lower case), `transparent`,
 *   or `kit:<key>`, a design kit colour.
 * - font: `kit:heading`, `kit:body`, or a key of Design\Fonts.
 */
final class CssValue
{
    /**
     * The length units, each with the largest number it allows.
     */
    public const LENGTH_UNITS = ['px' => 2000, 'rem' => 200, 'em' => 200, '%' => 100, 'vw' => 100, 'vh' => 100];

    public const FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800', '900'];

    public const KIT_KEY = '[a-z0-9-]{1,30}';

    /**
     * A number with no sign: up to 4 digits and at most 3 decimals, or
     * only decimals (`.5`).
     */
    private const NUMBER = '\d{1,4}(?:\.\d{1,3})?|\.\d{1,3}';

    /**
     * A length, stored in lower case with a leading zero (`.5REM` is
     * `0.5rem`). Negative only when `$negative`.
     */
    public static function length(mixed $value, bool $negative = false): ?string
    {
        if ($value === 0 || $value === '0') {
            return '0';
        }

        $units = implode('|', array_map(fn (string $unit): string => preg_quote($unit, '/'), array_keys(self::LENGTH_UNITS)));

        if (! is_string($value) || preg_match('/^(-?)('.self::NUMBER.')('.$units.')$/', strtolower(trim($value)), $match) !== 1) {
            return null;
        }

        if ($match[1] === '-' && ! $negative) {
            return null;
        }

        return (float) $match[2] <= self::LENGTH_UNITS[$match[3]] ? $match[1].self::leadingZero($match[2]).$match[3] : null;
    }

    /**
     * @param  bool  $kit  whether `kit:<key>` and `transparent` are allowed
     */
    public static function color(mixed $value, bool $kit = true): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = strtolower(trim($value));

        if (preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/', $value) === 1) {
            return $value;
        }

        return $kit && ($value === 'transparent' || preg_match('/^kit:'.self::KIT_KEY.'$/', $value) === 1) ? $value : null;
    }

    public static function font(mixed $value): ?string
    {
        return in_array($value, ['kit:heading', 'kit:body'], true) || Fonts::has($value) ? $value : null;
    }

    /**
     * A number from `$min` to `$max` with at most 3 decimals, as text.
     */
    public static function number(mixed $value, float $min, float $max): ?string
    {
        if (is_bool($value) || (! is_int($value) && ! is_float($value) && ! is_string($value))) {
            return null;
        }

        $text = is_string($value) ? trim($value) : (string) $value;

        if (preg_match('/^'.self::NUMBER.'$/', $text) !== 1) {
            return null;
        }

        return (float) $text >= $min && (float) $text <= $max ? self::leadingZero($text) : null;
    }

    /**
     * `.5` as `0.5`.
     */
    private static function leadingZero(string $number): string
    {
        return str_starts_with($number, '.') ? '0'.$number : $number;
    }

    /**
     * `300` to `900` in steps of 100, as text.
     */
    public static function fontWeight(mixed $value): ?string
    {
        $text = is_int($value) ? (string) $value : (is_string($value) ? trim($value) : '');

        return in_array($text, self::FONT_WEIGHTS, true) ? $text : null;
    }

    /**
     * A cleaned colour as CSS.
     */
    public static function colorCss(string $color): string
    {
        return str_starts_with($color, 'kit:') ? 'var(--kit-color-'.substr($color, 4).')' : $color;
    }

    /**
     * A cleaned font as a font-family list.
     */
    public static function fontCss(string $font): string
    {
        return match ($font) {
            'kit:heading' => 'var(--kit-font-heading)',
            'kit:body' => 'var(--kit-font-body)',
            default => Fonts::stack($font) ?? 'inherit',
        };
    }
}
