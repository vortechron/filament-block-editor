<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;

/** @internal Presence of an intentionally blank, declared own-block text field. */
final class OwnTextPresence
{
    public static function clean(array $block): array
    {
        if (($block['type'] ?? null) !== 'ownBlock' || MissingBlockData::isMissing($block)) {
            return $block;
        }
        $blank = self::blankFields($block);
        unset($block['_translated_empty']);

        return [...$block, ...($blank === [] ? [] : ['_translated_empty' => $blank])];
    }

    public static function mark(array $block, array $fields, array $automatic = []): array
    {
        $block['_translated_empty'] = array_values(array_diff([...self::blankFields($block), ...$fields], $automatic));

        return self::clean($block);
    }

    public static function blankFields(array $block): array
    {
        $marker = $block['_translated_empty'] ?? null;
        if (! is_array($marker) || ! array_is_list($marker)) {
            return [];
        }
        $blank = [];
        foreach (self::slots($block) as $path => $slot) {
            if ($slot['value'] === '' && in_array($path, $marker, true)) {
                $blank[] = $path;
            }
        }

        return $blank;
    }

    /** Presence is part of protected words, even when the protected value itself is already blank. */
    public static function guard(array $block, ?array $stored): array
    {
        if (($block['type'] ?? null) !== 'ownBlock' || MissingBlockData::isMissing($block)) {
            return $block;
        }
        $blank = self::blankFields($block);
        $old = ($stored['props']['kind'] ?? null) === ($block['props']['kind'] ?? null) ? self::blankFields($stored ?? []) : [];
        foreach (self::slots($block) as $path => $slot) {
            if ($slot['protected']) {
                $blank = array_values(array_diff($blank, [$path]));
                if (in_array($path, $old, true)) {
                    $blank[] = $path;
                }
            }
        }
        unset($block['_translated_empty']);

        return self::mark($block, $blank);
    }

    public static function fallbackFields(array $block): array
    {
        return array_keys(array_filter(self::slots($block), fn (array $slot): bool => $slot['fallback']));
    }

    /** Stable declared paths also cover identified repeater rows. */
    private static function slots(array $block): array
    {
        $kind = $block['props']['kind'] ?? null;
        $fields = ($block['type'] ?? null) === 'ownBlock' && is_string($kind)
            ? (app(BlockRegistry::class)->get($kind)?->toArray()['fields'] ?? []) : [];
        $slots = [];
        $visit = function (array $fields, array $values, string $prefix = '', bool $protected = false) use (&$visit, &$slots): void {
            foreach ($fields as $field) {
                $path = $prefix.$field['name'];
                $private = $protected || ($field['developerOnly'] ?? false);
                $value = $values[$field['name']] ?? null;
                if (($field['translatable'] ?? false) && is_string($value)) {
                    $slots[$path] = ['value' => $value, 'protected' => $private, 'fallback' => $field['emptyFallback'] ?? false];
                }
                if ($field['type'] === 'list' && is_array($value)) {
                    foreach ($value as $row) {
                        if (is_array($row) && is_string($row['_id'] ?? null)) {
                            $visit($field['fields'] ?? [], $row, $path.'/row:'.$row['_id'].'/', $private);
                        }
                    }
                }
            }
        };
        $visit($fields, Blocks::decodeValues($block['props']['values'] ?? null));

        return $slots;
    }
}
