<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Closure;

/**
 * The whole stored value of a page, with its format version:
 *
 *     ['version' => 2, 'sections' => [...]]   // sections: Content\PageContent
 *
 * A value with no version is format 1: a bare list of sections, or
 * `['sections' => [...]]`. Every stored value is upgraded when it is read,
 * by upgrade steps run in order, so old content never needs a data
 * migration.
 *
 * normalize() is the only way a page should reach your storage. guard()
 * runs on top of it when the person saving is not a developer.
 */
final class PageValue
{
    public const VERSION = 2;

    /**
     * Upgrade steps added by registerUpgrade(), by the version they read.
     *
     * @var array<int, Closure(array<mixed>): array<mixed>>
     */
    private static array $upgrades = [];

    /**
     * A format 2 value from any older value, sections not cleaned yet. A
     * JSON string is read first; anything that is not a page is an empty
     * page. A version below 1, or one that is not a whole number, counts
     * as 1; a version above VERSION counts as VERSION. So a stored or
     * posted version can never make the steps below run more than
     * VERSION - 1 times.
     *
     * @return array<string, mixed>
     */
    public static function upgrade(mixed $raw): array
    {
        if (is_string($raw)) {
            $raw = json_decode($raw, true);
        }

        if (! is_array($raw)) {
            return ['version' => self::VERSION, 'sections' => []];
        }

        if (array_is_list($raw)) {
            $raw = ['version' => 1, 'sections' => $raw];
        }

        $version = is_int($raw['version'] ?? null) ? max(1, min(self::VERSION, $raw['version'])) : 1;
        $value = $raw;

        while ($version < self::VERSION) {
            $step = self::steps()[$version] ?? null;
            $value = $step === null ? $value : $step($value);
            $version++;
        }

        return [...(is_array($value) ? $value : []), 'version' => self::VERSION];
    }

    /**
     * The upgraded value, every section cleaned (PageContent::normalize),
     * and nothing else kept.
     *
     * @return array{version: int, sections: list<array<string, mixed>>}
     */
    public static function normalize(mixed $raw): array
    {
        $value = self::upgrade($raw);

        return [
            'version' => self::VERSION,
            'sections' => PageContent::normalize(is_array($value['sections'] ?? null) ? $value['sections'] : []),
        ];
    }

    /**
     * Request validation for the outer shape of a page value. Fields are
     * cleaned by normalize(), so these rules only guard the shape.
     *
     * @return array<string, list<mixed>>
     */
    public static function rules(string $attribute = 'value'): array
    {
        return [
            $attribute => ['required', 'array'],
            "{$attribute}.version" => ['sometimes', 'integer', 'min:1', 'max:'.self::VERSION],
            ...PageContent::rules("{$attribute}.sections"),
        ];
    }

    /**
     * Adds (or replaces) the step that upgrades a value of version `$from`
     * to `$from + 1` (1 <= $from < VERSION; other steps never run). The
     * step gets the value and returns the new one.
     *
     * @param  Closure(array<mixed>): array<mixed>  $step
     */
    public static function registerUpgrade(int $from, Closure $step): void
    {
        self::$upgrades[$from] = $step;
    }

    /**
     * Back to the package's own steps only.
     */
    public static function forgetUpgrades(): void
    {
        self::$upgrades = [];
    }

    /**
     * @return array<int, Closure(array<mixed>): array<mixed>>
     */
    private static function steps(): array
    {
        return self::$upgrades + [
            // Format 1 to 2: the same sections, now with a version.
            1 => fn (array $value): array => $value,
        ];
    }
}
