<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Rendering\SectionLayoutRenderer;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class SectionLayoutRendererTest extends TestCase
{
    use BlockHelpers;

    /**
     * @param  list<array<string, mixed>>  $document
     */
    private function render(array $document, SectionLayout $layout, ?RenderContext $context = null): string
    {
        return app(SectionLayoutRenderer::class)->render($document, $layout, $context);
    }

    public function test_plain_is_one_column_of_words(): void
    {
        $html = $this->render([Blocks::heading(2, 'Tajuk'), Blocks::paragraph('Ayat')], SectionLayout::Plain);

        $this->assertStringStartsWith('<div class="sf-rich">', $html);
        $this->assertSame(['Tajuk'], $this->texts($html, '.sf-rich h2'));
    }

    public function test_a_hero_puts_the_first_photo_beside_the_words_and_keeps_one_without_a_photo_in_one_column(): void
    {
        $photo = 'https://cdn.example/madu.jpg';
        $split = $this->render([Blocks::heading(1, 'Madu asli'), Blocks::image($photo), Blocks::button('Hubungi', '#hubungi')], SectionLayout::Hero);
        $single = $this->render([Blocks::heading(1, 'Tanpa gambar'), Blocks::button('Hubungi', '#hubungi')], SectionLayout::Hero);

        $this->assertSame(['sf-hero sf-hero-split'], $this->classes($split, '.sf-hero'));
        $this->assertSame(['Madu asli'], $this->texts($split, '.sf-hero-copy h1'));
        $this->assertSame([], $this->select($split, '.sf-hero-copy img'));
        $this->assertSame($photo, $this->first($split, '.sf-hero-media img')->getAttribute('src'));
        $this->assertSame(['Hubungi'], $this->texts($split, '.sf-hero-copy .bn-button'));
        $this->assertSame(['sf-hero'], $this->classes($single, '.sf-hero'));
        $this->assertSame([], $this->select($single, '.sf-hero-media'));
    }

    public function test_ticks_turn_list_items_into_tiles_with_a_cross_for_a_cross_mark_and_a_tick_for_the_rest(): void
    {
        $html = $this->render([
            Blocks::heading(2, 'Pernah rasa begini?'),
            Blocks::bullet('❌ Kulit kusam'),
            Blocks::bullet('✅ Kulit cerah'),
            Blocks::bullet('Penghantaran pantas'),
        ], SectionLayout::Ticks);

        $this->assertSame(['Pernah rasa begini?'], $this->texts($html, '.sf-intro h2'));
        $this->assertSame(
            ['sf-item sf-tile sf-tile-cross', 'sf-item sf-tile sf-tile-tick', 'sf-item sf-tile sf-tile-tick'],
            $this->classes($html, '.sf-grid-ticks > .sf-tile'),
        );
        $this->assertSame(['Kulit kusam', 'Kulit cerah', 'Penghantaran pantas'], $this->texts($html, '.sf-tile p'));
    }

    public function test_cards_start_at_each_level_three_heading_and_leave_a_closing_button_under_the_cards(): void
    {
        $html = $this->render([
            Blocks::heading(2, 'Kenapa kami'),
            Blocks::heading(3, 'Asli'),
            Blocks::paragraph('Terus dari ladang.'),
            Blocks::heading(3, 'Pantas'),
            Blocks::paragraph('Sampai dalam 2 hari.'),
            Blocks::button('Hubungi', '#hubungi'),
        ], SectionLayout::Cards);

        $this->assertCount(2, $this->select($html, '.sf-grid-cards > .sf-card'));
        $this->assertSame(['Pantas'], $this->texts($html, '.sf-card:nth-child(2) h3'));
        $this->assertSame(['Sampai dalam 2 hari.'], $this->texts($html, '.sf-card:nth-child(2) p'));
        $this->assertSame([], $this->select($html, '.sf-card .bn-button'));
        $this->assertSame(['Hubungi'], $this->texts($html, '.sf-rich:last-child .bn-button'));
    }

    public function test_reviews_turn_a_quote_and_the_stars_line_under_it_into_a_card(): void
    {
        $html = $this->render([
            Blocks::heading(2, 'Kata pelanggan'),
            Blocks::quote('Madu paling sedap.'),
            Blocks::paragraph('★★★★ — aisyah'),
            Blocks::quote('Anak suka.'),
        ], SectionLayout::Reviews);

        $this->assertCount(2, $this->select($html, '.sf-grid-reviews > .sf-review'));
        $this->assertSame(['Madu paling sedap.'], $this->texts($html, '.sf-review:nth-child(1) .sf-review-quote p'));
        $this->assertSame(['★★★★'], $this->texts($html, '.sf-review:nth-child(1) .sf-review-stars'));
        $this->assertSame(['Aaisyah'], $this->texts($html, '.sf-review:nth-child(1) .sf-review-by'));
        $this->assertSame([], $this->select($html, '.sf-review:nth-child(2) .sf-review-stars'));
        $this->assertSame([], $this->select($html, '.sf-review:nth-child(2) .sf-review-by'));
    }

    public function test_the_stars_have_a_label_in_the_page_language(): void
    {
        app()->setLocale('en');
        $html = $this->render([Blocks::quote('Bagus.'), Blocks::paragraph('★★★ — Ali')], SectionLayout::Reviews);

        $this->assertSame('3 out of 5 stars', $this->first($html, '.sf-review-stars')->getAttribute('aria-label'));
    }

    public function test_faq_turns_each_toggle_into_a_question(): void
    {
        $html = $this->render([
            Blocks::heading(2, 'Soalan'),
            Blocks::toggle('Boleh COD?', [Blocks::paragraph('Boleh.')]),
            Blocks::toggle('Ada waranti?', [Blocks::paragraph('Ada.')]),
        ], SectionLayout::Faq);

        $this->assertCount(2, $this->select($html, '.sf-grid-faq > .sf-question'));
        $this->assertSame(['Boleh COD?', 'Ada waranti?'], $this->texts($html, '.sf-question summary'));
    }

    public function test_a_feature_layout_puts_the_photo_on_one_side_and_the_details_on_the_other(): void
    {
        $photo = 'https://cdn.example/kek.jpg';
        $html = $this->render([Blocks::heading(1, 'Kek Batik'), Blocks::image($photo), Blocks::bullet('✅ Lembut'), Blocks::button('Hubungi', '#hubungi')], SectionLayout::Product);

        $this->assertSame(['sf-product sf-product-split'], $this->classes($html, '.sf-product'));
        $this->assertSame($photo, $this->first($html, '.sf-product > :first-child img')->getAttribute('src'));
        $this->assertSame(['Kek Batik'], $this->texts($html, '.sf-product-buy h1'));
        $this->assertCount(1, $this->select($html, '.sf-product-buy .bn-button'));
    }

    public function test_a_poster_puts_its_words_over_the_first_photo_and_a_magazine_puts_its_heading_beside_the_story(): void
    {
        $poster = $this->render([Blocks::heading(1, 'Glow'), Blocks::image('https://cdn.example/serum.jpg')], SectionLayout::Poster);
        $story = $this->render([Blocks::paragraph('Kisah kami'), Blocks::heading(2, 'Kenapa bidara'), Blocks::paragraph('Daun bidara.')], SectionLayout::Editorial);

        $this->assertSame('https://cdn.example/serum.jpg', $this->first($poster, '.sf-poster-media img')->getAttribute('src'));
        $this->assertSame(['Glow'], $this->texts($poster, '.sf-poster-copy h1'));
        $this->assertSame(['Kisah kamiKenapa bidara'], $this->texts($story, '.sf-editorial-head'));
        $this->assertSame(['Daun bidara.'], $this->texts($story, '.sf-editorial-body'));
    }

    /**
     * @return array<string, array{0: SectionLayout, 1: string}>
     */
    public static function headingGrids(): array
    {
        return [
            'bento' => [SectionLayout::Bento, 'sf-bento'],
            'steps' => [SectionLayout::Steps, 'sf-step'],
            'big numbers' => [SectionLayout::Stats, 'sf-stat'],
        ];
    }

    #[DataProvider('headingGrids')]
    public function test_bento_steps_and_big_numbers_start_an_item_at_each_level_three_heading(SectionLayout $layout, string $itemClass): void
    {
        $html = $this->render([
            Blocks::heading(2, 'Kenapa kami'),
            Blocks::heading(3, '4 jam'),
            Blocks::paragraph('Dibakar perlahan'),
            Blocks::heading(3, '3 perisa'),
            Blocks::paragraph('Pilih sendiri'),
        ], $layout);

        $this->assertSame(['Kenapa kami'], $this->texts($html, '.sf-intro h2'));
        $this->assertCount(2, $this->select($html, ".sf-grid-{$layout->value} > .{$itemClass}"));
        $this->assertSame(['3 perisa'], $this->texts($html, ".{$itemClass}:nth-child(2) h3"));
    }

    public function test_a_bento_tile_with_a_photo_shows_the_photo_behind_its_words(): void
    {
        $html = $this->render([Blocks::heading(3, 'Foto'), Blocks::image('https://cdn.example/a.jpg')], SectionLayout::Bento);

        $this->assertSame(['sf-item sf-bento sf-bento-photo'], $this->classes($html, '.sf-bento'));
        $this->assertSame('https://cdn.example/a.jpg', $this->first($html, '.sf-bento-media img')->getAttribute('src'));
    }

    public function test_compare_splits_by_heading_or_puts_crosses_against_ticks_when_there_are_no_headings(): void
    {
        $titled = $this->render([
            Blocks::heading(3, 'Tanpa kami'),
            Blocks::bullet('❌ Lambat'),
            Blocks::bullet('❌ Mahal'),
            Blocks::heading(3, 'Dengan kami'),
            Blocks::bullet('✅ Pantas'),
        ], SectionLayout::Compare);
        $split = $this->render([Blocks::heading(2, 'Beza'), Blocks::bullet('✅ Pantas'), Blocks::bullet('❌ Lambat')], SectionLayout::Compare);

        $this->assertSame(
            ['sf-item sf-compare sf-compare-before', 'sf-item sf-compare sf-compare-after'],
            $this->classes($titled, '.sf-grid-compare > .sf-compare'),
        );
        $this->assertSame(['Tanpa kami'], $this->texts($titled, '.sf-compare-before h3'));
        $this->assertCount(2, $this->select($titled, '.sf-compare-before .sf-tile-cross'));
        $this->assertSame(['Lambat', 'Pantas'], $this->texts($split, '.sf-grid-compare > .sf-compare'));
        $this->assertSame(['Beza'], $this->texts($split, '.sf-intro h2'));
    }

    public function test_a_ticker_runs_the_list_items_written_twice_with_the_copy_hidden_from_screen_readers(): void
    {
        $html = $this->render([Blocks::bullet('✅ Halal'), Blocks::bullet('Pos percuma')], SectionLayout::Marquee);

        $lists = $this->select($html, '.sf-marquee-list');

        $this->assertCount(2, $lists);
        $this->assertSame(['Halal', 'Pos percuma'], $this->texts($html, '.sf-marquee-list:first-child li'));
        $this->assertFalse($lists[0]->hasAttribute('aria-hidden'));
        $this->assertSame('true', $lists[1]->getAttribute('aria-hidden'));
    }

    public function test_highlight_and_banner_wrap_everything(): void
    {
        $this->assertStringStartsWith('<div class="sf-highlight sf-rich">', $this->render([Blocks::paragraph('A')], SectionLayout::Highlight));
        $this->assertStringStartsWith('<div class="sf-rich">', $this->render([Blocks::paragraph('A')], SectionLayout::Banner));
    }

    public function test_a_grid_layout_with_no_items_draws_the_document_as_plain_text(): void
    {
        $html = $this->render([Blocks::paragraph('Hanya ayat')], SectionLayout::Cards);

        $this->assertSame(['Hanya ayat'], $this->texts($html, '.sf-rich p'));
        $this->assertSame([], $this->select($html, '.sf-grid'));
    }

    public function test_it_shows_where_a_photo_goes_in_the_builder_and_nothing_to_visitors(): void
    {
        app()->setLocale('en');
        $document = [Blocks::image(''), Blocks::heading(1, 'Kek Batik'), Blocks::button('Hubungi', '#hubungi')];

        $builder = $this->render($document, SectionLayout::Product, new RenderContext(forBuilder: true));
        $visitor = $this->render($document, SectionLayout::Product);

        $this->assertStringContainsString('sf-product-split', $builder);
        $this->assertStringContainsString('data-empty-media="photo"', $builder);
        $this->assertStringContainsString('Tap to add your photo', $builder);
        $this->assertStringNotContainsString('sf-product-split', $visitor);
        $this->assertStringNotContainsString('data-empty-media', $visitor);
    }

    /**
     * @return array<string, array{0: SectionLayout, 1: string}>
     */
    public static function photoLayouts(): array
    {
        return [
            'hero' => [SectionLayout::Hero, 'sf-hero-split'],
            'poster' => [SectionLayout::Poster, 'sf-poster-photo'],
        ];
    }

    #[DataProvider('photoLayouts')]
    public function test_a_layout_stays_whole_when_its_photo_is_empty_for_visitors(SectionLayout $layout, string $split): void
    {
        $document = [Blocks::image(''), Blocks::heading(1, 'Tajuk'), Blocks::paragraph('Ayat')];

        $this->assertStringNotContainsString($split, $this->render($document, $layout));
        $this->assertStringContainsString($split, $this->render($document, $layout, new RenderContext(forBuilder: true)));
    }

    public function test_it_does_not_keep_a_photo_column_for_an_address_visitors_would_not_see(): void
    {
        $document = [Blocks::image('javascript:alert(1)'), Blocks::heading(1, 'Tajuk')];

        $this->assertStringNotContainsString('sf-hero-split', $this->render($document, SectionLayout::Hero));
    }

    public function test_a_slideshow_counts_as_the_photo_of_a_hero(): void
    {
        $html = $this->render([Blocks::heading(1, 'Galeri'), Blocks::gallery(['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'])], SectionLayout::Hero);

        $this->assertStringContainsString('sf-hero-split', $html);
        $this->assertCount(1, $this->select($html, '.sf-hero-media [data-gallery]'));
    }

    public function test_in_the_builder_every_item_of_a_layout_knows_its_place_in_the_document(): void
    {
        $html = $this->render([
            Blocks::heading(2, 'Kenapa kami'),
            Blocks::heading(3, 'Asli'),
            Blocks::paragraph('Terus dari ladang.'),
            Blocks::bullet('x'),
        ], SectionLayout::Cards, new RenderContext(forBuilder: true));

        $this->assertSame(['0'], array_map(fn ($e) => $e->getAttribute('data-item'), $this->select($html, '.sf-intro h2')));
        $this->assertSame(['1', '2'], array_map(fn ($e) => $e->getAttribute('data-item'), $this->select($html, '.sf-card > [data-item]')));
    }

    public function test_a_ticks_tile_knows_its_place_in_the_builder(): void
    {
        $html = $this->render([Blocks::bullet('A'), Blocks::bullet('B')], SectionLayout::Ticks, new RenderContext(forBuilder: true));

        $this->assertSame(['0', '1'], array_map(fn ($e) => $e->getAttribute('data-item'), $this->select($html, '.sf-tile')));
    }
}
