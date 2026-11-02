<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BlockNoteRendererTest extends TestCase
{
    use BlockHelpers;

    /**
     * @param  array<int, mixed>  $blocks
     */
    private function render(array $blocks, ?RenderContext $context = null): string
    {
        return app(BlockNoteRenderer::class)->render($blocks, $context);
    }

    public function test_it_draws_headings_styled_text_line_breaks_and_grouped_lists(): void
    {
        $html = $this->render([
            $this->block('heading', [$this->text('Kenapa pilih kami')], ['level' => 2, 'textAlignment' => 'center']),
            $this->block('paragraph', [$this->text('Madu '), $this->text('asli', ['bold' => true, 'textColor' => 'red']), $this->text("\nbaris dua")]),
            $this->block('bulletListItem', [$this->text('Satu')]),
            $this->block('bulletListItem', [$this->text('Dua')]),
            $this->block('numberedListItem', [$this->text('Langkah')]),
        ]);

        $this->assertStringContainsString('<h2 style="text-align: center;">Kenapa pilih kami</h2>', $html);
        $this->assertStringContainsString('<span style="color: #dc2626;"><strong>asli</strong></span>', $html);
        $this->assertStringContainsString("<br>\nbaris dua", $html);
        $this->assertStringContainsString('<ul><li>Satu</li><li>Dua</li></ul><ol><li>Langkah</li></ol>', $html);
    }

    public function test_it_escapes_text_and_drops_unsafe_links_and_media_addresses(): void
    {
        $html = $this->render([
            $this->block('paragraph', [
                $this->text('<script>alert(1)</script>'),
                ['type' => 'link', 'href' => 'javascript:alert(1)', 'content' => [$this->text('Klik')]],
                ['type' => 'link', 'href' => 'https://wa.me/60123456789', 'content' => [$this->text('WhatsApp')]],
            ]),
            $this->block('image', props: ['url' => 'data:image/svg+xml;base64,PHN2Zz4=', 'caption' => 'x']),
            $this->block('image', props: ['url' => '//evil.example/x.png']),
            $this->block('image', props: ['url' => 'https://cdn.example/photo.jpg', 'caption' => '"><img src=x onerror=alert(1)>']),
        ]);

        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringContainsString('Klik<a href="https://wa.me/60123456789" target="_blank" rel="noopener">WhatsApp</a>', $html);
        $this->assertStringNotContainsString('data:image', $html);
        $this->assertStringNotContainsString('evil.example', $html);
        $this->assertStringNotContainsString('onerror=alert(1)>', $html);
        $this->assertStringContainsString('src="https://cdn.example/photo.jpg"', $html);
    }

    public function test_inline_links_may_also_point_to_an_anchor_or_a_phone(): void
    {
        $html = $this->render([
            $this->block('paragraph', [
                ['type' => 'link', 'href' => '#tentang', 'content' => [$this->text('Atas')]],
                ['type' => 'link', 'href' => 'tel:+60123456789', 'content' => [$this->text('Telefon')]],
            ]),
        ]);

        $this->assertStringContainsString('<a href="#tentang"', $html);
        $this->assertStringContainsString('<a href="tel:+60123456789"', $html);
    }

    public function test_it_puts_only_known_colours_and_sizes_into_styles_whatever_the_document_holds(): void
    {
        $html = $this->render([
            $this->block('paragraph', [$this->text('Teks', ['textColor' => 'red;background:url(x)', 'backgroundColor' => ['nested']])], [
                'textColor' => ['array'],
                'spaceTop' => 'calc(1px)',
                'width' => '6; color: red',
            ]),
            $this->block('spacer', props: ['size' => ['xl']]),
        ]);

        $this->assertSame('<p>Teks</p><div class="bn-spacer" style="height: 2.5rem;"></div>', $html);
    }

    public function test_it_draws_columns_a_fold_out_card_in_the_page_language_and_resized_items(): void
    {
        app()->setLocale('ms');

        $html = $this->render([
            $this->block('columnList', children: [
                $this->block('column', props: ['width' => 2], children: [$this->block('paragraph', [$this->text('Kiri')], ['width' => 18])]),
                $this->block('column', props: ['width' => 1], children: [$this->block('paragraph', [$this->text('Kanan')])]),
            ]),
            $this->block('card', [$this->text('Bonus')], ['url' => 'https://cdn.example/banner.jpg', 'buttonColor' => '#111111'], [
                $this->block('paragraph', [$this->text('Ebook percuma')]),
            ]),
            $this->block('image', props: ['url' => 'https://cdn.example/a.jpg', 'width' => 6, 'textAlignment' => 'center', 'spaceBottom' => 'lg']),
            $this->block('image', props: ['url' => 'https://cdn.example/b.jpg', 'width' => 18]),
        ]);

        $this->assertStringContainsString('<div class="bn-columns"><div class="bn-column" style="flex-grow: 2.0000;"><p>Kiri</p></div>', $html);
        $this->assertStringContainsString('<details class="bn-card"><summary class="bn-card-head bn-card-has-image">', $html);
        $this->assertStringContainsString('background-color: #111111; color: #ffffff;', $html);
        $this->assertStringContainsString('Lihat &rarr;', $html);
        $this->assertStringContainsString('<div class="bn-card-body"><p>Ebook percuma</p></div>', $html);
        $this->assertStringContainsString('<div class="bn-item-space" style="padding-bottom: 3.5rem;"><div class="bn-width" style="width: 50%; margin-left: auto; margin-right: auto;">', $html);
        $this->assertStringContainsString('<div class="bn-width bn-bleed-6"><figure class="bn-image"><img src="https://cdn.example/b.jpg"', $html);
    }

    public function test_the_card_speaks_english_when_the_page_does(): void
    {
        app()->setLocale('en');

        $html = $this->render([$this->block('card', [$this->text('Bonus')], [], [$this->block('paragraph', [$this->text('x')])])]);

        $this->assertStringContainsString('Show &rarr;', $html);
        $this->assertStringContainsString('Hide &darr;', $html);
    }

    public function test_it_plays_youtube_links_in_a_player_and_other_video_links_in_a_video_tag(): void
    {
        $html = $this->render([
            $this->block('video', props: ['url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']),
            $this->block('video', props: ['url' => 'https://cdn.example/clip.mp4']),
        ]);

        $this->assertStringContainsString('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"', $html);
        $this->assertStringContainsString('<video class="bn-video" src="https://cdn.example/clip.mp4" controls', $html);
    }

    public function test_it_skips_block_types_it_does_not_know_and_anything_that_is_not_a_block(): void
    {
        $this->assertSame('<p>Known</p>', $this->render([
            $this->block('alert', [$this->text('Unknown')]),
            'not a block',
            $this->block('paragraph', [$this->text('Known')]),
        ]));
    }

    public function test_it_draws_audio_files_tables_toggles_code_and_dividers(): void
    {
        $html = $this->render([
            $this->block('audio', props: ['url' => 'https://cdn.example/a.mp3']),
            $this->block('file', props: ['url' => 'https://cdn.example/menu.pdf', 'name' => 'Menu']),
            $this->block('table', ['type' => 'tableContent', 'rows' => [['cells' => [[$this->text('A')], ['type' => 'tableCell', 'props' => ['colspan' => 2], 'content' => [$this->text('B')]]]]]]),
            $this->block('toggleListItem', [$this->text('Soalan')], [], [$this->block('paragraph', [$this->text('Jawapan')])]),
            $this->block('codeBlock', [$this->text('<b>x</b>')]),
            $this->block('divider'),
        ]);

        $this->assertStringContainsString('<audio src="https://cdn.example/a.mp3" controls preload="none"></audio>', $html);
        $this->assertStringContainsString('<p><a href="https://cdn.example/menu.pdf" target="_blank" rel="noopener">Menu</a></p>', $html);
        $this->assertStringContainsString('<td>A</td><td colspan="2">B</td>', $html);
        $this->assertStringContainsString('<details class="bn-toggle"><summary>Soalan</summary><div><p>Jawapan</p></div></details>', $html);
        $this->assertStringContainsString('<pre><code>&lt;b&gt;x&lt;/b&gt;</code></pre>', $html);
        $this->assertStringContainsString('<hr>', $html);
    }

    public function test_it_marks_each_item_with_its_place_in_the_document_for_the_builder(): void
    {
        $html = $this->render([
            $this->block('heading', [$this->text('Kek Batik')], ['level' => 2]),
            $this->block('bulletListItem', [$this->text('Coklat Belgium')]),
            $this->block('bulletListItem', [$this->text('Tanpa pengawet')]),
            $this->block('card', [$this->text('Bonus')], [], [$this->block('paragraph', [$this->text('Ebook percuma')])]),
            $this->block('columnList', children: [
                $this->block('column', children: [$this->block('paragraph', [$this->text('Kiri')])]),
                $this->block('column', children: [$this->block('paragraph', [$this->text('Kanan')], ['spaceTop' => 'sm'])]),
            ]),
        ], new RenderContext(forBuilder: true));

        $this->assertStringContainsString('<h2 data-item="0">Kek Batik</h2>', $html);
        $this->assertStringContainsString('<ul><li data-item="1">Coklat Belgium</li><li data-item="2">Tanpa pengawet</li></ul>', $html);
        $this->assertStringContainsString('<details data-item="3" class="bn-card">', $html);
        $this->assertStringContainsString('<div class="bn-card-body"><p data-item="3.0">Ebook percuma</p></div>', $html);
        $this->assertStringContainsString('<div data-item="4" class="bn-columns">', $html);
        $this->assertStringContainsString('<p data-item="4.0.0">Kiri</p>', $html);
        $this->assertStringContainsString('<div data-item="4.1.0" class="bn-item-space" style="padding-top: 1rem;"><p>Kanan</p></div>', $html);
    }

    public function test_it_leaves_items_unmarked_for_visitors_and_never_trusts_a_place_written_into_the_document(): void
    {
        $forged = [...$this->block('paragraph', [$this->text('Halo')]), BlockNoteRenderer::ITEM_PATH => '"><script>alert(1)</script>'];

        $this->assertSame('<p>Halo</p>', $this->render([$this->block('paragraph', [$this->text('Halo')])]));
        $this->assertSame('<p data-item="0">Halo</p>', $this->render([$forged], new RenderContext(forBuilder: true)));
    }

    public function test_an_empty_photo_or_video_shows_where_it_goes_in_the_builder_and_nothing_to_visitors(): void
    {
        app()->setLocale('en');
        $blocks = [$this->block('image', props: ['url' => '']), $this->block('video', props: ['url' => 'javascript:x'])];

        $builder = $this->render($blocks, new RenderContext(forBuilder: true));

        $this->assertStringContainsString('<figure data-item="0" class="bn-media-empty" data-empty-media="photo"><span>Tap to add your photo</span></figure>', $builder);
        $this->assertStringContainsString('data-empty-media="video"><span>Tap to add your video</span>', $builder);
        $this->assertSame('', $this->render($blocks));
        $this->assertSame('', $this->render($blocks, new RenderContext(isPreview: true)));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function linkAddresses(): array
    {
        return [
            'https' => ['https://example.com/hubungi'],
            'http' => ['http://example.com'],
            'mailto' => ['mailto:hai@example.com'],
            'tel' => ['tel:+60123456789'],
            'anchor' => ['#tentang'],
            'path on this site' => ['/hubungi?x=1'],
        ];
    }

    #[DataProvider('linkAddresses')]
    public function test_a_button_with_an_allowed_address_is_a_link(string $url): void
    {
        $html = $this->render([Blocks::button('Hubungi kami', $url)]);

        $this->assertSame('<a class="bn-button bn-button-solid" href="'.e($url).'">Hubungi kami</a>', $html);
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function unsafeAddresses(): array
    {
        return [
            'javascript' => ['javascript:alert(1)'],
            'javascript in caps' => ['JaVaScRiPt:alert(1)'],
            'data' => ['data:text/html,<script>alert(1)</script>'],
            'protocol-relative' => ['//evil.example/x'],
            'ftp' => ['ftp://example.com/file'],
            'a bare word' => ['hubungi'],
            'a bare hash' => ['#'],
            'empty' => [''],
            'an array' => [['https://example.com']],
            'nothing' => [null],
        ];
    }

    #[DataProvider('unsafeAddresses')]
    public function test_a_button_with_any_other_address_is_a_span_with_no_link(mixed $url): void
    {
        $html = $this->render([$this->block('button', props: ['text' => 'Klik', 'url' => $url, 'variant' => 'solid'])]);

        $this->assertSame('<span class="bn-button bn-button-solid">Klik</span>', $html);
    }

    public function test_a_button_has_a_solid_and_an_outline_look_and_escapes_its_text(): void
    {
        $outline = $this->render([Blocks::button('<b>Lihat</b>', '/menu', 'outline')]);
        $unknown = $this->render([$this->block('button', props: ['text' => 'A', 'url' => '/a', 'variant' => 'neon'])]);

        $this->assertSame('<a class="bn-button bn-button-outline" href="/menu">&lt;b&gt;Lihat&lt;/b&gt;</a>', $outline);
        $this->assertSame('<a class="bn-button bn-button-solid" href="/a">A</a>', $unknown);
    }

    public function test_a_button_without_text_draws_nothing(): void
    {
        $this->assertSame('', $this->render([Blocks::button('  ', '/a')]));
    }

    public function test_a_button_takes_the_item_marker_and_spacing_like_any_block(): void
    {
        $html = $this->render([$this->block('button', props: ['text' => 'Pergi', 'url' => '/a', 'variant' => 'solid', 'spaceTop' => 'lg'])], new RenderContext(forBuilder: true));

        $this->assertSame('<div data-item="0" class="bn-item-space" style="padding-top: 3.5rem;"><a class="bn-button bn-button-solid" href="/a">Pergi</a></div>', $html);
    }

    public function test_it_draws_an_own_block_through_the_registry(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(
            OwnBlock::make('board')->fields([Field::text('heading')->default('Stationery'), Field::link('link'), Field::list('items')->fields([Field::text('name')])])->view('fixtures::blocks.board'),
        );

        $html = $this->render([Blocks::ownBlock('board', ['heading' => 'Alat tulis', 'link' => 'javascript:x'])]);

        $this->assertStringContainsString('<div class="bn-own-block" data-own-block="board">', $html);
        $this->assertStringContainsString('<h2>Alat tulis</h2>', $html);
        $this->assertStringNotContainsString('javascript:', $html);
    }

    public function test_an_own_block_is_marked_for_the_builder_and_follows_item_width(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(
            OwnBlock::make('board')->fields([Field::text('heading'), Field::link('link'), Field::list('items')->fields([Field::text('name')])])->view('fixtures::blocks.board'),
        );
        $block = Blocks::ownBlock('board', ['heading' => 'A']);
        $block['props']['width'] = 6;

        $html = $this->render([$block], new RenderContext(forBuilder: true));

        $this->assertStringStartsWith('<div data-item="0" class="bn-width" style="width: 50%;"><div class="bn-own-block" data-own-block="board">', $html);
    }

    public function test_an_own_block_of_an_unknown_kind_is_empty_for_visitors_and_a_placeholder_in_the_builder(): void
    {
        app()->setLocale('en');
        $block = Blocks::ownBlock('gone', ['a' => 1]);

        $this->assertSame('', $this->render([$block]));
        $this->assertSame('', $this->render([$block], new RenderContext(isPreview: true)));
        $this->assertStringContainsString(
            '<figure data-item="0" class="bn-media-empty" data-empty-media="block"><span>This block is not available (gone).</span></figure>',
            $this->render([$block], new RenderContext(forBuilder: true)),
        );
    }

    public function test_it_draws_a_slideshow_from_safe_addresses_only(): void
    {
        app()->setLocale('en');
        $html = $this->render([Blocks::gallery(['https://cdn.example/1.jpg', 'javascript:x', '/2.jpg'])]);

        $this->assertCount(2, $this->select($html, '[data-gallery-track] img'));
        $this->assertSame(['https://cdn.example/1.jpg', '/2.jpg'], array_map(fn ($img) => $img->getAttribute('src'), $this->select($html, 'img')));
        $this->assertCount(2, $this->select($html, '[data-gallery-dot]'));
        $this->assertSame('Photo gallery', $this->first($html, '[data-gallery]')->getAttribute('aria-label'));
        $this->assertSame('Photo 2 of 2', $this->select($html, '[role=group]')[1]->getAttribute('aria-label'));
    }

    public function test_a_slideshow_with_one_photo_has_no_controls_and_an_empty_one_is_only_for_the_builder(): void
    {
        app()->setLocale('en');

        $single = $this->render([Blocks::gallery(['https://cdn.example/1.jpg'])]);

        $this->assertSame([], $this->select($single, '[data-gallery-controls]'));
        $this->assertSame('', $this->render([Blocks::gallery([])]));
        $this->assertStringContainsString('data-empty-media="photo"', $this->render([Blocks::gallery([])], new RenderContext(forBuilder: true)));
    }

    public function test_helpers_read_colours_and_video_links(): void
    {
        $this->assertSame('#aabbcc', BlockNoteRenderer::hexColor(' AABBCC '));
        $this->assertSame('#fff000', BlockNoteRenderer::hexColor('nope', '#fff000'));
        $this->assertTrue(BlockNoteRenderer::isDarkColor('#111111'));
        $this->assertFalse(BlockNoteRenderer::isDarkColor('#f0f0f0'));
        $this->assertSame('https://player.vimeo.com/video/123456', BlockNoteRenderer::videoEmbedUrl('https://vimeo.com/123456'));
        $this->assertSame('https://www.loom.com/embed/abc123', BlockNoteRenderer::videoEmbedUrl('https://www.loom.com/share/abc123'));
        $this->assertNull(BlockNoteRenderer::videoEmbedUrl('https://cdn.example/clip.mp4'));
        $this->assertTrue(BlockNoteRenderer::isItemPath('3.0.1'));
        $this->assertFalse(BlockNoteRenderer::isItemPath('"><script>'));
    }
}
