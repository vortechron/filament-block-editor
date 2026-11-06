<?php

namespace Vortechron\FilamentBlockEditor\Content;

use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;

/** @internal Missing custom definitions keep stored data opaque until they return. */
final class MissingBlockData
{
    public static function isMissing(array $block): bool
    {
        return ($block['type'] ?? null) === 'ownBlock'
            && app(BlockRegistry::class)->get($block['props']['kind'] ?? '') === null;
    }

    /** A client can keep or remove a stored missing block, but cannot rewrite or invent it. */
    public static function restore(array $new, array $stored): array
    {
        $frozen = self::index($stored);
        $restore = function (array $blocks) use (&$restore, $frozen): array {
            foreach ($blocks as &$block) {
                if (isset($frozen[$block['id'] ?? ''])) {
                    $block = $frozen[$block['id']];

                    continue;
                }
                if (self::isMissing($block)) {
                    throw new InvalidArgumentException(__('filament-block-editor::builder.errors.missing_block_reuse', [], ContentLocale::panel()));
                }
                if (isset($block['children'])) {
                    $block['children'] = $restore($block['children']);
                }
            }

            return $blocks;
        };
        foreach ($new['sections'] as &$section) {
            if ($section['type'] === 'rich') {
                $section['data']['document'] = $restore($section['data']['document']);
            }
        }

        return $new;
    }

    /** Only flat strings scoped to a missing block are retained; none are applied or inferred. */
    public static function overrides(array $base, array $overrides): array
    {
        $frozen = self::index($base);
        $kept = [];
        foreach ($overrides as $key => $value) {
            if (is_string($key) && is_string($value) && preg_match('~^block:([^/]+)/~', $key, $match) && isset($frozen[$match[1]])) {
                $kept[$key] = $value;
            }
        }

        return $kept;
    }

    /** @return array<string, array<string, mixed>> */
    private static function index(array $value): array
    {
        $blocks = [];
        $collect = function (array $items, bool $insideMissing = false) use (&$collect, &$blocks): void {
            foreach ($items as $block) {
                $missing = $insideMissing || self::isMissing($block);
                if ($missing && isset($block['id'])) {
                    $blocks[$block['id']] = $block;
                }
                $collect($block['children'] ?? [], $missing);
            }
        };
        foreach ($value['sections'] as $section) {
            if ($section['type'] === 'rich') {
                $collect($section['data']['document']);
            }
        }

        return $blocks;
    }
}
