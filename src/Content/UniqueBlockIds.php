<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;

/**
 * Block ids are unique on a page: a block's style (`.fbe-b-{id}`),
 * `hide_on`, a form's `form-{id}` anchor and `_form` key, and the guard
 * (PageGuard, DeveloperData) all find a block by its id. A copy of a
 * section that kept its blocks' ids would share all of them.
 *
 * apply() keeps the first block with an id, in page order and through
 * columns and children, and gives every later block with the same id a
 * new one. Blocks with no id are left alone.
 */
final class UniqueBlockIds
{
    /**
     * @param  list<array<string, mixed>>  $sections  cleaned sections
     * @return list<array<string, mixed>>
     */
    public static function apply(array $sections): array
    {
        $seen = [];
        $unique = [];

        foreach ($sections as $section) {
            if (is_array($section['data']['document'] ?? null)) {
                [$section['data']['document'], $seen] = self::blocks($section['data']['document'], $seen);
            }

            $unique[] = $section;
        }

        return $unique;
    }

    /**
     * @param  array<mixed>  $blocks
     * @param  array<string, true>  $seen
     * @return array{0: array<mixed>, 1: array<string, true>}
     */
    private static function blocks(array $blocks, array $seen): array
    {
        $unique = [];

        foreach ($blocks as $block) {
            if (is_array($block)) {
                $id = BlockNoteDocument::blockId($block['id'] ?? null);

                if ($id !== null && isset($seen[$id])) {
                    $id = self::newId($seen);
                    $block['id'] = $id;
                }

                if ($id !== null) {
                    $seen[$id] = true;
                }

                if (is_array($block['children'] ?? null)) {
                    [$block['children'], $seen] = self::blocks($block['children'], $seen);
                }
            }

            $unique[] = $block;
        }

        return [$unique, $seen];
    }

    /**
     * @param  array<string, true>  $taken
     */
    private static function newId(array $taken): string
    {
        do {
            $id = Str::lower(Str::random(8));
        } while (isset($taken[$id]));

        return $id;
    }
}
