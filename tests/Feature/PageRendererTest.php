<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class PageRendererTest extends TestCase
{
    use BlockHelpers;

    /**
     * @param  list<array<string, mixed>>  $document
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function section(string $id, array $document, array $data = [], bool $hidden = false): array
    {
        return ['id' => $id, 'type' => 'rich', 'data' => ['document' => $document, ...$data], ...($hidden ? ['hidden' => true] : [])];
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     */
    private function render(array $sections, ?RenderContext $context = null): string
    {
        return app(PageRenderer::class)->render($sections, $context ?? new RenderContext);
    }

    public function test_it_draws_each_section_in_a_wrapper_with_its_id_in_order(): void
    {
        $html = $this->render([
            $this->section('one', [Blocks::heading(2, 'Satu')]),
            $this->section('two', [Blocks::heading(2, 'Dua')]),
        ]);

        $this->assertSame(['one', 'two'], array_map(fn ($e) => $e->getAttribute('data-block-id'), $this->select($html, '[data-block-id]')));
        $this->assertSame(['Satu', 'Dua'], $this->texts($html, '[data-block-id] h2'));
    }

    public function test_it_leaves_the_sections_an_author_hid_off_the_page(): void
    {
        $sections = [
            $this->section('hero1', [Blocks::heading(1, 'Kulit cerah dalam 7 hari')]),
            $this->section('offer1', [Blocks::heading(2, 'Promosi Raya sudah tamat')], hidden: true),
        ];

        foreach ([new RenderContext, new RenderContext(isPreview: true), new RenderContext(forBuilder: true, isPreview: true)] as $context) {
            $html = $this->render($sections, $context);

            $this->assertStringContainsString('Kulit cerah dalam 7 hari', $html);
            $this->assertStringNotContainsString('Promosi Raya sudah tamat', $html);
            $this->assertStringNotContainsString('data-block-id="offer1"', $html);
        }
    }

    public function test_it_normalizes_the_sections_it_is_given(): void
    {
        $html = $this->render([
            ['id' => 'a', 'type' => 'rich', 'data' => ['document' => [Blocks::image('javascript:alert(1)')], 'background' => 'image', 'image' => 'javascript:alert(1)', 'evil' => '<script>']],
            ['id' => 'b', 'type' => 'script', 'data' => ['document' => [Blocks::heading(1, 'Not drawn')]]],
            'not a section',
        ]);

        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('Not drawn', $html);
        $this->assertCount(1, $this->select($html, '[data-block-id]'));
    }

    public function test_an_empty_section_keeps_its_wrapper_but_draws_no_section(): void
    {
        $html = $this->render([$this->section('free2', [])]);

        $this->assertCount(1, $this->select($html, '[data-block-id="free2"]'));
        $this->assertSame([], $this->select($html, 'section'));
    }

    public function test_the_empty_section_label_is_only_for_a_preview_and_speaks_the_page_language(): void
    {
        app()->setLocale('ms');
        $sections = [$this->section('free2', [])];

        $this->assertStringNotContainsString('data-empty-label', $this->render($sections));
        $this->assertStringContainsString(
            'data-empty-label="Bahagian ini masih kosong. Isikan untuk melihatnya di sini."',
            $this->render($sections, new RenderContext(isPreview: true)),
        );

        app()->setLocale('en');
        $this->assertStringContainsString('data-empty-label="This section is empty. Fill it in to see it here."', $this->render($sections, new RenderContext(isPreview: true)));
    }

    public function test_it_draws_a_section_as_plain_html_in_its_look(): void
    {
        $html = $this->render([
            $this->section('free1', [
                $this->block('heading', [$this->text('Bonus <b>istimewa</b>')], ['level' => 2]),
                $this->block('video', props: ['url' => 'https://youtu.be/dQw4w9WgXcQ']),
            ], ['background' => 'color', 'background_color' => '#0f172a', 'padding' => 'sm']),
        ]);

        $section = $this->first($html, '[data-block-id="free1"] section[data-block="rich"]');

        $this->assertNotNull($section);
        $this->assertSame('sf-rich-section sf-layout-plain sf-has-bg sf-rich-light', $section->getAttribute('class'));
        $this->assertStringContainsString('background-color: #0f172a;', $section->getAttribute('style'));
        $this->assertStringContainsString('--sf-pad: clamp(1.5rem, 4vw, 2.5rem);', $section->getAttribute('style'));
        $this->assertSame('plain', $section->getAttribute('data-layout'));
        $this->assertSame(['Bonus <b>istimewa</b>'], $this->texts($html, '.sf-rich h2'));
        $this->assertSame('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', $this->first($html, 'iframe')->getAttribute('src'));
    }

    /**
     * @return array<string, array{0: bool, 1: string}>
     */
    public static function pictureSections(): array
    {
        return [
            'white text on the photo' => [false, 'sf-rich-section sf-layout-plain sf-has-bg sf-rich-light'],
            'dark text on a white card' => [true, 'sf-rich-section sf-layout-plain sf-has-bg sf-rich-card'],
        ];
    }

    #[DataProvider('pictureSections')]
    public function test_it_puts_a_section_on_its_photo_with_a_tint_or_on_a_white_card(bool $card, string $class): void
    {
        $html = $this->render([
            $this->section('free1', [Blocks::paragraph('Teks')], ['background' => 'image', 'image' => 'https://cdn.example/bg.jpg', 'tint' => 60, 'card' => $card]),
        ]);

        $this->assertSame($class, $this->first($html, 'section[data-block="rich"]')->getAttribute('class'));
        $this->assertSame('https://cdn.example/bg.jpg', $this->first($html, 'section img.sf-rich-picture')->getAttribute('src'));
        $this->assertSame('opacity: 0.6;', $this->first($html, 'section .sf-rich-tint')->getAttribute('style'));
    }

    public function test_a_photo_background_on_this_site_works_and_a_section_with_only_a_photo_is_still_drawn(): void
    {
        $html = $this->render([$this->section('free1', [], ['background' => 'image', 'image' => '/storage/block-editor/bg.jpg', 'tint' => 0])]);

        $this->assertSame('/storage/block-editor/bg.jpg', $this->first($html, 'img.sf-rich-picture')->getAttribute('src'));
        $this->assertSame([], $this->select($html, '.sf-rich-tint'));
    }

    public function test_a_section_with_only_a_colour_is_still_drawn(): void
    {
        $html = $this->render([$this->section('free1', [], ['background' => 'color', 'background_color' => '#ffeecc'])]);

        $this->assertSame('sf-rich-section sf-layout-plain sf-has-bg sf-light-bg', $this->first($html, 'section')->getAttribute('class'));
    }

    public function test_it_draws_a_sections_own_style(): void
    {
        $html = $this->render([
            $this->section('styled1', [Blocks::heading(2, 'Gaya')], ['font' => 'serif', 'align' => 'center', 'corners' => 'square', 'button' => 'pill', 'text_color' => '#123456', 'padding' => 'none']),
            $this->section('plain1', [Blocks::heading(2, 'Biasa')], ['font' => 'comic-sans', 'corners' => 'wobbly']),
        ]);

        [$styled, $plain] = $this->select($html, 'section');

        $this->assertSame(
            'sf-rich-section sf-layout-plain sf-flush sf-font-serif sf-align-center sf-corners-square sf-button-pill sf-text-color sf-dark-text',
            $styled->getAttribute('class'),
        );
        $this->assertStringContainsString('--sf-custom-text: #123456;', $styled->getAttribute('style'));
        $this->assertStringContainsString('--sf-pad: 0px;', $styled->getAttribute('style'));
        $this->assertSame('sf-rich-section sf-layout-plain', $plain->getAttribute('class'));
    }

    public function test_a_full_width_section_has_a_class_for_the_stylesheet(): void
    {
        $html = $this->render([
            $this->section('wide', [Blocks::paragraph('A')], ['width' => 'full', 'padding' => 'none']),
            $this->section('normal', [Blocks::paragraph('B')]),
        ]);

        [$wide, $normal] = $this->select($html, 'section');

        $this->assertSame('sf-rich-section sf-layout-plain sf-flush sf-full', $wide->getAttribute('class'));
        $this->assertSame('sf-rich-section sf-layout-plain', $normal->getAttribute('class'));
    }

    /**
     * @return array<string, array{0: mixed, 1: string|null}>
     */
    public static function anchors(): array
    {
        return [
            'a slug' => ['tentang', 'tentang'],
            'upper case and spaces' => ['Hubungi Kami', 'hubungi-kami'],
            'not a slug' => ['"><script>alert(1)</script>', null],
            'missing' => [null, null],
        ];
    }

    #[DataProvider('anchors')]
    public function test_the_anchor_is_the_id_of_the_section_element(mixed $anchor, ?string $expected): void
    {
        $html = $this->render([$this->section('abc', [Blocks::paragraph('A')], ['anchor' => $anchor])]);

        $section = $this->first($html, 'section');

        $this->assertSame($expected ?? '', $section->getAttribute('id'));
        $this->assertSame($expected !== null, $section->hasAttribute('id'));
        $this->assertSame('abc', $this->first($html, '[data-block-id]')->getAttribute('data-block-id'));
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_a_hidden_section_is_not_reachable_by_its_anchor(): void
    {
        $html = $this->render([$this->section('abc', [Blocks::paragraph('A')], ['anchor' => 'tentang'], hidden: true)]);

        $this->assertStringNotContainsString('tentang', $html);
    }

    public function test_it_draws_the_layout_of_a_section(): void
    {
        $html = $this->render([
            $this->section('faq', [Blocks::heading(2, 'Soalan'), Blocks::toggle('Boleh?', [Blocks::paragraph('Boleh.')])], ['layout' => 'faq']),
        ]);

        $this->assertSame('sf-rich-section sf-layout-faq', $this->first($html, 'section')->getAttribute('class'));
        $this->assertSame('faq', $this->first($html, 'section')->getAttribute('data-layout'));
        $this->assertCount(1, $this->select($html, '.sf-grid-faq > .sf-question'));
    }

    public function test_a_section_that_is_only_an_own_block_is_drawn(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(
            OwnBlock::make('board')->fields([Field::text('heading'), Field::link('link'), Field::list('items')->fields([Field::text('name')])])->view('fixtures::blocks.board'),
        );
        $svgOnly = OwnBlock::make('svg')->view('fixtures::blocks.svg');
        app(BlockRegistry::class)->register($svgOnly);

        $html = $this->render([
            $this->section('own1', [Blocks::ownBlock('board', ['heading' => 'Papan'])], ['padding' => 'none', 'width' => 'full']),
            $this->section('own2', [Blocks::ownBlock('svg')]),
            $this->section('own3', [Blocks::ownBlock('gone')]),
        ]);

        $this->assertSame(['Papan'], $this->texts($html, '[data-block-id="own1"] .bn-own-block h2'));
        $this->assertCount(1, $this->select($html, '[data-block-id="own2"] section .bn-own-block svg'));
        $this->assertSame([], $this->select($html, '[data-block-id="own3"] section'));
    }

    public function test_a_section_of_only_own_blocks_is_kept_out_of_the_text_styles(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(OwnBlock::make('board')->fields([Field::text('heading'), Field::link('link'), Field::list('items')->fields([Field::text('name')])])->view('fixtures::blocks.board'));

        $html = $this->render([
            $this->section('only', [Blocks::ownBlock('board', ['heading' => 'Papan'])], ['padding' => 'none', 'width' => 'full']),
            $this->section('mixed', [Blocks::heading(2, 'Tajuk'), Blocks::ownBlock('board', ['heading' => 'Papan dua'])]),
        ]);

        $this->assertCount(1, $this->select($html, '[data-block-id="only"] .sf-own > .bn-own-block'));
        $this->assertCount(1, $this->select($html, '[data-block-id="only"] > section.sf-own-section'));
        $this->assertSame([], $this->select($html, '[data-block-id="mixed"] > section.sf-own-section'));
        $this->assertSame([], $this->select($html, '[data-block-id="only"] .sf-rich'));
        $this->assertCount(1, $this->select($html, '[data-block-id="mixed"] .sf-rich .bn-own-block'));
    }

    public function test_in_the_builder_an_own_block_only_section_keeps_its_item_mark(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(OwnBlock::make('board')->fields([Field::text('heading'), Field::link('link'), Field::list('items')->fields([Field::text('name')])])->view('fixtures::blocks.board'));

        $html = $this->render(
            [$this->section('only', [Blocks::ownBlock('board', ['heading' => 'Papan'])])],
            new RenderContext(forBuilder: true, isPreview: true),
        );

        $this->assertCount(1, $this->select($html, '.sf-own [data-item="0"]'));
    }

    public function test_in_the_builder_items_carry_their_place_and_an_unknown_own_block_shows_a_placeholder(): void
    {
        $html = $this->render([
            $this->section('free1', [Blocks::heading(2, 'Tajuk'), Blocks::image(''), Blocks::ownBlock('gone')]),
        ], new RenderContext(forBuilder: true, isPreview: true));

        $this->assertCount(1, $this->select($html, 'h2[data-item="0"]'));
        $this->assertCount(1, $this->select($html, '.bn-media-empty[data-empty-media="photo"][data-item="1"]'));
        $this->assertCount(1, $this->select($html, '.bn-media-empty[data-empty-media="block"][data-item="2"]'));
    }

    public function test_visitors_get_no_builder_markers(): void
    {
        $html = $this->render([$this->section('free1', [Blocks::heading(2, 'Tajuk'), Blocks::image('')])]);

        $this->assertStringNotContainsString('data-item', $html);
        $this->assertStringNotContainsString('bn-media-empty', $html);
    }

    public function test_a_page_without_sections_is_empty(): void
    {
        $this->assertSame('', $this->render([]));
    }
}
