<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BlockNoteDocumentTest extends TestCase
{
    public function test_it_gives_a_table_the_content_type_the_editor_needs(): void
    {
        $clean = BlockNoteDocument::clean([
            ['id' => 't1', 'type' => 'table', 'props' => [], 'content' => ['rows' => []], 'children' => []],
            ['id' => 't2', 'type' => 'table', 'props' => [], 'content' => ['type' => 'tableContent', 'rows' => []], 'children' => []],
        ]);

        $this->assertSame('tableContent', $clean[0]['content']['type']);
        $this->assertSame('tableContent', $clean[1]['content']['type']);
    }

    public function test_it_cleans_blocks_inside_columns_and_children_and_drops_what_is_not_a_block(): void
    {
        $clean = BlockNoteDocument::clean([
            'not a block',
            ['type' => 'columnList', 'children' => [
                ['type' => 'column', 'children' => [
                    ['type' => 'image', 'props' => ['url' => 'javascript:alert(1)']],
                ]],
            ]],
            ['type' => 'paragraph', 'children' => 'junk'],
        ]);

        $this->assertCount(2, $clean);
        $this->assertSame('', $clean[0]['children'][0]['children'][0]['props']['url']);
        $this->assertSame([], $clean[1]['children']);
    }

    public function test_a_value_that_is_not_a_list_of_blocks_is_an_empty_document(): void
    {
        $this->assertSame([], BlockNoteDocument::clean('text'));
        $this->assertSame([], BlockNoteDocument::clean(['a' => 1]));
        $this->assertSame([], BlockNoteDocument::clean(null));
    }

    public function test_a_document_over_the_size_limit_is_dropped(): void
    {
        $this->assertTrue(BlockNoteDocument::isTooBig([['type' => 'paragraph', 'content' => str_repeat('a', 100_001)]]));
        $this->assertSame([], BlockNoteDocument::clean([['type' => 'paragraph', 'content' => str_repeat('a', 100_001)]]));
    }

    public function test_media_blocks_keep_only_web_and_site_addresses(): void
    {
        $clean = BlockNoteDocument::clean([
            Blocks::image('https://cdn.example/a.jpg'),
            Blocks::image('/storage/b.jpg'),
            Blocks::image('data:image/svg+xml;base64,PHN2Zz4='),
            Blocks::image('//evil.example/x.png'),
            Blocks::video('javascript:alert(1)'),
            ['type' => 'audio', 'props' => ['url' => 'ftp://x/y.mp3']],
            ['type' => 'file', 'props' => ['url' => 'https://cdn.example/a.pdf', 'name' => 'A']],
            ['type' => 'card', 'props' => ['url' => 'file:///etc/passwd'], 'content' => [], 'children' => []],
        ]);

        $this->assertSame(
            ['https://cdn.example/a.jpg', '/storage/b.jpg', '', '', '', '', 'https://cdn.example/a.pdf', ''],
            array_map(fn (array $block): string => $block['props']['url'], $clean),
        );
    }

    public function test_a_slideshow_keeps_only_safe_unique_addresses_up_to_the_limit(): void
    {
        $urls = array_map(fn (int $i): string => "https://cdn.example/{$i}.jpg", range(1, 14));
        $clean = BlockNoteDocument::clean([
            ['type' => 'gallery', 'props' => ['images' => "javascript:x\nhttps://a.example/1.jpg\nhttps://a.example/1.jpg\n/b.jpg\n//c.example/c.jpg"]],
            Blocks::gallery($urls),
        ]);

        $this->assertSame("https://a.example/1.jpg\n/b.jpg", $clean[0]['props']['images']);
        $this->assertCount(Blocks::MAX_GALLERY_PHOTOS, explode("\n", $clean[1]['props']['images']));
    }

    public function test_a_button_keeps_its_text_a_safe_link_and_a_known_variant(): void
    {
        $clean = BlockNoteDocument::clean([
            Blocks::button('Hubungi', 'https://wa.me/60123456789', 'outline'),
            Blocks::button('Bad', 'javascript:alert(1)', 'neon'),
            ['type' => 'button', 'props' => ['text' => ['x'], 'url' => '#tentang']],
        ]);

        $this->assertSame(['text' => 'Hubungi', 'url' => 'https://wa.me/60123456789', 'variant' => 'outline'], $clean[0]['props']);
        $this->assertSame(['text' => 'Bad', 'url' => '', 'variant' => 'solid'], $clean[1]['props']);
        $this->assertSame(['text' => '', 'url' => '#tentang', 'variant' => 'solid'], $clean[2]['props']);
    }

    public function test_an_own_block_keeps_a_kind_and_values_as_a_json_object(): void
    {
        $clean = BlockNoteDocument::clean([
            Blocks::ownBlock('stationery-board', ['heading' => 'Alat tulis']),
            ['type' => 'ownBlock', 'props' => ['kind' => 'Bad Kind!', 'values' => '[1,2]']],
            ['type' => 'ownBlock', 'props' => ['kind' => 'x', 'values' => 'not json']],
            ['type' => 'ownBlock', 'props' => ['kind' => 'x', 'values' => ['array']]],
            ['type' => 'ownBlock', 'props' => []],
        ]);

        $this->assertSame(['kind' => 'stationery-board', 'values' => '{"heading":"Alat tulis"}'], $clean[0]['props']);
        $this->assertSame(['kind' => 'BadKind', 'values' => '{}'], $clean[1]['props']);
        $this->assertSame('{}', $clean[2]['props']['values']);
        $this->assertSame('{}', $clean[3]['props']['values']);
        $this->assertSame(['kind' => '', 'values' => '{}'], $clean[4]['props']);
    }

    public function test_a_link_with_an_unsafe_address_becomes_plain_text(): void
    {
        $clean = BlockNoteDocument::clean([
            ['type' => 'paragraph', 'props' => [], 'content' => [
                ['type' => 'link', 'href' => 'javascript:alert(1)', 'content' => [['type' => 'text', 'text' => 'Klik', 'styles' => []]]],
                ['type' => 'link', 'href' => 'https://example.com', 'content' => [['type' => 'text', 'text' => 'Ok', 'styles' => []]]],
                ['type' => 'link', 'href' => '#tentang', 'content' => [['type' => 'text', 'text' => 'Atas', 'styles' => []]]],
            ], 'children' => []],
        ]);

        $this->assertSame([
            ['type' => 'text', 'text' => 'Klik', 'styles' => []],
            ['type' => 'link', 'href' => 'https://example.com', 'content' => [['type' => 'text', 'text' => 'Ok', 'styles' => []]]],
            ['type' => 'link', 'href' => '#tentang', 'content' => [['type' => 'text', 'text' => 'Atas', 'styles' => []]]],
        ], $clean[0]['content']);
    }

    public function test_it_finds_the_first_picture_inside_columns_cards_and_slideshows(): void
    {
        $document = [
            Blocks::paragraph('Hai'),
            ['type' => 'columnList', 'children' => [['type' => 'column', 'children' => [Blocks::gallery(['https://cdn.example/g1.jpg', 'https://cdn.example/g2.jpg'])]]]],
            Blocks::image('https://cdn.example/later.jpg'),
        ];

        $this->assertSame('https://cdn.example/g1.jpg', BlockNoteDocument::firstImageUrl($document));
        $this->assertNull(BlockNoteDocument::firstImageUrl([Blocks::image('javascript:x')]));
        $this->assertNull(BlockNoteDocument::firstImageUrl('nope'));
    }

    public function test_it_reads_the_words_in_order(): void
    {
        $document = [
            Blocks::heading(2, 'Tajuk'),
            Blocks::paragraph('Satu'),
            ['type' => 'card', 'content' => [['type' => 'text', 'text' => 'Kad', 'styles' => []]], 'children' => [Blocks::paragraph('Dalam kad')]],
        ];

        $this->assertSame("Tajuk\nSatu\nKad\nDalam kad", BlockNoteDocument::text($document));
    }

    public function test_the_block_builders_make_blocks_that_clean_leaves_alone(): void
    {
        $document = [
            Blocks::heading(1, 'Tajuk'),
            Blocks::heading(4, 'Kecil', 'center'),
            Blocks::paragraph('Ayat'),
            Blocks::bullet('Satu'),
            Blocks::numbered('Dua'),
            Blocks::quote('Petikan'),
            Blocks::toggle('Soalan?', [Blocks::paragraph('Jawapan')]),
            Blocks::image('https://cdn.example/a.jpg', 'Kapsyen'),
            Blocks::video('https://cdn.example/a.mp4'),
            Blocks::gallery(['https://cdn.example/1.jpg', '/2.jpg']),
            Blocks::button('Hubungi', 'mailto:hai@example.com', 'outline'),
            Blocks::ownBlock('a-kind-nobody-registered', ['heading' => 'Hai', 'items' => [['name' => 'x']]]),
        ];

        $this->assertSame($document, BlockNoteDocument::clean($document));
    }

    public function test_the_look_prop_is_cleaned_and_stored_again_as_compact_json(): void
    {
        $look = json_encode([
            'style' => ['desktop' => ['padding_top' => '24px', 'color' => '</style><script>'], 'hover' => ['opacity' => '0.5', 'padding_top' => '1px']],
            'advanced' => ['class' => 'wide', 'css' => 'selector { color: red; } </style>', 'hide_on' => ['phone'], 'extra' => 1],
            'evil' => true,
        ]);

        $clean = BlockNoteDocument::clean([['id' => 'b1', 'type' => 'paragraph', 'props' => ['look' => $look], 'content' => [], 'children' => []]]);

        $this->assertSame(
            '{"style":{"desktop":{"padding_top":"24px"},"hover":{"opacity":"0.5"}},"advanced":{"class":"wide","hide_on":["phone"]}}',
            $clean[0]['props']['look'],
        );
        $this->assertSame('b1', $clean[0]['id']);
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function emptyLooks(): array
    {
        return [
            'empty' => [''],
            'not json' => ['{nope'],
            'a list' => ['[1,2]'],
            'nothing valid' => ['{"style":{"desktop":{"padding_top":"huge"}},"advanced":{"class":"1x"}}'],
            'not a string' => [['style' => []]],
            'null' => [null],
        ];
    }

    #[DataProvider('emptyLooks')]
    public function test_a_look_with_nothing_valid_in_it_is_an_empty_string(mixed $look): void
    {
        $clean = BlockNoteDocument::clean([['id' => 'b1', 'type' => 'heading', 'props' => ['level' => 2, 'look' => $look], 'content' => [], 'children' => []]]);

        $this->assertSame('', $clean[0]['props']['look']);
    }

    public function test_a_block_with_a_look_and_no_usable_id_gets_an_id_so_its_class_is_stable(): void
    {
        $look = '{"style":{"desktop":{"opacity":"0.5"}}}';
        $clean = BlockNoteDocument::clean([
            ['type' => 'paragraph', 'props' => ['look' => $look], 'content' => [], 'children' => []],
            ['id' => '"><b>', 'type' => 'paragraph', 'props' => ['look' => $look], 'content' => [], 'children' => []],
            ['type' => 'paragraph', 'props' => ['look' => ''], 'content' => [], 'children' => []],
        ]);

        $this->assertMatchesRegularExpression('/^[a-z0-9]{8}$/', $clean[0]['id']);
        $this->assertSame('b', $clean[1]['id']);
        $this->assertArrayNotHasKey('id', $clean[2]);
    }

    public function test_a_heading_level_stays_between_one_and_four(): void
    {
        $this->assertSame(1, Blocks::heading(0, 'a')['props']['level']);
        $this->assertSame(4, Blocks::heading(9, 'a')['props']['level']);
        $this->assertSame(3, Blocks::heading(3, 'a')['props']['level']);
    }

    public function test_an_own_block_builder_keeps_values_as_a_json_object_string(): void
    {
        $this->assertSame('{}', Blocks::ownBlock('x')['props']['values']);
        $this->assertSame('{"a":"é/b"}', Blocks::ownBlock('x', ['a' => 'é/b'])['props']['values']);
        $this->assertSame(['a' => 'é/b'], Blocks::decodeValues('{"a":"é/b"}'));
        $this->assertSame([], Blocks::decodeValues('[1,2]'));
        $this->assertSame([], Blocks::decodeValues('nope'));
    }
}
