<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class DynamicValuesRenderTest extends TestCase
{
    use BlockHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        app(DynamicValues::class)
            ->register('site.phone', 'Telefon', fn (): string => '012 <b>345</b>')
            ->register('site.email', 'E-mel', fn (): ?string => null)
            ->register('site.whatsapp', 'WhatsApp', fn (): string => 'https://wa.me/60123456789', 'link')
            ->register('site.bad_link', 'Pautan buruk', fn (): string => 'javascript:alert(1)', 'link')
            ->register('site.logo', 'Logo', fn (): string => '/storage/logo.png', 'image');
    }

    /**
     * @param  list<array<string, mixed>>  $content
     * @return array<string, mixed>
     */
    private function paragraph(array $content): array
    {
        return ['type' => 'paragraph', 'props' => [], 'content' => $content, 'children' => []];
    }

    /**
     * @return array<string, mixed>
     */
    private function dynamic(string $key): array
    {
        return ['type' => 'dynamic', 'props' => ['key' => $key]];
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     */
    private function render(array $blocks, ?RenderContext $context = null): string
    {
        return app(BlockNoteRenderer::class)->render($blocks, $context);
    }

    public function test_dynamic_text_is_drawn_as_its_escaped_value(): void
    {
        $html = $this->render([$this->paragraph([$this->text('Telefon: '), $this->dynamic('site.phone')])]);

        $this->assertSame('<p>Telefon: 012 &lt;b&gt;345&lt;/b&gt;</p>', $html);
    }

    public function test_in_the_builder_dynamic_text_is_marked_and_an_empty_one_shows_its_label(): void
    {
        $html = $this->render([$this->paragraph([$this->dynamic('site.phone'), $this->dynamic('site.email'), $this->dynamic('site.unknown')])], new RenderContext(forBuilder: true));

        $this->assertSame(['site.phone', 'site.email', 'site.unknown'], array_map(fn ($e) => $e->getAttribute('data-dynamic'), $this->select($html, 'span.bn-dynamic')));
        $this->assertSame(['012 <b>345</b>', 'E-mel', 'site.unknown'], $this->texts($html, 'span.bn-dynamic'));
        $this->assertStringNotContainsString('<b>', $html);
    }

    public function test_an_empty_dynamic_value_draws_nothing_for_visitors(): void
    {
        $this->assertSame('<p>E-mel: </p>', $this->render([$this->paragraph([$this->text('E-mel: '), $this->dynamic('site.email')])]));
    }

    public function test_the_context_values_win_over_the_registry(): void
    {
        $html = $this->render([$this->paragraph([$this->dynamic('site.phone'), $this->dynamic('entry.title')])], (new RenderContext)->withValues(['site.phone' => '999', 'entry.title' => 'Kopi']));

        $this->assertSame('<p>999Kopi</p>', $html);
    }

    public function test_a_dynamic_link_is_resolved_then_checked(): void
    {
        $html = $this->render([
            $this->paragraph([
                ['type' => 'link', 'href' => '@site.whatsapp', 'content' => [$this->text('Mesej')]],
                ['type' => 'link', 'href' => '@site.bad_link', 'content' => [$this->text('Buruk')]],
                ['type' => 'link', 'href' => '@site.email', 'content' => [$this->text('Tiada')]],
            ]),
            Blocks::button('Hubungi', '@site.whatsapp'),
            Blocks::button('Buruk', '@site.bad_link'),
        ]);

        $this->assertSame(['https://wa.me/60123456789', 'https://wa.me/60123456789'], array_map(fn ($e) => $e->getAttribute('href'), $this->select($html, 'a')));
        $this->assertStringContainsString('Buruk', $html);
        $this->assertStringContainsString('<span class="bn-button bn-button-solid">Buruk</span>', $html);
        $this->assertStringNotContainsString('javascript:', $html);
    }

    public function test_a_dynamic_picture_is_resolved_then_checked(): void
    {
        $html = $this->render([Blocks::image('@site.logo'), Blocks::image('@site.bad_link'), Blocks::image('@site.nothing')]);

        $this->assertSame(['/storage/logo.png'], array_map(fn ($e) => $e->getAttribute('src'), $this->select($html, 'img')));
        $this->assertStringNotContainsString('javascript:', $html);
    }

    public function test_an_own_block_gets_its_dynamic_links_and_pictures_resolved(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(OwnBlock::make('board')->fields([Field::text('heading'), Field::link('link'), Field::list('items')->fields([Field::text('name')])])->view('fixtures::blocks.board'));

        $html = $this->render([Blocks::ownBlock('board', ['heading' => 'Papan', 'link' => '@site.whatsapp'])]);
        $bad = $this->render([Blocks::ownBlock('board', ['heading' => 'Papan', 'link' => '@site.bad_link'])]);

        $this->assertSame('https://wa.me/60123456789', $this->first($html, '.board a')->getAttribute('href'));
        $this->assertSame([], $this->select($bad, '.board a'));
    }

    public function test_a_dynamic_hero_photo_still_sits_beside_the_words(): void
    {
        $html = app(PageRenderer::class)->render([['id' => 'h', 'type' => 'rich', 'data' => ['layout' => 'hero', 'document' => [Blocks::heading(1, 'Hai'), Blocks::image('@site.logo')]]]], new RenderContext);

        $this->assertCount(1, $this->select($html, '.sf-hero-split .sf-hero-media img'));
    }
}
