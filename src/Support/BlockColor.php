<?php

namespace Vortechron\FilamentBlockEditor\Support;

/**
 * Small helpers for the hex colours a content block stores: normalise what the
 * user typed, and decide whether text on top of a colour should be light.
 *
 * Every colour that reaches an inline style goes through hex() first, so a
 * bad value can never break out of the style attribute.
 */
final class BlockColor
{
    public const HEX_PATTERN = '/^#?([0-9a-f]{6})$/i';

    /**
     * A lowercase "#rrggbb" string, or the default when the value is not a
     * six-digit hex colour.
     */
    public static function hex(mixed $value, ?string $default = null): ?string
    {
        if (! is_string($value) || ! preg_match(self::HEX_PATTERN, trim($value), $matches)) {
            return $default;
        }

        return '#'.strtolower($matches[1]);
    }

    /**
     * True when the colour is dark enough that text on it should be white.
     * Uses the YIQ brightness formula, which weighs green more than blue the
     * way the eye does.
     */
    public static function isDark(string $hex): bool
    {
        $normalised = self::hex($hex);

        if ($normalised === null) {
            return false;
        }

        [$red, $green, $blue] = sscanf($normalised, '#%02x%02x%02x');

        return (($red * 299) + ($green * 587) + ($blue * 114)) / 1000 < 128;
    }

    /**
     * Keep an integer between two bounds. Used for the tint opacity and blur.
     */
    public static function clamp(mixed $value, int $min, int $max): int
    {
        return min(max((int) $value, $min), $max);
    }
}
