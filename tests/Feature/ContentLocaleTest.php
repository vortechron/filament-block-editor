<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use RuntimeException;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Templates\SectionTemplates;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Vortechron\FilamentBlockEditor\Tests\Unit\FormDefinitionTest;

/**
 * An English panel for a Malay site: the page's own words follow
 * `content_locale`, the builder's notes and everything else the app's.
 */
class ContentLocaleTest extends TestCase
{
    use BlockHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        app()->setLocale('en');
    }

    /**
     * @param  array<string, mixed>  $form
     */
    private function page(array $form, RenderContext $context): string
    {
        $block = ['id' => 'blk1', ...Blocks::form($form)];

        return app(PageRenderer::class)->render([['id' => 'sec1', 'type' => 'rich', 'data' => ['document' => [$block]]]], $context);
    }

    public function test_with_no_site_language_both_are_the_apps(): void
    {
        config(['filament-block-editor.content_locale' => null]);

        $this->assertSame('en', ContentLocale::site());
        $this->assertSame('en', ContentLocale::panel());
        $this->assertSame('en', ContentLocale::run(fn (): string => app()->getLocale()));
    }

    public function test_a_draw_runs_in_the_site_language_and_the_app_gets_its_own_back(): void
    {
        config(['filament-block-editor.content_locale' => ' ms ']);

        $inside = ContentLocale::run(fn (): array => [app()->getLocale(), ContentLocale::panel(), ContentLocale::run(fn (): string => ContentLocale::panel())]);

        $this->assertSame(['ms', 'en', 'en'], $inside);
        $this->assertSame('en', app()->getLocale());
        $this->assertSame('en', ContentLocale::panel());
    }

    public function test_a_draw_that_fails_still_gives_the_app_its_language_back(): void
    {
        config(['filament-block-editor.content_locale' => 'ms']);

        try {
            ContentLocale::run(fn () => throw new RuntimeException('broken block'));
        } catch (RuntimeException) {
        }

        $this->assertSame('en', app()->getLocale());
        $this->assertSame('en', ContentLocale::panel());
    }

    public function test_nested_content_languages_respect_the_panel_and_restore_after_exceptions(): void
    {
        config(['filament-block-editor.content_locale' => 'ms']);

        $result = ContentLocale::with('en', function (): array {
            $this->assertSame('en', ContentLocale::site());
            $this->assertSame('en', ContentLocale::panel());
            $this->assertSame('en', ContentLocale::run(fn (): string => app()->getLocale()));

            try {
                ContentLocale::run(fn () => ContentLocale::with('ms', function (): void {
                    $this->assertSame('ms', ContentLocale::site());
                    $this->assertSame('en', ContentLocale::panel());
                    $this->assertSame('ms', ContentLocale::run(fn (): string => app()->getLocale()));
                    throw new RuntimeException('broken translation');
                }));
            } catch (RuntimeException) {
            }

            return [ContentLocale::site(), ContentLocale::panel(), app()->getLocale()];
        });

        $this->assertSame(['en', 'en', 'en'], $result);
        $this->assertSame('ms', ContentLocale::site());
        $this->assertSame('en', ContentLocale::panel());
        $this->assertSame('en', app()->getLocale());

        ContentLocale::run(function (): void {
            ContentLocale::with('en', function (): void {
                $this->assertSame('en', ContentLocale::run(fn (): string => app()->getLocale()));
                $this->assertSame('en', ContentLocale::panel());
            });
            $this->assertSame('ms', app()->getLocale());
        });
    }

    public function test_the_page_speaks_the_site_language_and_the_builder_notes_the_panels(): void
    {
        config(['filament-block-editor.content_locale' => 'ms']);
        $form = FormDefinitionTest::example();
        $form['submit']['text'] = '';

        $html = $this->page($form, new RenderContext(isPreview: true, forBuilder: true));

        $this->assertSame('Hantar', trim($this->first($html, 'button[type="submit"]')->textContent));
        $this->assertSame('This form is not connected yet', trim($this->first($html, '.fbe-form-note')->textContent));
        $this->assertSame(__('filament-block-editor::preview.empty_section', [], 'en'), $this->first($html, '[data-block-id="sec1"]')->getAttribute('data-empty-label'));
        $this->assertSame('en', app()->getLocale());
    }

    public function test_ready_made_sections_are_named_in_the_panel_language_and_written_in_the_sites(): void
    {
        $english = collect(SectionTemplates::all('en'))->keyBy('key');
        $malay = collect(SectionTemplates::all('ms'))->keyBy('key');
        $mixed = collect(SectionTemplates::all('en', 'ms'))->keyBy('key');

        $this->assertSame($english['hero']['label'], $mixed['hero']['label']);
        $this->assertSame($english['hero']['category'], $mixed['hero']['category']);
        $this->assertSame($english['hero']['description'], $mixed['hero']['description']);
        $this->assertNotSame([], $this->words($malay['hero']['section']['data']['document']));
        $this->assertSame($this->words($malay['hero']['section']['data']['document']), $this->words($mixed['hero']['section']['data']['document']));
    }

    /**
     * Every text in a document, in order.
     *
     * @param  array<mixed>  $document
     * @return list<string>
     */
    private function words(array $document): array
    {
        $words = [];

        array_walk_recursive($document, function (mixed $value, string|int $key) use (&$words): void {
            if ($key === 'text' && is_string($value) && trim($value) !== '') {
                $words[] = $value;
            }
        });

        return $words;
    }
}
