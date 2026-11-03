<?php

namespace Vortechron\FilamentBlockEditor\Templates;

use Closure;
use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\Content\PageContent;

/**
 * Ready-made sections for the builder's "add" panel, in Malay and English.
 * The copy is generic, so it fits any kind of page. Photos and videos start
 * empty: the builder shows a spot that says where they go, and visitors
 * never see an empty one.
 *
 * all() returns what the builder gets as JSON:
 *
 *     [['key' => 'hero', 'label' => 'Hero', 'category' => 'First screen',
 *       'description' => '...', 'section' => ['id' => 'a1b2c3d4', 'type' => 'rich', 'data' => [...]]], ...]
 *
 * Every `section` is a full section value that PageContent::normalize()
 * leaves as it is. A host adds its own with register().
 */
final class SectionTemplates
{
    public const LOCALES = ['ms', 'en'];

    public const FALLBACK_LOCALE = 'en';

    /**
     * @var array<string, array{label: string, category: string, description: string, section: array<string, mixed>|Closure(string): array<string, mixed>}>
     */
    private static array $registered = [];

    /**
     * Every template, in the language of `$locale` ("ms" or "en"; anything
     * else is English): the built-in ones, then the host's own.
     *
     * @return list<array{key: string, label: string, category: string, description: string, section: array{id: string, type: string, data: array<string, mixed>}}>
     */
    public static function all(string $locale): array
    {
        $locale = in_array($locale, self::LOCALES, true) ? $locale : self::FALLBACK_LOCALE;
        $templates = [];

        foreach (BuiltInTemplates::all($locale) as $template) {
            $templates[$template['key']] = $template;
        }

        // A host template with a built-in key takes the built-in's place.
        foreach (self::$registered as $key => $registered) {
            $templates[$key] = [
                'key' => $key,
                'label' => $registered['label'],
                'category' => $registered['category'],
                'description' => $registered['description'],
                'section' => self::section($key, $registered['section'], $locale),
            ];
        }

        return array_values($templates);
    }

    /**
     * Adds a template of your own to the builder's panel. `$section` is a
     * full section value (`['type' => 'rich', 'data' => [...]]`; an id is
     * given if it has none), or a closure that gets the locale and returns
     * one. Using a key again replaces the template, a built-in one included.
     *
     * @param  array<string, mixed>|Closure(string): array<string, mixed>  $section
     */
    public static function register(string $key, string $label, string $category, array|Closure $section, string $description = ''): void
    {
        if (preg_match('/^[A-Za-z0-9_-]+$/', $key) !== 1) {
            throw new InvalidArgumentException("A template key may only hold letters, digits, dashes and underscores. Got [{$key}].");
        }

        // Fail now, not when the builder opens.
        self::section($key, $section, self::FALLBACK_LOCALE);

        self::$registered[$key] = ['label' => $label, 'category' => $category, 'description' => $description, 'section' => $section];
    }

    public static function flushRegistered(): void
    {
        self::$registered = [];
    }

    /**
     * @param  array<string, mixed>|Closure(string): array<string, mixed>  $section
     * @return array{id: string, type: string, data: array<string, mixed>}
     */
    private static function section(string $key, array|Closure $section, string $locale): array
    {
        $section = $section instanceof Closure ? $section($locale) : $section;
        $normalized = PageContent::normalize([['id' => $section['id'] ?? PageContent::newId(), ...$section]]);

        if (($normalized[0]['type'] ?? null) !== PageContent::TYPE) {
            throw new InvalidArgumentException("The [{$key}] template is not a section. It needs 'type' => '".PageContent::TYPE."' and a 'data' array.");
        }

        return $normalized[0];
    }
}
