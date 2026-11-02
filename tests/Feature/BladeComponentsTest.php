<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Illuminate\Support\Facades\Blade;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BladeComponentsTest extends TestCase
{
    use BlockHelpers;

    /**
     * @return list<array<string, mixed>>
     */
    private function sections(): array
    {
        return [
            ['id' => 'a', 'type' => 'rich', 'data' => ['document' => [Blocks::heading(2, 'Satu')], 'anchor' => 'satu']],
            ['id' => 'b', 'type' => 'rich', 'data' => ['document' => [Blocks::paragraph('Dua')]], 'hidden' => true],
        ];
    }

    public function test_the_page_component_draws_the_sections_inside_the_page_wrapper(): void
    {
        $html = Blade::render('<x-filament-block-editor::page :sections="$sections" />', ['sections' => $this->sections()]);

        $this->assertSame(['sf-page'], $this->classes($html, 'div.sf-page'));
        $this->assertSame(['Satu'], $this->texts($html, '.sf-page [data-block-id="a"] h2'));
        $this->assertSame('satu', $this->first($html, 'section')->getAttribute('id'));
        $this->assertStringNotContainsString('Dua', $html);
        $this->assertStringNotContainsString('data-preview', $html);
        $this->assertStringNotContainsString('data-empty-label', $html);
    }

    public function test_the_page_component_takes_a_render_context(): void
    {
        $html = Blade::render(
            '<x-filament-block-editor::page :sections="$sections" :context="$context" />',
            ['sections' => $this->sections(), 'context' => new RenderContext(forBuilder: true, isPreview: true)],
        );

        $this->assertCount(1, $this->select($html, '.sf-page[data-preview]'));
        $this->assertCount(1, $this->select($html, '[data-block-id="a"][data-empty-label]'));
        $this->assertCount(1, $this->select($html, 'h2[data-item="0"]'));
    }

    public function test_the_page_component_merges_the_attributes_it_is_given(): void
    {
        $html = Blade::render('<x-filament-block-editor::page :sections="$sections" class="mx-auto" id="landing" />', ['sections' => $this->sections()]);

        $this->assertSame(['sf-page mx-auto'], $this->classes($html, 'div.sf-page'));
        $this->assertSame('landing', $this->first($html, 'div.sf-page')->getAttribute('id'));
    }

    public function test_the_page_component_reads_sections_given_as_json(): void
    {
        $html = Blade::render('<x-filament-block-editor::page :sections="$json" />', ['json' => json_encode($this->sections())]);

        $this->assertSame(['Satu'], $this->texts($html, 'h2'));
    }

    public function test_the_page_component_is_empty_for_a_value_that_is_not_sections(): void
    {
        $html = Blade::render('<x-filament-block-editor::page :sections="$sections" />', ['sections' => 'not json']);

        $this->assertSame([], $this->select($html, 'section'));
        $this->assertCount(1, $this->select($html, 'div.sf-page'));
    }

    public function test_the_page_component_adds_the_slideshow_script_once_and_only_when_a_slideshow_is_on_the_page(): void
    {
        $gallery = [
            ['id' => 'g1', 'type' => 'rich', 'data' => ['document' => [Blocks::gallery(['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'])]]],
            ['id' => 'g2', 'type' => 'rich', 'data' => ['document' => [Blocks::gallery(['https://cdn.example/3.jpg', 'https://cdn.example/4.jpg'])]]],
        ];

        $with = Blade::render('<x-filament-block-editor::page :sections="$sections" />', ['sections' => $gallery]);
        $without = Blade::render('<x-filament-block-editor::page :sections="$sections" />', ['sections' => $this->sections()]);
        $off = Blade::render('<x-filament-block-editor::page :sections="$sections" :script="false" />', ['sections' => $gallery]);

        $this->assertSame(1, substr_count($with, '<script'));
        $this->assertStringContainsString('data-gallery-step', $this->first($with, 'script')->textContent);
        $this->assertSame(0, substr_count($without, '<script'));
        $this->assertSame(0, substr_count($off, '<script'));
    }

    public function test_the_styles_component_links_the_published_stylesheet_without_filament_assets(): void
    {
        $html = Blade::render('<x-filament-block-editor::styles />');

        $link = $this->first($html, 'link');

        $this->assertSame('stylesheet', $link->getAttribute('rel'));
        $this->assertStringEndsWith('/vendor/filament-block-editor/page.css', $link->getAttribute('href'));
    }
}
