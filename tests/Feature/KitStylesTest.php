<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Illuminate\Support\Facades\Blade;
use Vortechron\FilamentBlockEditor\Design\DefaultKitSource;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Design\KitSource;
use Vortechron\FilamentBlockEditor\Design\OverridesKit;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class KitStylesTest extends TestCase
{
    use BlockHelpers;

    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);
        $app['config']->set('filament-block-editor.fonts', [
            'inter' => ['label' => 'Inter', 'stack' => "'Inter', sans-serif", 'href' => 'https://fonts.bunny.net/css?family=inter'],
        ]);
    }

    public function test_the_default_kit_source_gives_the_kit_defaults(): void
    {
        $this->assertInstanceOf(DefaultKitSource::class, app(KitSource::class));
        $this->assertSame(Kit::defaults(), app(KitSource::class)->current());
    }

    public function test_an_override_is_used_until_it_is_cleared(): void
    {
        $source = app(KitSource::class);

        $source->override(['colors' => ['primary' => '#14532d', 'text' => 'nonsense']]);
        $this->assertSame('#14532d', $source->current()['colors']['primary']);
        $this->assertSame('#475569', $source->current()['colors']['text']);

        $source->override(null);
        $this->assertSame(Kit::defaults(), $source->current());
    }

    public function test_a_host_source_reads_its_stored_kit_and_honours_the_override(): void
    {
        $source = new class implements KitSource
        {
            use OverridesKit;

            protected function storedKit(): array
            {
                return ['colors' => ['primary' => '#c59d6e']];
            }
        };

        $this->assertSame('#c59d6e', $source->current()['colors']['primary']);
        $this->assertSame('#0f172a', $source->current()['colors']['secondary']);

        $source->override(['colors' => ['primary' => '#000000']]);
        $this->assertSame('#000000', $source->current()['colors']['primary']);
    }

    public function test_the_styles_component_prints_the_stylesheet_then_the_kit(): void
    {
        $html = Blade::render('<x-filament-block-editor::styles />');

        $this->assertStringEndsWith('/vendor/filament-block-editor/page.css', $this->first($html, 'link')->getAttribute('href'));
        $this->assertSame(Kit::css(Kit::defaults()), $this->first($html, 'style[data-fbe-kit]')->textContent);
        $this->assertLessThan(strpos($html, '<style'), strpos($html, '<link'));
    }

    public function test_the_styles_component_prints_no_words_from_its_own_comment(): void
    {
        $html = Blade::render('<x-filament-block-editor::styles />');

        $this->assertStringNotContainsString('KitSource', $html);
        $this->assertStringNotContainsString('--}}', $html);
    }

    public function test_the_styles_component_follows_the_kit_source_and_its_override(): void
    {
        app(KitSource::class)->override(['colors' => ['primary' => '#14532d']]);

        $html = Blade::render('<x-filament-block-editor::styles />');

        $this->assertStringContainsString('--kit-color-primary:#14532d', $html);
        app(KitSource::class)->override(null);
    }

    public function test_a_kit_attribute_wins_and_is_cleaned(): void
    {
        $html = Blade::render('<x-filament-block-editor::styles :kit="$kit" />', ['kit' => ['colors' => ['primary' => '#123456', 'text' => '</style><script>alert(1)</script>']]]);

        $this->assertStringContainsString('--kit-color-primary:#123456', $html);
        $this->assertStringNotContainsString('<script', $html);
    }

    public function test_the_host_font_the_kit_uses_is_linked(): void
    {
        $used = Blade::render('<x-filament-block-editor::styles :kit="$kit" />', ['kit' => ['fonts' => ['heading' => 'inter']]]);
        $unused = Blade::render('<x-filament-block-editor::styles />');

        $this->assertCount(2, $this->select($used, 'link[rel="stylesheet"]'));
        $this->assertSame('https://fonts.bunny.net/css?family=inter', $this->select($used, 'link')[1]->getAttribute('href'));
        $this->assertCount(1, $this->select($unused, 'link'));
    }
}
