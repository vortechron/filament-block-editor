<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Closure;
use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;

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

        $base = ['version' => self::VERSION, 'sections' => PageContent::normalize(is_array($value['sections'] ?? null) ? $value['sections'] : [])];
        if (is_array($value['translations'] ?? null)) {
            $base = TextTranslations::ensureIds($base);
        }
        $translations = [];
        foreach (is_array($value['translations'] ?? null) ? $value['translations'] : [] as $locale => $overrides) {
            if (is_string($locale) && preg_match('/^[a-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/D', $locale) && is_array($overrides)) {
                $translations[$locale] = TextTranslations::normalizeOverrides($base, $overrides);
                foreach (TextTranslations::apply($base, $translations[$locale])['sections'] as $section) {
                    if ($section['type'] === 'rich' && BlockNoteDocument::isTooBig($section['data']['document'])) {
                        throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_large', [], ContentLocale::panel()));
                    }
                }
            }
        }

        return [...$base, ...($translations === [] ? [] : ['translations' => $translations])];
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
            "{$attribute}.translations" => ['sometimes', 'array', 'max:30'],
            "{$attribute}.translations.*" => ['array', 'max:10000'],
            "{$attribute}.translations.*.*" => ['string', 'max:100000'],
            ...PageContent::rules("{$attribute}.sections"),
        ];
    }

    /**
     * The value a person who is not a developer may save: the new value
     * with the stored developer-only data and every lock put back (see
     * PageGuard). Run it on every save by someone who is not a developer;
     * running it twice changes nothing.
     *
     * @param  array<mixed>  $new  a page value of any format
     * @param  array<mixed>  $stored  the stored page value, of any format
     * @return array{version: int, sections: list<array<string, mixed>>}
     */
    public static function guard(array $new, array $stored): array
    {
        $new = self::normalize($new);
        $stored = self::normalize($stored);
        $new = MissingBlockData::restore($new, $stored);
        $base = self::normalize(PageGuard::apply($new['sections'], $stored['sections']));
        if (! isset($new['translations']) && ! isset($stored['translations'])) {
            return $base;
        }
        $words = TextTranslations::textFields($base);
        $probeWords = TextTranslations::permissionProbe($base);
        $probe = TextTranslations::apply($base, $probeWords);
        $probe['sections'] = PageGuard::apply($probe['sections'], $stored['sections']);
        $editable = TextTranslations::textFields($probe);
        $translations = [];
        foreach (array_unique([...array_keys($new['translations'] ?? []), ...array_keys($stored['translations'] ?? [])]) as $locale) {
            $overrides = MissingBlockData::overrides($base, $stored['translations'][$locale] ?? []);
            foreach ($words as $key => $_) {
                $source = ($editable[$key] ?? null) === $probeWords[$key] ? ($new['translations'][$locale] ?? []) : ($stored['translations'][$locale] ?? []);
                if (array_key_exists($key, $source)) {
                    $overrides[$key] = $source[$key];
                    if (array_key_exists($key.'/_empty_fallback', $source)) {
                        $overrides[$key.'/_empty_fallback'] = $source[$key.'/_empty_fallback'];
                    }
                }
            }
            $translations[$locale] = $overrides;
        }

        return self::normalize([...$base, ...($translations === [] ? [] : ['translations' => $translations])]);
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
