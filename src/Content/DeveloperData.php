<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Styling\Look;

/**
 * The developer-only data inside a document, guarded block by block (by
 * block id, through every column, card and indent):
 *
 * - a block's custom CSS (`look.advanced.css`);
 * - an own block's developer-only fields (Field::developerOnly()).
 *
 * A block that also exists in the stored page gets its stored values back;
 * a new block loses its CSS and gets the fields' defaults. Everything else
 * in the block is the new value's.
 */
final class DeveloperData
{
    /**
     * Every block of the stored sections, by id.
     *
     * @param  list<array<string, mixed>>  $sections  normalized sections
     * @return array<string, array<string, mixed>>
     */
    public static function storedBlocks(array $sections): array
    {
        $blocks = [];

        foreach ($sections as $section) {
            self::collect(is_array($section['data']['document'] ?? null) ? $section['data']['document'] : [], $blocks);
        }

        return $blocks;
    }

    /**
     * @param  array<mixed>  $document
     * @param  array<string, array<string, mixed>>  $stored  from storedBlocks()
     * @return array<mixed>
     */
    public static function document(array $document, array $stored): array
    {
        return array_map(fn (mixed $block): mixed => is_array($block) ? self::block($block, $stored) : $block, $document);
    }

    /**
     * @param  array<mixed>  $blocks
     * @param  array<string, array<string, mixed>>  $into
     */
    private static function collect(array $blocks, array &$into): void
    {
        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }

            $id = BlockNoteDocument::blockId($block['id'] ?? null);

            if ($id !== null) {
                $into[$id] ??= $block;
            }

            self::collect(is_array($block['children'] ?? null) ? $block['children'] : [], $into);
        }
    }

    /**
     * @param  array<mixed>  $block
     * @param  array<string, array<string, mixed>>  $stored
     * @return array<mixed>
     */
    private static function block(array $block, array $stored): array
    {
        $id = BlockNoteDocument::blockId($block['id'] ?? null);
        $old = $id === null ? null : ($stored[$id] ?? null);
        $props = is_array($block['props'] ?? null) ? $block['props'] : [];

        $look = self::look($props['look'] ?? null, $old['props']['look'] ?? null);

        if ($look !== '' || array_key_exists('look', $props)) {
            $props['look'] = $look;
        }

        if (($block['type'] ?? null) === Blocks::OWN_BLOCK) {
            $props['values'] = self::ownBlockValues($props, ($old['type'] ?? null) === Blocks::OWN_BLOCK ? $old['props'] ?? [] : null);
        }

        if (is_array($block['props'] ?? null) || $props !== []) {
            $block['props'] = $props;
        }

        if (is_array($block['children'] ?? null)) {
            $block['children'] = self::document($block['children'], $stored);
        }

        return $block;
    }

    /**
     * The new look with the stored custom CSS in it (or none).
     */
    private static function look(mixed $new, mixed $old): string
    {
        $look = Look::decode($new);
        $css = Look::decode($old)['advanced']['css'] ?? null;
        $advanced = $look['advanced'] ?? [];
        unset($advanced['css']);

        return Look::encode([...$look, 'advanced' => [...$advanced, ...($css === null ? [] : ['css' => $css])]]);
    }

    /**
     * An own block's values with its developer-only fields from the stored
     * block of the same kind, or their defaults for a new block.
     *
     * @param  array<mixed>  $props
     * @param  array<mixed>|null  $oldProps
     */
    private static function ownBlockValues(array $props, ?array $oldProps): string
    {
        $kind = is_string($props['kind'] ?? null) ? $props['kind'] : '';
        $values = Blocks::decodeValues($props['values'] ?? null);
        $definition = app(BlockRegistry::class)->get($kind);
        $sameKind = $oldProps !== null && ($oldProps['kind'] ?? null) === $kind;
        $oldValues = $sameKind ? Blocks::decodeValues($oldProps['values'] ?? null) : [];

        foreach ($definition?->getFields() ?? [] as $field) {
            /** @var Field $field */
            if (! $field->isDeveloperOnly()) {
                continue;
            }

            $values[$field->name] = $sameKind && array_key_exists($field->name, $oldValues) ? $oldValues[$field->name] : $field->defaultValue();
        }

        return Blocks::encodeValues($values);
    }
}
