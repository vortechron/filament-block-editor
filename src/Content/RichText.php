<?php

namespace Vortechron\FilamentBlockEditor\Content;

use InvalidArgumentException;
use JsonException;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;
use Vortechron\FilamentBlockEditor\Support\Urls;

/** @internal The complete inline value of one language field, never a text-run address. */
final class RichText
{
    public const MAX_BYTES = 100000;

    public static function encode(mixed $content): string
    {
        if (is_string($content)) {
            $content = $content === '' ? [] : [['type' => 'text', 'text' => $content, 'styles' => []]];
        }
        $content ??= [];
        $content = self::items($content, self::keys($content));
        $json = json_encode(['version' => 1, 'content' => self::wire($content)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        self::size($json);

        return $json;
    }

    public static function decode(string $json, array $permittedKeys = []): array
    {
        self::size($json);
        try {
            $value = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_json', [], ContentLocale::panel()));
        }
        if (! is_array($value) || array_diff(array_keys($value), ['version', 'content']) !== [] || ! array_key_exists('content', $value) || ! array_key_exists('version', $value) || $value['version'] !== 1) {
            throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_version', [], ContentLocale::panel()));
        }

        return self::items($value['content'], $permittedKeys);
    }

    public static function keys(mixed $content): array
    {
        $keys = [];
        if (! is_array($content)) {
            return [];
        }
        foreach ($content as $item) {
            if (! is_array($item)) {
                continue;
            }
            if (($item['type'] ?? '') === 'dynamic' && is_string($item['props']['key'] ?? null)) {
                $keys[] = $item['props']['key'];
            }
            if (isset($item['content'])) {
                $keys = [...$keys, ...self::keys($item['content'])];
            }
        }

        return array_unique($keys);
    }

    public static function probe(string $value): string
    {
        $content = self::decode($value, self::keys(json_decode($value, true)['content'] ?? []));
        $replace = function (array $items) use (&$replace): array {
            foreach ($items as &$item) {
                if ($item['type'] === 'text') {
                    $item['text'] = '__translation_permission_probe__';
                }
                if ($item['type'] === 'link') {
                    $item['content'] = $replace($item['content']);
                }
            }

            return $items;
        };
        $content = $replace($content);
        // An empty field (or one containing only chips) must be probed too.
        $content[] = ['type' => 'text', 'text' => '__translation_permission_probe__', 'styles' => []];

        return self::encode($content);
    }

    private static function wire(array $content): array
    {
        foreach ($content as &$item) {
            if ($item['type'] === 'text') {
                $item['styles'] = (object) $item['styles'];
            }
            if ($item['type'] === 'link') {
                $item['content'] = self::wire($item['content']);
            }
        }

        return $content;
    }

    private static function items(mixed $items, array $permittedKeys, bool $insideLink = false): array
    {
        if (! is_array($items) || ! array_is_list($items) || count($items) > 2000) {
            self::invalid();
        }
        $clean = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                self::invalid();
            }
            switch ($item['type'] ?? null) {
                case 'text':
                    self::only($item, ['type', 'text', 'styles']);
                    if (! is_string($item['text'] ?? null) || ! is_array($item['styles'] ?? [])) {
                        self::invalid();
                    }
                    $styles = $item['styles'] ?? [];
                    foreach ($styles as $key => $value) {
                        if (in_array($key, ['bold', 'italic', 'underline', 'strike', 'code'], true)) {
                            if (! is_bool($value)) {
                                self::invalid();
                            }
                        } elseif (in_array($key, ['textColor', 'backgroundColor', 'fontFamily'], true)) {
                            if (! is_string($value) || strlen($value) > 200) {
                                self::invalid();
                            }
                        } else {
                            self::invalid();
                        }
                    }
                    $clean[] = ['type' => 'text', 'text' => $item['text'], 'styles' => $styles];
                    break;
                case 'link':
                    self::only($item, ['type', 'href', 'content']);
                    if ($insideLink || ! is_string($item['href'] ?? null) || Urls::linkOrReference($item['href']) === null) {
                        throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_link', [], ContentLocale::panel()));
                    }
                    $clean[] = ['type' => 'link', 'href' => $item['href'], 'content' => self::items($item['content'] ?? null, $permittedKeys, true)];
                    break;
                case 'dynamic':
                    self::only($item, ['type', 'props']);
                    if (! is_array($item['props'] ?? null)) {
                        self::invalid();
                    }
                    self::only($item['props'], ['key']);
                    $key = $item['props']['key'] ?? null;
                    if (! DynamicValues::isKey($key) || (! in_array($key, $permittedKeys, true) && ! app(DynamicValues::class)->has($key))) {
                        throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_chip', [], ContentLocale::panel()));
                    }
                    $clean[] = ['type' => 'dynamic', 'props' => ['key' => $key]];
                    break;
                default: self::invalid();
            }
        }

        return $clean;
    }

    private static function only(array $value, array $keys): void
    {
        if (array_diff(array_keys($value), $keys)) {
            self::invalid();
        }
    }

    private static function size(string $json): void
    {
        if (strlen($json) > self::MAX_BYTES) {
            throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_large', [], ContentLocale::panel()));
        }
    }

    private static function invalid(): never
    {
        throw new InvalidArgumentException(__('filament-block-editor::builder.errors.rich_invalid', [], ContentLocale::panel()));
    }
}
