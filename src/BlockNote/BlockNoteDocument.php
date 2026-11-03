<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Styling\Look;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * A BlockNote document as a section stores it: the list of blocks the editor
 * saves.
 *
 * The renderer (BlockNoteRenderer) is forgiving, but the editor is not:
 * BlockNote reads a table's `content` as rows only when it carries
 * `"type": "tableContent"`, and refuses to open the whole document when it
 * is missing. clean() puts that back. It also keeps addresses safe: picture,
 * video, file and link addresses that are not allowed are emptied or
 * unwrapped before they are stored.
 *
 * A dynamic value (Content\DynamicValues) is kept: the inline content
 * `{ "type": "dynamic", "props": { "key": "site.phone" } }`, and a
 * reference such as `@site.whatsapp` in a link or `@entry.photo` in an
 * image or video address. The renderer resolves and checks them.
 *
 * Every block may carry a `look` prop (Styling\Look): it is cleaned and
 * stored again as compact JSON, or "" when empty. A block with a look
 * needs a stable id for its `fbe-b-{id}` class, so one without a usable id
 * gets one.
 */
final class BlockNoteDocument
{
    /**
     * The most a stored document may weigh, as JSON. A long page of text,
     * tables and columns stays well under this.
     */
    public const MAX_BYTES = 100_000;

    /**
     * Block types whose `url` prop is a picture, video, audio or file.
     */
    private const MEDIA_TYPES = ['image', 'video', 'audio', 'file', 'card'];

    /**
     * Media blocks whose address may be a dynamic value (`@entry.photo`).
     */
    private const DYNAMIC_MEDIA_TYPES = ['image', 'video'];

    /**
     * The longest an own block's kind may be.
     */
    private const MAX_KIND_LENGTH = 60;

    /**
     * The blocks of a stored document, or an empty document when the value
     * is not one or is too big to keep.
     *
     * @return list<array<string, mixed>>
     */
    public static function clean(mixed $document): array
    {
        if (! is_array($document) || ! array_is_list($document) || self::isTooBig($document)) {
            return [];
        }

        return self::cleanBlocks($document);
    }

    /**
     * The address of the first picture in a document, looking inside
     * columns, cards and indented blocks too.
     */
    public static function firstImageUrl(mixed $document): ?string
    {
        if (! is_array($document)) {
            return null;
        }

        foreach ($document as $block) {
            if (! is_array($block)) {
                continue;
            }

            $url = match ($block['type'] ?? null) {
                'image' => $block['props']['url'] ?? null,
                Blocks::GALLERY => Blocks::galleryUrls($block['props']['images'] ?? null)[0] ?? null,
                default => null,
            };

            if (Urls::media($url) !== null) {
                return Urls::media($url);
            }

            $nested = self::firstImageUrl($block['children'] ?? null);

            if ($nested !== null) {
                return $nested;
            }
        }

        return null;
    }

    /**
     * The words of a document in reading order, walking columns, cards and
     * indented blocks.
     */
    public static function text(mixed $document): string
    {
        if (! is_array($document)) {
            return '';
        }

        $lines = [];

        foreach ($document as $block) {
            if (! is_array($block)) {
                continue;
            }

            $lines[] = self::inlineText($block['content'] ?? null);
            $lines[] = self::text($block['children'] ?? null);
        }

        return trim(implode("\n", array_filter($lines, fn (string $line): bool => trim($line) !== '')));
    }

    public static function isTooBig(mixed $document): bool
    {
        return strlen((string) json_encode($document)) > self::MAX_BYTES;
    }

    /**
     * @param  array<mixed>  $blocks
     * @return list<array<string, mixed>>
     */
    private static function cleanBlocks(array $blocks): array
    {
        return array_values(array_map(
            self::cleanBlock(...),
            array_filter($blocks, is_array(...)),
        ));
    }

    /**
     * @param  array<mixed>  $block
     * @return array<string, mixed>
     */
    private static function cleanBlock(array $block): array
    {
        $type = $block['type'] ?? null;

        if ($type === 'table' && self::isUntypedTableContent($block['content'] ?? null)) {
            $block['content'] = ['type' => 'tableContent', ...$block['content']];
        }

        if (array_key_exists('content', $block)) {
            $block['content'] = self::cleanContent($block['content']);
        }

        if (array_key_exists('props', $block) || in_array($type, [...self::MEDIA_TYPES, Blocks::GALLERY, Blocks::BUTTON, Blocks::OWN_BLOCK], true)) {
            $block['props'] = self::cleanProps($type, is_array($block['props'] ?? null) ? $block['props'] : []);
        }

        // Columns hold their blocks in `children`, and so do cards and
        // indented blocks.
        if (array_key_exists('children', $block)) {
            $block['children'] = is_array($block['children']) ? self::cleanBlocks($block['children']) : [];
        }

        if (($block['props']['look'] ?? '') !== '') {
            $block['id'] = self::blockId($block['id'] ?? null) ?? Str::lower(Str::random(8));
        }

        return $block;
    }

    /**
     * A block id made of letters, digits, dashes and underscores, or null.
     */
    public static function blockId(mixed $id): ?string
    {
        $id = is_string($id) ? substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', $id), 0, 64) : '';

        return $id === '' ? null : $id;
    }

    /**
     * @param  array<mixed>  $props
     * @return array<mixed>
     */
    private static function cleanProps(mixed $type, array $props): array
    {
        if (array_key_exists('look', $props)) {
            $props['look'] = Look::clean($props['look']);
        }
        if (in_array($type, self::MEDIA_TYPES, true)) {
            $url = $props['url'] ?? null;
            $props['url'] = Urls::media($url) ?? (in_array($type, self::DYNAMIC_MEDIA_TYPES, true) ? DynamicValues::reference($url) : null) ?? '';
        }

        if ($type === Blocks::GALLERY) {
            $props['images'] = implode("\n", Blocks::galleryUrls($props['images'] ?? null));
        }

        if ($type === Blocks::BUTTON) {
            $props = [
                ...$props,
                'text' => is_string($props['text'] ?? null) ? $props['text'] : '',
                'url' => Urls::link($props['url'] ?? null) ?? DynamicValues::reference($props['url'] ?? null) ?? '',
                'variant' => in_array($props['variant'] ?? null, Blocks::BUTTON_VARIANTS, true) ? $props['variant'] : Blocks::BUTTON_VARIANTS[0],
            ];
        }

        if ($type === Blocks::OWN_BLOCK) {
            $kind = is_string($props['kind'] ?? null) ? substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', $props['kind']), 0, self::MAX_KIND_LENGTH) : '';

            $props = [
                ...$props,
                'kind' => $kind,
                'values' => Blocks::encodeValues(self::ownBlockValues($kind, Blocks::decodeValues($props['values'] ?? null))),
            ];
        }

        return $props;
    }

    /**
     * An own block's values, cleaned by its definition when the app has
     * registered one. Values of an unknown kind are kept as they are, so a
     * definition that is only missing for now does not lose its data.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private static function ownBlockValues(string $kind, array $values): array
    {
        return app(BlockRegistry::class)->cleanValues($kind, $values) ?? $values;
    }

    /**
     * Inline content is a list of text and link items. A link whose address
     * is not allowed is unwrapped into its words. A table's content is an
     * object of rows, whose cells hold inline content.
     */
    private static function cleanContent(mixed $content): mixed
    {
        if (! is_array($content)) {
            return $content;
        }

        if (! array_is_list($content)) {
            return is_array($content['rows'] ?? null) ? [...$content, 'rows' => self::cleanRows($content['rows'])] : $content;
        }

        $clean = [];

        foreach ($content as $item) {
            if (is_array($item) && ($item['type'] ?? null) === 'dynamic') {
                $key = $item['props']['key'] ?? null;

                if (DynamicValues::isKey($key)) {
                    $clean[] = ['type' => 'dynamic', 'props' => ['key' => $key]];
                }

                continue;
            }

            if (! is_array($item) || ($item['type'] ?? null) !== 'link') {
                $clean[] = $item;

                continue;
            }

            $inner = self::cleanContent($item['content'] ?? []);

            if (Urls::link($item['href'] ?? null) === null && DynamicValues::reference($item['href'] ?? null) === null) {
                array_push($clean, ...(is_array($inner) ? $inner : []));

                continue;
            }

            $clean[] = [...$item, 'content' => $inner];
        }

        return $clean;
    }

    /**
     * @param  array<mixed>  $rows
     * @return array<mixed>
     */
    private static function cleanRows(array $rows): array
    {
        return array_map(function (mixed $row): mixed {
            if (! is_array($row) || ! is_array($row['cells'] ?? null)) {
                return $row;
            }

            return [...$row, 'cells' => array_map(function (mixed $cell): mixed {
                if (! is_array($cell)) {
                    return $cell;
                }

                // A cell is inline content, or a tableCell wrapping it.
                return array_is_list($cell) ? self::cleanContent($cell) : [...$cell, 'content' => self::cleanContent($cell['content'] ?? [])];
            }, $row['cells'])];
        }, $rows);
    }

    /**
     * Inline content is a list of text and link items. A link holds its own
     * list. A table's content is an object of rows, which has no single line.
     */
    private static function inlineText(mixed $content): string
    {
        if (! is_array($content) || ! array_is_list($content)) {
            return '';
        }

        return implode('', array_map(
            fn (mixed $item): string => is_array($item)
                ? (is_string($item['text'] ?? null) ? $item['text'] : '').self::inlineText($item['content'] ?? null)
                : '',
            $content,
        ));
    }

    private static function isUntypedTableContent(mixed $content): bool
    {
        return is_array($content)
            && ! isset($content['type'])
            && is_array($content['rows'] ?? null);
    }
}
