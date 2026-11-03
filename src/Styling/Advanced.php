<?php

namespace Vortechron\FilamentBlockEditor\Styling;

/**
 * The advanced settings of a section or a block:
 *
 *     ['class' => 'price-card wide', 'css' => 'selector .bn-button { ... }', 'hide_on' => ['phone']]
 *
 * - `class`: up to MAX_CLASSES class names added to the element. Names that
 *   start with `fbe-` are the package's own style hooks, so they are not
 *   allowed.
 * - `css`: developer only (Content\PageValue::guard), cleaned by CustomCss.
 * - `hide_on`: the devices the element is hidden on.
 *
 * Empty and unknown keys are left out, so an element with no advanced
 * settings has `[]`.
 */
final class Advanced
{
    public const MAX_CLASSES = 5;

    public const DEVICES = ['desktop', 'tablet', 'phone'];

    /**
     * @return array{class?: string, css?: string, hide_on?: list<string>}
     */
    public static function clean(mixed $advanced): array
    {
        if (! is_array($advanced)) {
            return [];
        }

        $class = self::classes($advanced['class'] ?? null);
        $css = CustomCss::clean($advanced['css'] ?? null);
        $hideOn = is_array($advanced['hide_on'] ?? null)
            ? array_values(array_intersect(self::DEVICES, array_filter($advanced['hide_on'], is_string(...))))
            : [];

        return [
            ...($class === '' ? [] : ['class' => $class]),
            ...($css === null ? [] : ['css' => $css]),
            ...($hideOn === [] ? [] : ['hide_on' => $hideOn]),
        ];
    }

    private static function classes(mixed $value): string
    {
        if (! is_string($value)) {
            return '';
        }

        $names = array_filter(
            preg_split('/\s+/', trim($value)) ?: [],
            fn (string $name): bool => preg_match('/^[A-Za-z][A-Za-z0-9_-]{0,40}$/', $name) === 1 && ! str_starts_with(strtolower($name), 'fbe-'),
        );

        return implode(' ', array_slice(array_values(array_unique($names)), 0, self::MAX_CLASSES));
    }
}
