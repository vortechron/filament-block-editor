<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class OwnBlockTest extends TestCase
{
    private function board(): OwnBlock
    {
        return OwnBlock::make('stationery-board')
            ->label('Stationery board')
            ->icon('pencil')
            ->description('Categories and items from the Barang screen.')
            ->fields([
                Field::text('heading')->label('Heading')->default('Stationery'),
                Field::textarea('intro')->label('Intro'),
                Field::select('style')->options(['plain' => 'Plain', 'boxed' => 'Boxed'])->default('plain'),
                Field::toggle('show_prices')->label('Show prices')->default(true),
                Field::image('photo')->label('Photo'),
                Field::link('link')->label('Link'),
                Field::number('limit')->label('Limit'),
                Field::list('items')->label('Items')->fields([Field::text('name')])->maxItems(3),
            ])
            ->view('blocks.stationery-board');
    }

    public function test_it_describes_itself_as_the_json_the_builder_gets(): void
    {
        $definition = $this->board()->toArray();

        $this->assertSame('stationery-board', $definition['kind']);
        $this->assertSame('Stationery board', $definition['label']);
        $this->assertSame('pencil', $definition['icon']);
        $this->assertSame('Categories and items from the Barang screen.', $definition['description']);
        $this->assertSame(
            ['name' => 'heading', 'label' => 'Heading', 'type' => 'text', 'default' => 'Stationery'],
            $definition['fields'][0],
        );
        $this->assertSame(
            ['name' => 'style', 'label' => 'Style', 'type' => 'select', 'options' => [['value' => 'plain', 'label' => 'Plain'], ['value' => 'boxed', 'label' => 'Boxed']], 'default' => 'plain'],
            $definition['fields'][2],
        );
        $this->assertSame(
            ['name' => 'items', 'label' => 'Items', 'type' => 'list', 'fields' => [['name' => 'name', 'label' => 'Name', 'type' => 'text', 'default' => '']], 'maxItems' => 3, 'default' => []],
            $definition['fields'][7],
        );
        $this->assertSame(
            ['heading' => 'Stationery', 'intro' => '', 'style' => 'plain', 'show_prices' => true, 'photo' => null, 'link' => null, 'limit' => null, 'items' => []],
            $definition['defaults'],
        );
        $this->assertJson(json_encode($definition, JSON_THROW_ON_ERROR));
    }

    public function test_it_names_the_shop_info_groups_its_view_reads(): void
    {
        $definition = OwnBlock::make('opening-hours')->usesSiteInfo('contact', 'hours', 'contact')->toArray();

        $this->assertSame(['contact', 'hours'], $definition['siteInfo']);
        $this->assertArrayNotHasKey('siteInfo', $this->board()->toArray());
        $this->assertArrayNotHasKey('siteInfo', OwnBlock::make('x')->usesSiteInfo()->toArray());
    }

    public function test_it_names_the_shop_values_its_view_shows(): void
    {
        $definition = OwnBlock::make('contact-card')->showsValues('site.phone', 'site.email', 'site.phone')->toArray();

        $this->assertSame(['site.phone', 'site.email'], $definition['showsValues']);
        $this->assertArrayNotHasKey('showsValues', $this->board()->toArray());
        $this->assertArrayNotHasKey('showsValues', OwnBlock::make('x')->showsValues()->toArray());
        $this->assertSame(['contact'], OwnBlock::make('both')->usesSiteInfo('contact')->showsValues('site.address')->toArray()['siteInfo']);
    }

    public function test_a_retired_block_is_marked_for_the_builder_and_still_draws(): void
    {
        $this->assertTrue(OwnBlock::make('old')->retired()->toArray()['retired']);
        $this->assertTrue(OwnBlock::make('old')->retired()->isRetired());
        $this->assertArrayNotHasKey('retired', $this->board()->toArray());
    }

    public function test_a_shop_value_that_is_not_a_dynamic_value_key_is_refused(): void
    {
        foreach (['phone', 'Site.Phone', '@site.phone', '{site.phone}', 'site.a.b.c.d', ''] as $key) {
            try {
                OwnBlock::make('x')->showsValues('site.email', $key);
                $this->fail("[{$key}] was accepted.");
            } catch (InvalidArgumentException $exception) {
                $this->assertStringContainsString('site.phone', $exception->getMessage());
            }
        }
    }

    public function test_the_field_types_are_the_ones_the_builder_knows(): void
    {
        $types = array_column($this->board()->toArray()['fields'], 'type');

        $this->assertSame(['text', 'textarea', 'select', 'toggle', 'image', 'link', 'number', 'list'], $types);
    }

    public function test_a_number_field_can_name_its_bounds(): void
    {
        $field = Field::number('limit')->min(1)->max(12)->toArray();

        $this->assertSame(1, $field['min']);
        $this->assertSame(12, $field['max']);
        $this->assertArrayNotHasKey('min', Field::number('x')->toArray());
    }

    public function test_it_needs_a_kind_the_builder_can_store(): void
    {
        $this->expectException(InvalidArgumentException::class);

        OwnBlock::make('Not a kind!');
    }

    public function test_clean_enforces_types_applies_defaults_and_drops_unknown_keys(): void
    {
        $clean = $this->board()->clean([
            'heading' => ['array'],
            'intro' => 12,
            'style' => 'sparkly',
            'show_prices' => 'no',
            'photo' => 'javascript:alert(1)',
            'link' => 'data:text/html,x',
            'limit' => 'many',
            'items' => 'nope',
            'evil' => '<script>',
        ]);

        $this->assertSame([
            'heading' => 'Stationery',
            'intro' => '12',
            'style' => 'plain',
            'show_prices' => false,
            'photo' => null,
            'link' => null,
            'limit' => null,
            'items' => [],
        ], $clean);
    }

    public function test_clean_keeps_valid_values(): void
    {
        $clean = $this->board()->clean([
            'heading' => 'Alat tulis',
            'intro' => "Baris satu\nBaris dua",
            'style' => 'boxed',
            'show_prices' => true,
            'photo' => '/storage/block-editor/a.jpg',
            'link' => 'https://wa.me/60123456789',
            'limit' => '8',
            'items' => [['name' => 'Pen', 'junk' => 1], 'not an item', ['name' => 'Buku'], ['name' => 'Pensel'], ['name' => 'Kerat']],
        ]);

        $this->assertSame('Alat tulis', $clean['heading']);
        $this->assertSame("Baris satu\nBaris dua", $clean['intro']);
        $this->assertSame('boxed', $clean['style']);
        $this->assertTrue($clean['show_prices']);
        $this->assertSame('/storage/block-editor/a.jpg', $clean['photo']);
        $this->assertSame('https://wa.me/60123456789', $clean['link']);
        $this->assertSame(8, $clean['limit']);
        $this->assertSame([['name' => 'Pen'], ['name' => 'Buku'], ['name' => 'Pensel']], $clean['items']);
    }

    public function test_links_use_the_same_allow_list_as_the_button(): void
    {
        $field = $this->board();

        foreach (['mailto:a@b.my', 'tel:+60123456789', '#tentang', '/hubungi', 'http://example.com'] as $url) {
            $this->assertSame($url, $field->clean(['link' => $url])['link']);
        }

        foreach (['javascript:alert(1)', '//evil.example', 'ftp://x', ''] as $url) {
            $this->assertNull($field->clean(['link' => $url])['link']);
        }
    }

    public function test_a_number_is_clamped_to_its_bounds_and_keeps_decimals(): void
    {
        $block = OwnBlock::make('n')->fields([Field::number('a')->min(1)->max(12), Field::number('b')]);

        $this->assertSame(['a' => 12, 'b' => 2.5], $block->clean(['a' => 99, 'b' => '2.5']));
        $this->assertSame(['a' => 1, 'b' => null], $block->clean(['a' => 0]));
    }

    public function test_a_list_item_is_cleaned_by_its_own_fields_including_nested_lists(): void
    {
        $block = OwnBlock::make('menu')->fields([
            Field::list('groups')->fields([
                Field::text('title'),
                Field::list('links')->fields([Field::text('label'), Field::link('url')])->maxItems(2),
            ]),
        ]);

        $clean = $block->clean(['groups' => [
            ['title' => 'A', 'links' => [
                ['label' => 'x', 'url' => 'https://a.example'],
                ['label' => 'y', 'url' => 'javascript:1'],
                ['label' => 'z', 'url' => '/z'],
            ]],
        ]]);

        $this->assertSame([['title' => 'A', 'links' => [['label' => 'x', 'url' => 'https://a.example'], ['label' => 'y', 'url' => null]]]], $clean['groups']);
    }

    public function test_a_select_without_a_default_falls_back_to_its_first_option(): void
    {
        $block = OwnBlock::make('s')->fields([Field::select('tone')->options(['info' => 'Info', 'warn' => 'Warning'])]);

        $this->assertSame(['tone' => 'info'], $block->clean(['tone' => 'bogus']));
        $this->assertSame(['tone' => 'warn'], $block->clean(['tone' => 'warn']));
    }

    public function test_a_developer_only_field_says_so_to_the_builder(): void
    {
        $definition = OwnBlock::make('embed')->fields([Field::text('title'), Field::textarea('code')->developerOnly()])->toArray();

        $this->assertArrayNotHasKey('developerOnly', $definition['fields'][0]);
        $this->assertTrue($definition['fields'][1]['developerOnly']);
        $this->assertTrue(Field::text('x')->developerOnly()->isDeveloperOnly());
        $this->assertFalse(Field::text('x')->isDeveloperOnly());
    }

    public function test_a_developer_only_field_inside_a_list_is_refused_when_the_list_is_built(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('developerOnly');

        Field::list('items')->fields([Field::text('name'), Field::text('secret')->developerOnly()]);
    }

    public function test_a_developer_only_field_inside_a_nested_list_is_refused_too(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Field::list('rows')->fields([Field::list('cells')->developerOnly()->fields([Field::text('x')])]);
    }

    public function test_a_whole_list_may_be_developer_only(): void
    {
        $field = Field::list('items')->developerOnly()->fields([Field::text('name')]);

        $this->assertTrue($field->toArray()['developerOnly']);
    }

    public function test_a_select_can_read_its_choices_when_they_are_needed(): void
    {
        $choices = ['8' => 'Alat tulis'];
        $field = Field::select('category')->options(function () use (&$choices): array {
            return $choices;
        });

        $this->assertSame([['value' => '8', 'label' => 'Alat tulis']], $field->toArray()['options']);
        $this->assertSame('8', $field->clean('8'));

        // A category added later is a choice at once, and one taken away is not.
        $choices = ['' => 'All', '11' => 'Barang sekolah'];

        $this->assertSame([['value' => '', 'label' => 'All'], ['value' => '11', 'label' => 'Barang sekolah']], $field->toArray()['options']);
        $this->assertSame('11', $field->clean('11'));
        $this->assertSame('', $field->clean('8'));
    }

    public function test_a_block_names_the_screen_where_its_data_is_changed(): void
    {
        $definition = OwnBlock::make('board')->editedAt('Edit items', fn (): string => '/admin/items')->toArray();

        $this->assertSame(['label' => 'Edit items', 'url' => '/admin/items'], $definition['editedAt']);
        $this->assertArrayNotHasKey('editedAt', OwnBlock::make('plain')->toArray());
    }

    public function test_a_screen_address_that_is_not_a_safe_link_is_left_out(): void
    {
        $this->assertArrayNotHasKey('editedAt', OwnBlock::make('board')->editedAt('Edit', 'javascript:alert(1)')->toArray());
        $this->assertArrayNotHasKey('editedAt', OwnBlock::make('board')->editedAt('Edit', fn (): ?string => null)->toArray());
    }

    public function test_a_select_can_show_a_picture_of_each_icon(): void
    {
        $pen = '<svg viewBox="0 0 24 24"><path d="m4 20 1-5L16 4l4 4L9 19z"/></svg>';
        $field = Field::select('icon')->options(['pen' => 'Pen', 'box' => 'Box', 'odd' => 'Odd'])
            ->icons(fn (string $value): ?string => match ($value) {
                'pen' => $pen,
                'odd' => 'not a picture',
                default => null,
            });

        $this->assertSame(
            [['value' => 'pen', 'label' => 'Pen', 'svg' => $pen], ['value' => 'box', 'label' => 'Box'], ['value' => 'odd', 'label' => 'Odd']],
            $field->toArray()['options'],
        );
        $this->assertSame('pen', $field->clean('pen'));
    }
}
