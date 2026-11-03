<?php

namespace Vortechron\FilamentBlockEditor\Styling;

/**
 * A developer's own CSS for one section or block (`advanced.css`). The word
 * `selector` stands for the element itself (Elementor's rule), so
 * `selector .bn-button { ... }` styles the buttons inside it.
 *
 * It is developer only, but it is still checked hard, because CSS that can
 * reach other elements (an attribute selector on the form's token, plus a
 * url()) can leak data. clean() drops the whole value when any check fails:
 *
 * - no `<` at all, so it can never close the <style> it is printed in;
 * - every rule's selectors each start with `selector`, also inside
 *   `@media` and `@supports`, the only at-rules allowed; plain
 *   declarations with no rule apply to the element;
 * - no selector reaches past the element: no `+` or `~` combinator, no
 *   `:root`, `:host` or `:has(`, and no attribute selector on `value`
 *   (so CSS cannot read a form's token);
 * - `url()` only with a path on this site (`/path`) of plain URL
 *   characters: no backslash, space or control character, and never
 *   `//` or `/\` at the start (browsers read both as another site); no `image-set()`,
 *   `src()`, `expression(`, `javascript:`, `behavior:` or `-moz-binding`,
 *   checked after CSS escapes are decoded;
 * - braces in balance, none hidden in a quote or behind a backslash, no
 *   nested rules, and at most MAX_LENGTH characters.
 */
final class CustomCss
{
    public const MAX_LENGTH = 5000;

    private const BANNED = '~@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|image-set\s*\(|(?<![\w-])src\s*\(~';

    /**
     * How deep @media and @supports may nest.
     */
    private const MAX_DEPTH = 3;

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

        if (str_contains($decoded, '<') || preg_match(self::BANNED, $decoded) === 1 || ! self::urlsAllowed($css) || ! self::urlsAllowed($decoded) || ! self::bracesShown($css, $decoded)) {
            return null;
        }

        $masked = self::withoutStrings($css);

        return $masked !== null && self::wellFormed($masked) ? trim($css) : null;
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
     * Every url() is closed and points at a path on this site made of plain
     * URL characters. Checked on the CSS as written and as decoded.
     */
    private static function urlsAllowed(string $css): bool
    {
        // A quoted address, or an unquoted one (which can hold no quote,
        // bracket or space).
        if (preg_match_all('/url\s*\(/i', $css) !== preg_match_all('/url\s*\(\s*(?:"([^"]*)"|\'([^\']*)\'|([^\'"()\s]*))\s*\)/i', $css, $matches, PREG_SET_ORDER)) {
            return false;
        }

        foreach ($matches as $match) {
            $url = ($match[1] ?? '').($match[2] ?? '').($match[3] ?? '');

            if (preg_match('~^/[A-Za-z0-9._\~!$&()*+,;=:@%/-]*$~', $url) !== 1 || in_array($url[1] ?? '', ['/', '\\'], true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * No brace comes from an escape (`\}`, `\7d`): the braces seen are the
     * braces the browser reads.
     */
    private static function bracesShown(string $css, string $decoded): bool
    {
        return preg_match('/\\\\[{}]/', $css) !== 1
            && substr_count($css, '{') === substr_count($decoded, '{')
            && substr_count($css, '}') === substr_count($decoded, '}');
    }

    /**
     * The CSS with each quoted string emptied, so commas and words inside
     * strings do not count. Null when a string holds a brace or a quote
     * is never closed.
     */
    private static function withoutStrings(string $css): ?string
    {
        $hidesBrace = false;
        $masked = (string) preg_replace_callback('/"(?:[^"\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\n]|\\\\.)*\'/s', function (array $match) use (&$hidesBrace): string {
            $hidesBrace = $hidesBrace || strpbrk($match[0], '{}') !== false;

            return '""';
        }, $css);

        return $hidesBrace || strpbrk(str_replace('""', '', $masked), '"\'') !== false ? null : $masked;
    }

    /**
     * Plain declarations, or a run of rules on the element and @media or
     *
     * @supports blocks of them.
     */
    private static function wellFormed(string $css): bool
    {
        if (strpbrk($css, '{}') === false) {
            return ! str_contains($css, '@');
        }

        return self::rules($css, 0);
    }

    private static function rules(string $css, int $depth): bool
    {
        $at = 0;
        $length = strlen($css);

        while (true) {
            while ($at < $length && ctype_space($css[$at])) {
                $at++;
            }

            if ($at >= $length) {
                return true;
            }

            $open = strpos($css, '{', $at);
            $close = $open === false ? false : self::closing($css, $open);

            if ($open === false || $close === null) {
                return false;
            }

            $prelude = trim(substr($css, $at, $open - $at));
            $body = substr($css, $open + 1, $close - $open - 1);

            if (strpbrk($prelude, '};') !== false || ! self::rule($prelude, $body, $depth)) {
                return false;
            }

            $at = $close + 1;
        }
    }

    private static function rule(string $prelude, string $body, int $depth): bool
    {
        if (str_starts_with($prelude, '@')) {
            return preg_match('/^@(media|supports)(?![\w-])/i', $prelude) === 1 && $depth < self::MAX_DEPTH && self::rules($body, $depth + 1);
        }

        if (strpbrk($body, '{}') !== false || $prelude === '') {
            return false;
        }

        foreach (self::selectors($prelude) as $selector) {
            if (preg_match('/^selector(?![\w-])/', trim($selector)) !== 1 || ! self::staysInside(strtolower(self::decodeEscapes($selector)))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether a selector (strings emptied, escapes decoded) only reaches
     * the element and what is inside it.
     */
    private static function staysInside(string $selector): bool
    {
        if (preg_match('/:(?:root|host|has)/', $selector) === 1 || preg_match('/\[\s*(?:[\w*-]*\|)?value(?![\w-])/', $selector) === 1) {
            return false;
        }

        $depth = 0;

        foreach (str_split($selector) as $character) {
            $depth += match ($character) {
                '(', '[' => 1,
                ')', ']' => -1,
                default => 0,
            };

            if ($depth === 0 && ($character === '+' || $character === '~')) {
                return false;
            }
        }

        return true;
    }

    /**
     * The position of the brace that closes the one at `$open`.
     */
    private static function closing(string $css, int $open): ?int
    {
        $depth = 0;

        for ($at = $open, $length = strlen($css); $at < $length; $at++) {
            $depth += match ($css[$at]) {
                '{' => 1,
                '}' => -1,
                default => 0,
            };

            if ($depth === 0) {
                return $at;
            }
        }

        return null;
    }

    /**
     * A selector list split at its top-level commas (not the ones inside
     * `:is(a, b)`).
     *
     * @return list<string>
     */
    private static function selectors(string $prelude): array
    {
        $selectors = [];
        $current = '';
        $depth = 0;

        foreach (str_split($prelude) as $character) {
            $depth += match ($character) {
                '(', '[' => 1,
                ')', ']' => -1,
                default => 0,
            };

            if ($character === ',' && $depth === 0) {
                $selectors[] = $current;
                $current = '';

                continue;
            }

            $current .= $character;
        }

        return [...$selectors, $current];
    }
}
