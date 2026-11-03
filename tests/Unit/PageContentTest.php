<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class PageContentTest extends TestCase
{
    public function test_it_keeps_rich_sections_and_drops_anything_else(): void
    {
        $sections = PageContent::normalize([
            ['id' => 'a1', 'type' => 'rich', 'data' => ['document' => [], 'evil' => 'x']],
            ['id' => 'b2', 'type' => 'hero', 'data' => ['headline' => 'Old form section']],
            ['id' => 'c3', 'type' => 'script', 'data' => ['code' => 'alert(1)']],
            'not a section',
        ]);

        $this->assertCount(1, $sections);
        $this->assertSame('a1', $sections[0]['id']);
        $this->assertArrayNotHasKey('evil', $sections[0]['data']);
    }

    public function test_it_gives_a_section_without_a_usable_id_a_new_eight_character_id(): void
    {
        $sections = PageContent::normalize([
            ['type' => 'rich', 'data' => []],
            ['id' => '<>', 'type' => 'rich', 'data' => []],
            ['id' => ['x'], 'type' => 'rich', 'data' => []],
        ]);

        foreach ($sections as $section) {
            $this->assertMatchesRegularExpression('/^[a-z0-9]{8}$/', $section['id']);
        }

        $this->assertMatchesRegularExpression('/^[a-z0-9]{8}$/', PageContent::newId());
    }

    public function test_it_strips_odd_characters_from_an_id_and_limits_its_length(): void
    {
        $sections = PageContent::normalize([
            ['id' => '<b>a1</b>', 'type' => 'rich', 'data' => []],
            ['id' => str_repeat('x', 60), 'type' => 'rich', 'data' => []],
        ]);

        $this->assertSame('ba1b', $sections[0]['id']);
        $this->assertSame(40, strlen($sections[1]['id']));
    }

    public function test_it_keeps_the_hidden_flag_only_when_it_is_true(): void
    {
        $sections = PageContent::normalize([
            ['id' => 'a', 'type' => 'rich', 'hidden' => true, 'data' => []],
            ['id' => 'b', 'type' => 'rich', 'hidden' => 'yes', 'data' => []],
            ['id' => 'c', 'type' => 'rich', 'hidden' => false, 'data' => []],
            ['id' => 'd', 'type' => 'rich', 'data' => []],
        ]);

        $this->assertTrue($sections[0]['hidden']);
        $this->assertTrue($sections[1]['hidden']);
        $this->assertArrayNotHasKey('hidden', $sections[2]);
        $this->assertArrayNotHasKey('hidden', $sections[3]);
    }

    public function test_visible_leaves_hidden_sections_off(): void
    {
        $sections = PageContent::normalize([
            ['id' => 'a', 'type' => 'rich', 'hidden' => true, 'data' => []],
            ['id' => 'b', 'type' => 'rich', 'data' => []],
        ]);

        $this->assertSame(['b'], array_column(PageContent::visible($sections), 'id'));
    }

    public function test_it_keeps_at_most_thirty_sections(): void
    {
        $many = array_fill(0, 45, ['type' => 'rich', 'data' => []]);

        $this->assertSame(30, PageContent::MAX_SECTIONS);
        $this->assertCount(30, PageContent::normalize($many));
    }

    public function test_it_keeps_a_known_section_layout_and_reads_anything_else_as_plain(): void
    {
        $sections = PageContent::normalize([
            ['type' => 'rich', 'data' => ['layout' => 'reviews']],
            ['type' => 'rich', 'data' => ['layout' => 'sparkly']],
            ['type' => 'rich', 'data' => []],
        ]);

        $this->assertSame(['reviews', 'plain', 'plain'], array_column(array_column($sections, 'data'), 'layout'));
    }

    /**
     * @return array<string, array{0: mixed, 1: string|null}>
     */
    public static function images(): array
    {
        return [
            'https address' => ['https://cdn.example/bg.jpg', 'https://cdn.example/bg.jpg'],
            'http address' => ['http://cdn.example/bg.jpg', 'http://cdn.example/bg.jpg'],
            'path on this site' => ['/storage/block-editor/bg.jpg', '/storage/block-editor/bg.jpg'],
            'padded address' => ['  https://cdn.example/bg.jpg ', 'https://cdn.example/bg.jpg'],
            'javascript' => ['javascript:alert(1)', null],
            'data' => ['data:image/svg+xml;base64,PHN2Zz4=', null],
            'protocol-relative' => ['//evil.example/x.png', null],
            'a disk path' => ['pages/abc/photo.jpg', null],
            'parent folders' => ['../../.env', null],
            'an array' => [['https://a.example/x.jpg'], null],
            'nothing' => [null, null],
        ];
    }

    #[DataProvider('images')]
    public function test_a_background_image_is_a_web_or_site_address_or_nothing(mixed $image, ?string $expected): void
    {
        $sections = PageContent::normalize([['type' => 'rich', 'data' => ['background' => 'image', 'image' => $image]]]);

        $this->assertSame($expected, $sections[0]['data']['image']);
    }

    public function test_it_cleans_every_field_of_a_section_and_fills_in_the_defaults(): void
    {
        $document = [
            ['id' => 'p1', 'type' => 'paragraph', 'props' => [], 'content' => [['type' => 'text', 'text' => 'Hai', 'styles' => []]], 'children' => []],
            ['id' => 't1', 'type' => 'table', 'props' => [], 'content' => ['rows' => []], 'children' => 'junk'],
            'not a block',
        ];

        [$messy, $styled, $defaults] = PageContent::normalize([
            ['type' => 'rich', 'data' => [
                'document' => $document,
                'background' => 'image',
                'background_color' => 'red; x: y',
                'image' => 'javascript:alert(1)',
                'tint' => 250,
                'card' => '1',
                'padding' => 'huge',
                'font' => 'comic-sans',
                'align' => 'justify',
                'text_color' => 'red',
                'corners' => 'wobbly',
                'button' => 'blink',
                'width' => 'huge',
                'anchor' => 'Not a slug!',
            ]],
            ['type' => 'rich', 'data' => ['font' => 'serif', 'align' => 'center', 'text_color' => '#ABCDEF', 'corners' => 'round', 'button' => 'pill', 'width' => 'full']],
            ['type' => 'rich', 'data' => []],
        ]);

        $this->assertSame([
            'document' => [
                $document[0],
                ['id' => 't1', 'type' => 'table', 'props' => [], 'content' => ['type' => 'tableContent', 'rows' => []], 'children' => []],
            ],
            'layout' => 'plain',
            'background' => 'image',
            'background_color' => null,
            'image' => null,
            'tint' => 100,
            'card' => true,
            'padding' => 'md',
            'font' => 'theme',
            'align' => 'auto',
            'text_color' => null,
            'corners' => 'theme',
            'button' => 'theme',
            'width' => 'normal',
            'anchor' => null,
        ], $messy['data']);

        $this->assertSame([
            'font' => 'serif',
            'align' => 'center',
            'text_color' => '#abcdef',
            'corners' => 'round',
            'button' => 'pill',
            'width' => 'full',
        ], array_slice($styled['data'], -7, 6));

        $this->assertSame([
            'document' => [],
            'layout' => 'plain',
            'background' => 'none',
            'background_color' => null,
            'image' => null,
            'tint' => 40,
            'card' => false,
            'padding' => 'md',
            'font' => 'theme',
            'align' => 'auto',
            'text_color' => null,
            'corners' => 'theme',
            'button' => 'theme',
            'width' => 'normal',
            'anchor' => null,
        ], $defaults['data']);
    }

    /**
     * @return array<string, array{0: mixed, 1: string|null}>
     */
    public static function anchors(): array
    {
        return [
            'a slug' => ['tentang', 'tentang'],
            'with dashes' => ['hubungi-kami', 'hubungi-kami'],
            'with digits' => ['langkah-2', 'langkah-2'],
            'upper case' => ['Tentang', 'tentang'],
            'spaces become dashes' => ['  Hubungi Kami ', 'hubungi-kami'],
            'a double dash' => ['a--b', null],
            'a leading dash' => ['-a', null],
            'a trailing dash' => ['a-', null],
            'an underscore' => ['a_b', null],
            'a hash sign' => ['#tentang', null],
            'markup' => ['"><script>', null],
            'too long' => [str_repeat('a', 41), null],
            'exactly 40' => [str_repeat('a', 40), str_repeat('a', 40)],
            'empty' => ['', null],
            'a number' => [12, null],
            'an array' => [['a'], null],
            'missing' => [null, null],
        ];
    }

    #[DataProvider('anchors')]
    public function test_an_anchor_is_a_slug_or_nothing(mixed $anchor, ?string $expected): void
    {
        $sections = PageContent::normalize([['type' => 'rich', 'data' => ['anchor' => $anchor]]]);

        $this->assertSame($expected, $sections[0]['data']['anchor']);
    }

    public function test_a_section_without_an_anchor_key_gets_a_null_anchor(): void
    {
        $this->assertNull(PageContent::normalize([['type' => 'rich', 'data' => []]])[0]['data']['anchor']);
    }

    public function test_it_drops_a_document_that_is_too_big_to_keep(): void
    {
        $huge = [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => str_repeat('a', 100_001), 'styles' => []]]]];

        $this->assertSame([], PageContent::normalize([['type' => 'rich', 'data' => ['document' => $huge]]])[0]['data']['document']);
    }

    public function test_the_rules_guard_the_outer_shape_of_a_page(): void
    {
        $ok = Validator::make(['sections' => [['type' => 'rich', 'data' => ['document' => []]]]], PageContent::rules());
        $this->assertTrue($ok->passes());

        $this->assertFalse(Validator::make(['sections' => 'nope'], PageContent::rules())->passes());
        $this->assertFalse(Validator::make(['sections' => [['type' => 'script']]], PageContent::rules())->passes());
        $this->assertFalse(Validator::make(['sections' => array_fill(0, 31, ['type' => 'rich'])], PageContent::rules())->passes());

        app()->setLocale('en');
        $huge = [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => str_repeat('a', 100_001), 'styles' => []]]]];
        $tooBig = Validator::make(['sections' => [['type' => 'rich', 'data' => ['document' => $huge]]]], PageContent::rules());
        $this->assertTrue($tooBig->fails());
        $this->assertStringContainsString('too long', strtolower($tooBig->errors()->first()));
    }

    public function test_a_ref_section_keeps_its_ref_and_hidden_flag_and_has_no_data(): void
    {
        $sections = PageContent::normalize([
            ['id' => 'k9x8', 'type' => 'ref', 'ref' => 12, 'hidden' => true, 'data' => ['document' => []], 'lock' => ['move' => true]],
            ['id' => 'k9x9', 'type' => 'ref', 'ref' => 'header-main'],
            ['id' => 'k9y0', 'type' => 'ref', 'ref' => '12'],
        ]);

        $this->assertSame([
            ['id' => 'k9x8', 'type' => 'ref', 'ref' => 12, 'hidden' => true],
            ['id' => 'k9x9', 'type' => 'ref', 'ref' => 'header-main'],
            ['id' => 'k9y0', 'type' => 'ref', 'ref' => 12],
        ], $sections);
        $this->assertSame(['rich', 'ref'], PageContent::types());
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function badRefs(): array
    {
        return [
            'zero' => [0],
            'negative' => [-3],
            'markup' => ['<b>x</b>'],
            'too long' => [str_repeat('a', 41)],
            'empty' => [''],
            'a float' => [1.5],
            'an array' => [[12]],
            'missing' => [null],
        ];
    }

    #[DataProvider('badRefs')]
    public function test_a_ref_section_with_a_bad_ref_is_dropped(mixed $ref): void
    {
        $this->assertSame([], PageContent::normalize([['id' => 'r1', 'type' => 'ref', 'ref' => $ref]]));
    }

    public function test_a_lock_keeps_only_the_known_keys_that_are_true_and_is_left_out_when_empty(): void
    {
        [$locked, $partly, $open] = PageContent::normalize([
            ['id' => 'a', 'type' => 'rich', 'lock' => ['move' => true, 'remove' => '1', 'content' => true, 'style' => true, 'evil' => true], 'data' => []],
            ['id' => 'b', 'type' => 'rich', 'lock' => ['move' => false, 'style' => true], 'data' => []],
            ['id' => 'c', 'type' => 'rich', 'lock' => 'everything', 'data' => []],
        ]);

        $this->assertSame(['move' => true, 'remove' => true, 'content' => true, 'style' => true], $locked['lock']);
        $this->assertSame(['style' => true], $partly['lock']);
        $this->assertArrayNotHasKey('lock', $open);
    }

    public function test_the_rules_accept_ref_sections_and_refuse_bad_refs(): void
    {
        $this->assertTrue(Validator::make(['sections' => [['type' => 'ref', 'ref' => 4]]], PageContent::rules())->passes());
        $this->assertTrue(Validator::make(['sections' => [['type' => 'ref', 'ref' => 'footer']]], PageContent::rules())->passes());
        $this->assertFalse(Validator::make(['sections' => [['type' => 'ref']]], PageContent::rules())->passes());
        $this->assertFalse(Validator::make(['sections' => [['type' => 'ref', 'ref' => '"><script>']]], PageContent::rules())->passes());
    }

    public function test_the_rules_can_be_prefixed_for_a_nested_field(): void
    {
        $rules = PageContent::rules('page.content');

        $this->assertArrayHasKey('page.content', $rules);
        $this->assertArrayHasKey('page.content.*.type', $rules);
    }
}
