<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Styling\Look;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class PageGuardTest extends TestCase
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function section(string $id, array $data = [], array $extra = []): array
    {
        return ['id' => $id, 'type' => 'rich', 'data' => ['document' => [], ...$data], ...$extra];
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     * @return array{version: int, sections: list<array<string, mixed>>}
     */
    private function page(array $sections): array
    {
        return PageValue::normalize(['version' => 2, 'sections' => $sections]);
    }

    /**
     * @param  array<string, mixed>  $look
     * @param  list<array<string, mixed>>  $children
     * @return array<string, mixed>
     */
    private function paragraph(string $id, array $look = [], array $children = []): array
    {
        return ['id' => $id, 'type' => 'paragraph', 'props' => ['look' => json_encode($look)], 'content' => [['type' => 'text', 'text' => $id, 'styles' => []]], 'children' => $children];
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     * @return array<string, mixed>
     */
    private function columns(string $id, array $blocks): array
    {
        return ['id' => $id, 'type' => 'columnList', 'props' => [], 'children' => [
            ['id' => $id.'-c1', 'type' => 'column', 'props' => ['width' => 1], 'children' => $blocks],
        ]];
    }

    /**
     * @param  list<string>  $ids
     * @return list<string>
     */
    private function ids(array $value): array
    {
        return array_column($value['sections'], 'id');
    }

    /**
     * The look of the block with this id, searched through the whole page.
     *
     * @return array<string, mixed>
     */
    private function lookOf(array $value, string $id): array
    {
        $find = function (array $blocks) use (&$find, $id): ?array {
            foreach ($blocks as $block) {
                if (($block['id'] ?? null) === $id) {
                    return $block;
                }

                $found = $find($block['children'] ?? []);

                if ($found !== null) {
                    return $found;
                }
            }

            return null;
        };

        foreach ($value['sections'] as $section) {
            $block = $find($section['data']['document'] ?? []);

            if ($block !== null) {
                return Look::decode($block['props']['look'] ?? '');
            }
        }

        $this->fail("No block {$id}.");
    }

    public function test_a_value_without_developer_data_or_locks_is_saved_as_it_is(): void
    {
        $new = $this->page([$this->section('a', ['padding' => 'lg']), $this->section('b')]);

        $this->assertSame($new, PageValue::guard($new, $this->page([$this->section('b'), $this->section('a')])));
    }

    public function test_a_non_developer_cannot_add_change_or_remove_a_lock(): void
    {
        $stored = $this->page([$this->section('a', [], ['lock' => ['move' => true]]), $this->section('b')]);
        $new = $this->page([
            $this->section('a', [], ['lock' => ['remove' => true, 'content' => true]]),
            $this->section('b', [], ['lock' => ['style' => true]]),
            $this->section('c', [], ['lock' => ['move' => true]]),
        ]);

        $guarded = PageValue::guard($new, $stored);

        $this->assertSame(['move' => true], $guarded['sections'][0]['lock']);
        $this->assertArrayNotHasKey('lock', $guarded['sections'][1]);
        $this->assertArrayNotHasKey('lock', $guarded['sections'][2]);
    }

    public function test_section_custom_css_is_kept_from_the_stored_value_and_dropped_from_new_sections(): void
    {
        $stored = $this->page([
            $this->section('a', ['advanced' => ['css' => 'selector { color: red; }', 'class' => 'old']]),
            $this->section('b', ['advanced' => ['css' => 'selector { color: blue; }']]),
        ]);
        $new = $this->page([
            $this->section('a', ['advanced' => ['css' => 'selector { display: none; }', 'class' => 'new']]),
            $this->section('b'),
            $this->section('c', ['advanced' => ['css' => 'selector { color: green; }', 'hide_on' => ['phone']]]),
        ]);

        [$a, $b, $c] = PageValue::guard($new, $stored)['sections'];

        $this->assertSame(['class' => 'new', 'css' => 'selector { color: red; }'], $a['data']['advanced']);
        $this->assertSame(['css' => 'selector { color: blue; }'], $b['data']['advanced']);
        $this->assertSame(['hide_on' => ['phone']], $c['data']['advanced']);
    }

    public function test_block_custom_css_is_kept_by_block_id_and_dropped_from_new_blocks(): void
    {
        $stored = $this->page([$this->section('a', ['document' => [
            $this->paragraph('p1', ['advanced' => ['css' => 'selector { color: red; }']]),
            $this->paragraph('p2', ['advanced' => ['css' => 'selector { color: blue; }']]),
        ]])]);
        $new = $this->page([$this->section('a', ['document' => [
            $this->paragraph('p1', ['style' => ['desktop' => ['opacity' => '0.5']], 'advanced' => ['css' => 'selector { display: none; }', 'class' => 'x']]),
            ['id' => 'p2', 'type' => 'paragraph', 'props' => [], 'content' => [], 'children' => []],
            $this->paragraph('p3', ['advanced' => ['css' => 'selector { color: green; }']]),
        ]])]);

        $guarded = PageValue::guard($new, $stored);

        $this->assertSame(['style' => ['desktop' => ['opacity' => '0.5']], 'advanced' => ['class' => 'x', 'css' => 'selector { color: red; }']], $this->lookOf($guarded, 'p1'));
        $this->assertSame(['advanced' => ['css' => 'selector { color: blue; }']], $this->lookOf($guarded, 'p2'));
        $this->assertSame([], $this->lookOf($guarded, 'p3'));
    }

    public function test_custom_css_of_a_block_inside_a_column_or_an_indent_is_guarded_too(): void
    {
        $css = ['advanced' => ['css' => 'selector { color: red; }']];
        $stored = $this->page([$this->section('a', ['document' => [
            $this->columns('cols', [$this->paragraph('inner', $css)]),
            $this->paragraph('parent', [], [$this->paragraph('child', $css)]),
        ]])]);
        $new = $this->page([$this->section('a', ['document' => [
            $this->columns('cols', [
                $this->paragraph('inner', ['advanced' => ['css' => 'selector { display: none; }']]),
                $this->paragraph('added', ['advanced' => ['css' => 'selector { display: none; }']]),
            ]),
            $this->paragraph('parent', [], [$this->paragraph('child')]),
            ['id' => 'card1', 'type' => 'card', 'props' => [], 'content' => [], 'children' => [$this->paragraph('in-card', $css)]],
        ]])]);

        $guarded = PageValue::guard($new, $stored);

        $this->assertSame($css, $this->lookOf($guarded, 'inner'));
        $this->assertSame([], $this->lookOf($guarded, 'added'));
        $this->assertSame($css, $this->lookOf($guarded, 'child'));
        $this->assertSame([], $this->lookOf($guarded, 'in-card'));
    }

    public function test_developer_only_own_block_fields_are_kept_from_the_stored_block_also_inside_a_column(): void
    {
        app(BlockRegistry::class)->register(OwnBlock::make('embed')->fields([
            Field::text('title')->default('Peta'),
            Field::text('code')->developerOnly()->default('safe'),
        ]));

        $stored = $this->page([$this->section('a', ['document' => [
            ['id' => 'e1', ...Blocks::ownBlock('embed', ['title' => 'Lama', 'code' => 'stored-1'])],
            $this->columns('cols', [['id' => 'e2', ...Blocks::ownBlock('embed', ['title' => 'Dalam', 'code' => 'stored-2'])]]),
        ]])]);
        $new = $this->page([$this->section('a', ['document' => [
            ['id' => 'e1', ...Blocks::ownBlock('embed', ['title' => 'Baru', 'code' => 'hacked'])],
            $this->columns('cols', [
                ['id' => 'e2', ...Blocks::ownBlock('embed', ['title' => 'Dalam baru', 'code' => 'hacked'])],
                ['id' => 'e3', ...Blocks::ownBlock('embed', ['title' => 'Tambah', 'code' => 'hacked'])],
            ]),
        ]])]);

        $document = PageValue::guard($new, $stored)['sections'][0]['data']['document'];
        $inner = $document[1]['children'][0]['children'];

        $this->assertSame(['title' => 'Baru', 'code' => 'stored-1'], Blocks::decodeValues($document[0]['props']['values']));
        $this->assertSame(['title' => 'Dalam baru', 'code' => 'stored-2'], Blocks::decodeValues($inner[0]['props']['values']));
        $this->assertSame(['title' => 'Tambah', 'code' => 'safe'], Blocks::decodeValues($inner[1]['props']['values']));
    }

    public function test_a_section_locked_against_removal_is_put_back_where_it_was_and_shown(): void
    {
        $stored = $this->page([
            $this->section('a'),
            $this->section('keep', [], ['lock' => ['remove' => true]]),
            $this->section('show', [], ['lock' => ['remove' => true]]),
            $this->section('last', [], ['lock' => ['remove' => true]]),
        ]);
        $new = $this->page([$this->section('show', [], ['hidden' => true])]);

        $guarded = PageValue::guard($new, $stored);

        // "keep" was at index 1 and "last" at 3 (clamped to the end).
        $this->assertSame(['show', 'keep', 'last'], $this->ids($guarded));
        $this->assertArrayNotHasKey('hidden', $guarded['sections'][0]);
    }

    public function test_a_section_the_developer_hid_and_locked_stays_hidden(): void
    {
        $stored = $this->page([$this->section('a', [], ['hidden' => true, 'lock' => ['remove' => true]])]);

        $this->assertTrue(PageValue::guard($this->page([$this->section('a')]), $stored)['sections'][0]['hidden']);
    }

    public function test_a_section_locked_against_moving_goes_back_to_its_place(): void
    {
        $stored = $this->page([$this->section('head', [], ['lock' => ['move' => true]]), $this->section('a'), $this->section('b'), $this->section('foot', [], ['lock' => ['move' => true]])]);
        $new = $this->page([$this->section('b'), $this->section('foot'), $this->section('a'), $this->section('new'), $this->section('head')]);

        $this->assertSame(['head', 'b', 'a', 'foot', 'new'], $this->ids(PageValue::guard($new, $stored)));
    }

    public function test_content_and_style_locks_keep_the_stored_document_and_look(): void
    {
        $document = [Blocks::paragraph('Asal')];
        $stored = $this->page([
            $this->section('words', ['document' => $document, 'padding' => 'sm'], ['lock' => ['content' => true]]),
            $this->section('look', ['document' => $document, 'padding' => 'sm', 'style' => ['desktop' => ['opacity' => '0.5']], 'advanced' => ['class' => 'brand']], ['lock' => ['style' => true]]),
        ]);
        $new = $this->page([
            $this->section('words', ['document' => [Blocks::paragraph('Ubah')], 'padding' => 'xl']),
            $this->section('look', ['document' => [Blocks::paragraph('Ubah')], 'padding' => 'xl', 'style' => ['desktop' => ['opacity' => '1']]]),
        ]);

        [$words, $look] = PageValue::guard($new, $stored)['sections'];

        $this->assertSame($stored['sections'][0]['data']['document'], $words['data']['document']);
        $this->assertSame('xl', $words['data']['padding']);
        $this->assertSame('Ubah', $look['data']['document'][0]['content'][0]['text']);
        $this->assertSame('sm', $look['data']['padding']);
        $this->assertSame(['desktop' => ['opacity' => '0.5']], $look['data']['style']);
        $this->assertSame(['class' => 'brand'], $look['data']['advanced']);
    }

    public function test_guarding_twice_changes_nothing(): void
    {
        $stored = $this->page([
            $this->section('a', ['advanced' => ['css' => 'selector { color: red; }']], ['lock' => ['move' => true, 'remove' => true]]),
            $this->section('b', ['document' => [$this->paragraph('p1', ['advanced' => ['css' => 'selector { color: red; }']])]]),
        ]);
        $new = $this->page([$this->section('b'), $this->section('c', ['advanced' => ['css' => 'selector { color: blue; }']])]);

        $once = PageValue::guard($new, $stored);

        $this->assertSame($once, PageValue::guard($once, $stored));
    }

    public function test_a_locked_section_swapped_for_a_synced_one_with_its_id_comes_back(): void
    {
        $stored = $this->page([$this->section('a', ['document' => [Blocks::paragraph('Asal')]], ['lock' => ['content' => true]])]);
        $new = $this->page([['id' => 'a', 'type' => 'ref', 'ref' => 7]]);

        $this->assertSame($stored, PageValue::guard($new, $stored));
    }
}
