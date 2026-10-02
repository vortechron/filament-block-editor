<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Illuminate\Support\Str;

/**
 * Puts a BlockNote document into the exact shape the editor can open.
 *
 * The public page (BlockNoteRenderer) is forgiving, but the editor is not:
 * BlockNote reads a table's `content` as table rows only when it carries
 * `"type": "tableContent"`, and throws for any other object, so the whole
 * block refuses to load. Agents writing over MCP or the REST API leave that
 * key out easily, and the page still looks right, so the damage only shows
 * when someone next opens the page to edit it.
 */
final class BlockNoteDocument
{
    /**
     * @param  array<int, mixed>  $blocks
     * @return array<int, mixed>
     */
    public static function normalize(array $blocks): array
    {
        return array_map(self::normalizeBlock(...), $blocks);
    }

    private static function normalizeBlock(mixed $block): mixed
    {
        if (! is_array($block)) {
            return $block;
        }

        if (($block['type'] ?? null) === 'table' && self::isUntypedTableContent($block['content'] ?? null)) {
            $block['content'] = ['type' => 'tableContent', ...$block['content']];
        }

        // columnList holds its columns in `children`, and any block may hold
        // indented blocks the same way, so both are walked alike.
        if (is_array($block['children'] ?? null)) {
            $block['children'] = self::normalize($block['children']);
        }

        return $block;
    }

    private static function isUntypedTableContent(mixed $content): bool
    {
        return is_array($content)
            && ! isset($content['type'])
            && is_array($content['rows'] ?? null);
    }

    /**
     * A short name for a document: its first heading, or its first line of
     * text when it has no heading. The page builder labels each block with
     * it, so a collapsed block list still says which block is which.
     *
     * Livewire can briefly hold the document as JSON text, so a string is
     * decoded first.
     */
    public static function title(mixed $blocks, int $limit = 60): ?string
    {
        $blocks = is_string($blocks) ? json_decode($blocks, true) : $blocks;

        if (! is_array($blocks)) {
            return null;
        }

        $lines = self::textLines($blocks);
        $line = collect($lines)->firstWhere('heading', true) ?? ($lines[0] ?? null);

        return $line === null ? null : Str::limit($line['text'], $limit);
    }

    /**
     * Every block's text in reading order, walking columns and nested blocks.
     *
     * @param  array<int, mixed>  $blocks
     * @return list<array{text: string, heading: bool}>
     */
    private static function textLines(array $blocks): array
    {
        return collect($blocks)
            ->filter(fn (mixed $block): bool => is_array($block))
            ->flatMap(fn (array $block): array => [
                ['text' => Str::squish(self::inlineText($block['content'] ?? null)), 'heading' => ($block['type'] ?? null) === 'heading'],
                ...(is_array($block['children'] ?? null) ? self::textLines($block['children']) : []),
            ])
            ->filter(fn (array $line): bool => $line['text'] !== '')
            ->values()
            ->all();
    }

    /**
     * Inline content is a list of text and link items; a link holds its own
     * list. A table's content is an object of rows, which has no single line.
     */
    private static function inlineText(mixed $content): string
    {
        if (is_string($content)) {
            return $content;
        }

        if (! is_array($content) || ! array_is_list($content)) {
            return '';
        }

        return collect($content)
            ->map(fn (mixed $item): string => is_array($item)
                ? (string) ($item['text'] ?? '').self::inlineText($item['content'] ?? null)
                : '')
            ->implode('');
    }
}
