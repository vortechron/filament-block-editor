<?php

namespace Vortechron\FilamentBlockEditor\Styling;

/**
 * A developer's own CSS for one section or block (`advanced.css`). The word
 * `selector` stands for the element itself (Elementor's rule), so
 * `selector .bn-button { ... }` styles the buttons inside it.
 *
 * clean() drops the whole value when any part fails, so a value either
 * reaches the page as written (minus comments) or not at all:
 *
 * - no `<` at all, so it can never close the <style> it is printed in;
 * - no `@import`, `expression(`, `javascript:`, `behavior:` or `-moz-binding`,
 *   checked after CSS escapes are decoded;
 * - `url()` only with `https://` or a path on this site (`/path`);
 * - braces in balance, and at most MAX_LENGTH characters.
 */
final class CustomCss
{
    public const MAX_LENGTH = 5000;

    private const BANNED = '~@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding~';

    public static function clean(mixed $css): ?string
    {
        if (! is_string($css) || strlen($css) > self::MAX_LENGTH || str_contains($css, '<')) {
            return null;
        }

        $css = self::withoutComments($css);

        if ($css === null || trim($css) === '') {
            return null;
        }

        $decoded = strtolower(self::decodeEscapes($css));

        if (str_contains($decoded, '<') || preg_match(self::BANNED, $decoded) === 1 || ! self::urlsAllowed($decoded) || ! self::balanced($css)) {
            return null;
        }

        return trim($css);
    }

    /**
     * Cleaned CSS with `selector` replaced by the element's selector. Plain
     * declarations, with no rule around them, apply to the element.
     */
    public static function scope(string $css, string $selector): string
    {
        if (! str_contains($css, '{')) {
            return $selector.'{'.$css.'}';
        }

        return (string) preg_replace_callback('/(?<![\w-])selector(?![\w-])/', fn (): string => $selector, $css);
    }

    /**
     * The CSS without comments, or null when a comment is never closed.
     */
    private static function withoutComments(string $css): ?string
    {
        $css = (string) preg_replace('~/\*.*?\*/~s', '', $css);

        return str_contains($css, '/*') ? null : $css;
    }

    /**
     * CSS escapes (`\73`, `\:`) as the characters they stand for, so a
     * banned word cannot hide behind them.
     */
    private static function decodeEscapes(string $css): string
    {
        $css = (string) preg_replace_callback('/\\\\([0-9a-fA-F]{1,6})\s?/', fn (array $match): string => mb_chr(hexdec($match[1]) ?: 0xFFFD) ?: '', $css);

        return (string) preg_replace('/\\\\(.)/s', '$1', $css);
    }

    /**
     * Every url() points at https:// or a path on this site, and is closed.
     */
    private static function urlsAllowed(string $decoded): bool
    {
        if (preg_match_all('/url\s*\(/', $decoded) !== preg_match_all('/url\s*\(\s*([\'"]?)([^\'")]*)\1\s*\)/', $decoded, $matches)) {
            return false;
        }

        foreach ($matches[2] as $url) {
            if (preg_match('~^(https://|/(?!/))~', trim($url)) !== 1) {
                return false;
            }
        }

        return true;
    }

    private static function balanced(string $css): bool
    {
        $depth = 0;

        foreach (str_split($css) as $character) {
            $depth += match ($character) {
                '{' => 1,
                '}' => -1,
                default => 0,
            };

            if ($depth < 0) {
                return false;
            }
        }

        return $depth === 0;
    }
}
