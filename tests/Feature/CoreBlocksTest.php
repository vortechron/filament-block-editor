<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Support\Icons;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class CoreBlocksTest extends TestCase
{
    use BlockHelpers;

    private const KINDS = ['fbe-faq', 'fbe-map', 'fbe-icon-list', 'fbe-pricing', 'fbe-testimonials'];

    /**
     * @param  array<string, mixed>  $values
     */
    private function draw(string $kind, array $values = []): string
    {
        return app(PageRenderer::class)->render([['id' => 's1', 'type' => 'rich', 'data' => ['document' => [Blocks::ownBlock($kind, $values)]]]], new RenderContext);
    }

    public function test_the_five_core_blocks_are_registered_by_default(): void
    {
        $definitions = array_column(app(BlockRegistry::class)->definitions(), null, 'kind');

        foreach (self::KINDS as $kind) {
            $this->assertArrayHasKey($kind, $definitions);
        }

        $this->assertSame(20, collect($definitions['fbe-faq']['fields'])->firstWhere('name', 'items')['maxItems']);
        $this->assertSame(Icons::names(), array_column(collect(collect($definitions['fbe-icon-list']['fields'])->firstWhere('name', 'items')['fields'])->firstWhere('name', 'icon')['options'], 'value'));
    }

    public function test_the_core_blocks_can_be_turned_off(): void
    {
        config()->set('filament-block-editor.core_blocks', false);
        $this->app->forgetInstance(BlockRegistry::class);

        $this->assertSame([], array_intersect(self::KINDS, array_column(app(BlockRegistry::class)->definitions(), 'kind')));
    }

    public function test_every_core_block_draws_with_its_defaults(): void
    {
        foreach (array_diff(self::KINDS, ['fbe-map']) as $kind) {
            $html = $this->draw($kind);

            $this->assertCount(1, $this->select($html, '.bn-own-block[data-own-block="'.$kind.'"] > *'), $kind);
        }
    }

    public function test_a_map_with_no_address_or_link_is_only_a_placeholder_in_the_builder(): void
    {
        app()->setLocale('ms');
        $builder = app(PageRenderer::class)->render([['id' => 's1', 'type' => 'rich', 'data' => ['document' => [Blocks::ownBlock('fbe-map')]]]], new RenderContext(forBuilder: true));

        $this->assertSame([], $this->select($this->draw('fbe-map'), '.bn-own-block'));
        $this->assertSame(['Tambah alamat atau pautan peta'], $this->texts($builder, '.bn-own-block .bn-media-empty[data-empty-media="map"]'));
    }

    public function test_the_faq_draws_each_question_and_opens_the_first(): void
    {
        $html = $this->draw('fbe-faq', ['heading' => 'Soalan', 'open_first' => true, 'items' => [
            ['question' => 'Buka hari Ahad?', 'answer' => "Ya.\nPukul 10 pagi."],
            ['question' => '<script>alert(1)</script>', 'answer' => 'Tidak'],
        ]]);

        $this->assertSame(['Buka hari Ahad?', '<script>alert(1)</script>'], array_map(trim(...), $this->texts($html, '.fbe-faq summary')));
        $this->assertTrue($this->select($html, '.fbe-faq details')[0]->hasAttribute('open'));
        $this->assertFalse($this->select($html, '.fbe-faq details')[1]->hasAttribute('open'));
        $this->assertStringContainsString('Ya.<br>', $html);
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_the_map_draws_only_a_google_maps_embed(): void
    {
        $google = $this->draw('fbe-map', ['address' => 'Jalan Merdeka, Batu Pahat', 'embed_url' => 'https://www.google.com/maps/embed?pb=abc', 'height' => 'lg']);
        $other = $this->draw('fbe-map', ['address' => 'Jalan Merdeka', 'embed_url' => 'https://evil.example/maps']);

        $this->assertSame('https://www.google.com/maps/embed?pb=abc', $this->first($google, 'iframe')->getAttribute('src'));
        $this->assertStringContainsString('fbe-map-lg', $this->first($google, '.fbe-map')->getAttribute('class'));
        $this->assertSame([], $this->select($other, 'iframe'));
        $this->assertSame('https://www.google.com/maps/search/?api=1&query=Jalan%20Merdeka', $this->first($other, 'a')->getAttribute('href'));
    }

    public function test_the_icon_list_draws_lucide_icons_in_columns(): void
    {
        $html = $this->draw('fbe-icon-list', ['columns' => '2', 'style' => 'boxed', 'items' => [
            ['icon' => 'truck', 'title' => 'Penghantaran', 'text' => 'Seluruh Johor'],
            ['icon' => 'not-an-icon', 'title' => 'Lain', 'text' => ''],
        ]]);

        $this->assertStringContainsString('fbe-icons-2', $this->first($html, '.fbe-icons')->getAttribute('class'));
        $this->assertStringContainsString('fbe-icons-boxed', $this->first($html, '.fbe-icons')->getAttribute('class'));
        $this->assertSame(['Penghantaran', 'Lain'], array_map(trim(...), $this->texts($html, '.fbe-icons h3')));
        $this->assertCount(2, $this->select($html, '.fbe-icons svg[aria-hidden="true"]'));
    }

    public function test_pricing_draws_each_plan_with_its_features_and_a_safe_button(): void
    {
        $html = $this->draw('fbe-pricing', ['note' => 'Harga tidak termasuk SST.', 'plans' => [
            ['name' => 'Asas', 'price' => 'RM49', 'period' => '/bulan', 'features' => "Satu\n\nDua", 'button_text' => 'Pilih', 'button_link' => '/hubungi', 'highlight' => false],
            ['name' => 'Pro', 'price' => 'RM99', 'period' => '', 'features' => 'Semua', 'button_text' => 'Pilih', 'button_link' => 'javascript:alert(1)', 'highlight' => true],
        ]]);

        [$basic, $pro] = $this->select($html, '.fbe-plan');

        $this->assertSame(['Satu', 'Dua'], array_map(trim(...), $this->texts($html, '.fbe-plan:first-child li')));
        $this->assertStringContainsString('fbe-plan-highlight', $pro->getAttribute('class'));
        $this->assertStringNotContainsString('fbe-plan-highlight', $basic->getAttribute('class'));
        $this->assertSame(['/hubungi'], array_map(fn ($a) => $a->getAttribute('href'), $this->select($html, '.fbe-plan a.bn-button')));
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertSame('Harga tidak termasuk SST.', trim($this->first($html, '.fbe-pricing-note')->textContent));
    }

    public function test_testimonials_draw_stars_names_and_photos(): void
    {
        $html = $this->draw('fbe-testimonials', ['items' => [
            ['quote' => 'Servis laju.', 'name' => 'Aisyah', 'role' => 'Pelanggan', 'photo' => '/storage/a.jpg', 'rating' => '4'],
            ['quote' => 'Bagus.', 'name' => 'Ali', 'role' => '', 'photo' => 'javascript:x', 'rating' => '0'],
        ]]);

        $this->assertSame(['Servis laju.', 'Bagus.'], array_map(trim(...), $this->texts($html, '.fbe-testimonials blockquote')));
        $this->assertSame('4 daripada 5 bintang', $this->first($html, '.fbe-stars')->getAttribute('aria-label'));
        $this->assertCount(1, $this->select($html, '.fbe-stars'));
        $this->assertSame(['/storage/a.jpg'], array_map(fn ($i) => $i->getAttribute('src'), $this->select($html, '.fbe-testimonials img')));
    }

    public function test_icons_are_inline_svg_by_lucide_name(): void
    {
        $this->assertCount(30, Icons::names());
        $this->assertStringStartsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"', Icons::svg('check'));
        $this->assertStringContainsString('aria-hidden="true"', Icons::svg('check'));
        $this->assertStringContainsString('class="fbe-icon big"', Icons::svg('check', 'big'));
        $this->assertSame('', Icons::svg('not-an-icon'));
        $this->assertStringNotContainsString('script', Icons::svg('check', '"><script>'));
    }
}
