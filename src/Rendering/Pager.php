<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

/**
 * Page buttons for a long list in a block. Cut the list with pages(), draw
 * each page's HTML, then hand them to the `filament-block-editor::pager`
 * view, which puts ‹ 1 / 3 › under each page:
 *
 *     $pages = Pager::pages($items, $perPage, $paged);
 *     view('filament-block-editor::pager', ['name' => Pager::name($block), 'pages' => $html]);
 *
 * No JavaScript: one hidden radio button per page picks the page the page
 * stylesheet shows (pager.css), so it works in the builder and on a page
 * with scripts off. Without the stylesheet every page shows.
 */
final class Pager
{
    /**
     * pager.css shows up to this many pages.
     */
    public const MAX_PAGES = 12;

    /**
     * Blocks drawn without an id, in this request.
     */
    private static int $unnamed = 0;

    /**
     * The list cut into pages of $perPage; only the first page when it is
     * not $paged. At most MAX_PAGES pages.
     *
     * @template T
     *
     * @param  list<T>  $items
     * @return list<list<T>>
     */
    public static function pages(array $items, int $perPage, bool $paged = true): array
    {
        $chunks = array_chunk(array_values($items), max(1, $perPage));

        return array_slice($chunks, 0, $paged ? self::MAX_PAGES : 1);
    }

    /**
     * The name of a block's pages, from its id, so two lists on one page
     * never turn each other's pages.
     *
     * @param  array<mixed>  $block  the BlockNote block
     */
    public static function name(array $block): string
    {
        $id = is_string($block['id'] ?? null) ? trim((string) preg_replace('/[^A-Za-z0-9_-]+/', '-', $block['id']), '-') : '';

        return $id !== '' ? $id : 'p'.(++self::$unnamed);
    }
}
