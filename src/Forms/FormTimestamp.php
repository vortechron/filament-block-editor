<?php

namespace Vortechron\FilamentBlockEditor\Forms;

/**
 * The `_t` field of a form: when the page was drawn, signed with the app
 * key, so the host can refuse a form sent too fast (a bot) or a forged
 * time. `issue()` writes it; `age()` reads it back.
 */
final class FormTimestamp
{
    public static function issue(): string
    {
        $time = (string) now()->getTimestamp();

        return $time.'.'.self::sign($time);
    }

    /**
     * Seconds since the value was issued, or null when it is not one this
     * app signed.
     */
    public static function age(mixed $value): ?int
    {
        if (! is_string($value) || preg_match('/^(\d{1,12})\.([0-9a-f]{64})$/', $value, $match) !== 1 || ! hash_equals(self::sign($match[1]), $match[2])) {
            return null;
        }

        return now()->getTimestamp() - (int) $match[1];
    }

    private static function sign(string $time): string
    {
        return hash_hmac('sha256', 'filament-block-editor.form|'.$time, (string) config('app.key'));
    }
}
