<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class BlockRegistryTest extends TestCase
{
    /**
     * The host's own blocks only: the core blocks are tested in CoreBlocksTest.
     */
    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);
        $app['config']->set('filament-block-editor.core_blocks', false);
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->app['view']->addNamespace('fixtures', __DIR__.'/../fixtures/views');

        app(BlockRegistry::class)->register(
            OwnBlock::make('board')
                ->label('Board')
                ->fields([
                    Field::text('heading')->default('Stationery'),
                    Field::link('link'),
                    Field::list('items')->fields([Field::text('name')])->maxItems(2),
                ])
                ->view('fixtures::blocks.board'),
        );
    }

    public function test_the_registry_is_one_instance_for_the_whole_app(): void
    {
        $this->assertSame(app(BlockRegistry::class), app(BlockRegistry::class));
    }

    public function test_it_lists_definitions_as_json_ready_arrays(): void
    {
        $definitions = app(BlockRegistry::class)->definitions();

        $this->assertSame(['board'], array_column($definitions, 'kind'));
        $this->assertSame(['heading' => 'Stationery', 'link' => null, 'items' => []], $definitions[0]['defaults']);
        $this->assertJson(json_encode($definitions, JSON_THROW_ON_ERROR));
    }

    public function test_registering_a_kind_again_replaces_it(): void
    {
        $registry = app(BlockRegistry::class);
        $registry->register(OwnBlock::make('board')->label('Second'));

        $this->assertSame('Second', $registry->get('board')->getLabel());
        $this->assertCount(1, $registry->all());
        $this->assertTrue($registry->has('board'));
        $this->assertFalse($registry->has('nope'));

        $registry->forget('board');
        $this->assertNull($registry->get('board'));
    }

    public function test_it_draws_a_block_from_its_view_with_values_block_and_context(): void
    {
        $html = app(BlockRegistry::class)->render('board', ['heading' => 'Alat tulis', 'items' => [['name' => 'Pen']]], new RenderContext, ['type' => 'ownBlock']);

        $this->assertStringStartsWith('<div class="bn-own-block" data-own-block="board">', $html);
        $this->assertStringEndsWith('</div>', $html);
        $this->assertStringContainsString('<h2>Alat tulis</h2>', $html);
        $this->assertStringContainsString('<li>Pen</li>', $html);
        $this->assertStringContainsString('data-for-builder="no"', $html);
        $this->assertStringContainsString('data-block-type="ownBlock"', $html);
    }

    public function test_it_applies_defaults_and_cleans_values_before_drawing(): void
    {
        $html = app(BlockRegistry::class)->render('board', [
            'link' => 'javascript:alert(1)',
            'items' => [['name' => '<b>x</b>'], ['name' => 'b'], ['name' => 'too many']],
            'evil' => '<script>',
        ], new RenderContext(forBuilder: true));

        $this->assertStringContainsString('<h2>Stationery</h2>', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('<li>&lt;b&gt;x&lt;/b&gt;</li>', $html);
        $this->assertStringNotContainsString('too many', $html);
        $this->assertStringContainsString('data-for-builder="yes"', $html);
    }

    public function test_an_unknown_kind_draws_nothing_for_visitors(): void
    {
        $this->assertSame('', app(BlockRegistry::class)->render('gone', ['a' => 1], new RenderContext));
        $this->assertSame('', app(BlockRegistry::class)->render('gone', [], new RenderContext(isPreview: true)));
    }

    public function test_an_unknown_kind_shows_a_placeholder_in_the_builder(): void
    {
        app()->setLocale('en');
        $html = app(BlockRegistry::class)->render('gone"><b>', [], new RenderContext(forBuilder: true));

        $this->assertStringContainsString('class="bn-media-empty"', $html);
        $this->assertStringContainsString('data-empty-media="block"', $html);
        $this->assertStringContainsString('This block is not available (gone&quot;&gt;&lt;b&gt;)', $html);
        $this->assertStringNotContainsString('<b>', $html);
    }

    public function test_a_view_that_draws_nothing_leaves_no_empty_wrapper_for_visitors(): void
    {
        app(BlockRegistry::class)->register(OwnBlock::make('blank')->view('fixtures::blocks.blank'));

        $this->assertSame('', app(BlockRegistry::class)->render('blank', [], new RenderContext));
        $this->assertSame(
            '<div class="bn-own-block" data-own-block="blank"></div>',
            app(BlockRegistry::class)->render('blank', [], new RenderContext(forBuilder: true)),
        );
    }

    public function test_a_block_without_a_view_draws_nothing(): void
    {
        app(BlockRegistry::class)->register(OwnBlock::make('bare'));

        $this->assertSame('', app(BlockRegistry::class)->render('bare', [], new RenderContext));
    }

    public function test_it_cleans_values_by_kind_and_says_so_when_the_kind_is_unknown(): void
    {
        $registry = app(BlockRegistry::class);

        $this->assertSame(['heading' => 'Stationery', 'link' => null, 'items' => []], $registry->cleanValues('board', ['x' => 1]));
        $this->assertNull($registry->cleanValues('gone', ['x' => 1]));
    }

    public function test_storing_a_document_cleans_the_values_of_a_registered_own_block(): void
    {
        $clean = BlockNoteDocument::clean([
            Blocks::ownBlock('board', ['heading' => 'Hai', 'link' => 'javascript:1', 'evil' => 'x']),
            Blocks::ownBlock('gone', ['anything' => 'kept', 'link' => 'javascript:1']),
        ]);

        $this->assertSame('{"heading":"Hai","link":null,"items":[]}', $clean[0]['props']['values']);
        $this->assertSame('{"anything":"kept","link":"javascript:1"}', $clean[1]['props']['values']);
    }
}
