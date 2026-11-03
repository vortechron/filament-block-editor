<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Content\NullSectionResolver;
use Vortechron\FilamentBlockEditor\Content\SectionResolver;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class SyncedSectionsTest extends TestCase
{
    use BlockHelpers;

    /**
     * @param  array<int|string, mixed>  $sections  by ref
     */
    private function resolveWith(array $sections): object
    {
        $resolver = new class($sections) implements SectionResolver
        {
            public int $calls = 0;

            /** @param array<int|string, mixed> $sections */
            public function __construct(private array $sections) {}

            public function resolve(int|string $ref): ?array
            {
                $this->calls++;

                return $this->sections[$ref] ?? null;
            }
        };

        $this->app->instance(SectionResolver::class, $resolver);

        return $resolver;
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     */
    private function render(array $sections, ?RenderContext $context = null): string
    {
        return app(PageRenderer::class)->render(['version' => 2, 'sections' => $sections], $context ?? new RenderContext);
    }

    public function test_the_default_resolver_resolves_nothing(): void
    {
        $this->assertInstanceOf(NullSectionResolver::class, app(SectionResolver::class));
        $this->assertNull(app(SectionResolver::class)->resolve(12));
    }

    public function test_a_synced_section_is_drawn_with_the_id_of_the_ref_section(): void
    {
        $this->resolveWith([12 => ['id' => 'stored1', 'type' => 'rich', 'data' => [
            'document' => [Blocks::heading(2, 'Hubungi kami')],
            'style' => ['desktop' => ['padding_top' => '8px']],
        ]]]);

        $visitor = $this->render([['id' => 'k9x8', 'type' => 'ref', 'ref' => 12]]);
        $preview = $this->render([['id' => 'k9x8', 'type' => 'ref', 'ref' => 12]], new RenderContext(forBuilder: true, isPreview: true));

        $this->assertSame(['Hubungi kami'], $this->texts($visitor, '[data-block-id="k9x8"] section h2'));
        $this->assertFalse($this->first($visitor, '[data-block-id="k9x8"]')->hasAttribute('data-ref'));
        $this->assertStringContainsString('.sf-page .fbe-s-k9x8{padding-top:8px}', $visitor);
        $this->assertSame('12', $this->first($preview, '[data-block-id="k9x8"]')->getAttribute('data-ref'));
        $this->assertStringNotContainsString('stored1', $preview);
    }

    public function test_a_missing_synced_section_draws_nothing_for_visitors_and_a_placeholder_in_the_builder(): void
    {
        app()->setLocale('ms');
        $sections = [['id' => 'gone1', 'type' => 'ref', 'ref' => 'header-main']];

        $this->assertSame('', $this->render($sections));
        $this->assertSame('', $this->render($sections, new RenderContext(isPreview: true)));

        $builder = $this->render($sections, new RenderContext(forBuilder: true, isPreview: true));

        $this->assertSame('header-main', $this->first($builder, '[data-block-id="gone1"]')->getAttribute('data-ref'));
        $this->assertSame(['Seksyen segerak tiada'], $this->texts($builder, '[data-block-id="gone1"] .bn-media-empty[data-empty-media="section"]'));
    }

    public function test_a_resolved_value_that_is_not_a_rich_section_counts_as_missing(): void
    {
        $this->resolveWith([1 => ['id' => 'x', 'type' => 'ref', 'ref' => 2], 2 => [], 3 => ['type' => 'script']]);

        $this->assertSame('', $this->render([['id' => 'a', 'type' => 'ref', 'ref' => 1], ['id' => 'b', 'type' => 'ref', 'ref' => 2], ['id' => 'c', 'type' => 'ref', 'ref' => 3]]));
    }

    public function test_a_hidden_synced_section_is_only_drawn_in_the_builder(): void
    {
        $this->resolveWith([5 => ['type' => 'rich', 'data' => ['document' => [Blocks::paragraph('Sembunyi')]]]]);
        $sections = [['id' => 'h1', 'type' => 'ref', 'ref' => 5, 'hidden' => true]];

        $this->assertSame('', $this->render($sections));
        $this->assertTrue($this->first($this->render($sections, new RenderContext(forBuilder: true)), '[data-block-id="h1"]')->hasAttribute('data-hidden'));
    }

    public function test_a_ref_inside_a_synced_section_is_not_followed(): void
    {
        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(OwnBlock::make('nested-page')->view('fixtures::blocks.nested-page'));
        $resolver = $this->resolveWith([1 => ['type' => 'rich', 'data' => ['document' => [Blocks::paragraph('Luar'), Blocks::ownBlock('nested-page')]]]]);

        $html = $this->render([['id' => 'outer', 'type' => 'ref', 'ref' => 1]]);

        $this->assertSame(1, $resolver->calls);
        $this->assertSame(['Luar'], $this->texts($html, 'p'));
        $this->assertSame([], $this->select($html, '[data-block-id="inner"]'));
    }
}
