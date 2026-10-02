<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Filament\Actions\Testing\TestAction;
use Filament\Forms\Components\Repeater;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\PageSections;
use Vortechron\FilamentBlockEditor\Support\BlockBackgroundVideo;
use Vortechron\FilamentBlockEditor\Support\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Workbench\App\Filament\Resources\Pages\Pages\CreatePage;
use Workbench\App\Filament\Resources\Pages\Pages\EditPage;
use Workbench\App\Models\Page;

class BlockSectionsTest extends TestCase
{
    protected function tearDown(): void
    {
        // Sections are registered statically. The workbench registers its own
        // again every time the app boots, so this only drops what a test added.
        PageSections::flush();

        parent::tearDown();
    }

    private function menu(string $name, string $suffix = ''): TestAction
    {
        return TestAction::make($name.'__contentBlocks'.$suffix)->schemaComponent('contentBlocks');
    }

    private function sheet(ContentBlock $block): TestAction
    {
        return TestAction::make('editStyle')
            ->schemaComponent('contentBlocks')
            ->arguments(['item' => "record-{$block->id}"]);
    }

    public function test_the_plus_menu_adds_a_blank_block_that_saves_in_the_default_list(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($this->menu('addBlank'))
            ->call('save')
            ->assertHasNoErrors();

        $page->refresh();
        $this->assertCount(1, $page->contentBlocks);
        $block = $page->contentBlocks->first();
        $this->assertSame(ContentBlock::DEFAULT_COLLECTION, $block->collection);
        $this->assertSame(ContentBlock::KIND_CONTENT, $block->kind);
        $this->assertFalse($block->isSection());
        $this->assertSame(45, $block->background_overlay);
        $this->assertBelongsToTenant(null, $block);
    }

    public function test_the_plus_menu_on_a_new_page_saves_the_blocks_with_the_page(): void
    {
        $this->actingAsAdmin();

        Livewire::test(CreatePage::class)
            ->fillForm(['title' => 'About us', 'slug' => 'about-us'])
            ->callAction($this->menu('addBlank'))
            ->callAction($this->menu('addBlank'))
            ->call('create')
            ->assertHasNoFormErrors();

        $page = Page::firstWhere('slug', 'about-us');
        $this->assertNotNull($page);
        $this->assertSame([1, 2], $page->contentBlocks->pluck('sort_order')->all());
    }

    public function test_a_block_made_with_a_team_open_remembers_the_team(): void
    {
        $team = $this->actingAsAdminWithTeamOpen();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($this->menu('addBlank'))
            ->call('save')
            ->assertHasNoErrors();

        $this->assertBelongsToTenant($team, $page->refresh()->contentBlocks->sole());
    }

    public function test_the_top_plus_menu_puts_the_new_block_first(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $first = ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 1, 'content' => [$this->paragraph('Welcome')]]);
        $second = ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 2, 'content' => [$this->paragraph('About us')]]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($this->menu('addBlank', '_top'))
            ->call('save')
            ->assertHasNoErrors();

        $order = $page->refresh()->contentBlocks->pluck('id')->all();
        $this->assertCount(3, $order);
        $this->assertNotContains($order[0], [$first->id, $second->id]);
        $this->assertSame([$first->id, $second->id], array_slice($order, 1));
    }

    public function test_the_top_plus_menu_puts_a_saved_block_first(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $existing = ContentBlock::factory()->for($page, 'blockable')->create(['content' => [$this->paragraph('Our terms')]]);
        $saved = SavedBlock::factory()->create(['content' => [
            ['type' => 'heading', 'props' => ['level' => 2], 'content' => [['type' => 'text', 'text' => 'Payment schedule', 'styles' => []]]],
        ]]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($this->menu('addSavedBlock', '_top'), ['selection' => 'saved:'.$saved->id])
            ->call('save')
            ->assertHasNoErrors();

        $blocks = $page->refresh()->contentBlocks;
        $this->assertCount(2, $blocks);
        $this->assertSame('Payment schedule', BlockNoteDocument::title($blocks->first()->content));
        $this->assertSame($existing->id, $blocks->last()->id);
    }

    public function test_the_top_plus_menu_shows_only_when_the_list_has_blocks(): void
    {
        $this->actingAsAdmin();
        $empty = Page::factory()->create();
        $filled = Page::factory()->create();
        ContentBlock::factory()->for($filled, 'blockable')->create();

        Livewire::test(EditPage::class, ['record' => $filled->getRouteKey()])
            ->assertActionVisible($this->menu('addBlank', '_top'))
            ->assertSee('Add a block at the top');

        Livewire::test(EditPage::class, ['record' => $empty->getRouteKey()])
            ->assertActionDoesNotExist($this->menu('addBlank', '_top'))
            ->assertDontSee('Add a block at the top')
            ->callAction($this->menu('addBlank'))
            ->assertActionVisible($this->menu('addBlank', '_top'))
            ->assertSee('Add a block at the top');
    }

    public function test_blocks_are_named_by_their_first_heading_so_a_collapsed_list_stays_readable(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $named = ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 1, 'content' => [
            $this->paragraph('Thanks for your time'),
            ['type' => 'heading', 'props' => ['level' => 2], 'content' => [['type' => 'text', 'text' => 'Our approach', 'styles' => []]]],
        ]]);
        $empty = ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 2, 'content' => []]);
        $section = ContentBlock::factory()->for($page, 'blockable')->section('contact')->create(['sort_order' => 3]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertSchemaComponentExists('contentBlocks', checkComponentUsing: fn (Repeater $blocks): bool => $blocks->isCollapsible()
                && $blocks->getItemLabel("record-{$named->id}") === 'Our approach'
                && $blocks->getItemLabel("record-{$empty->id}") === 'Block'
                && $blocks->getItemLabel("record-{$section->id}") === 'Contact form');
    }

    public function test_the_style_sheet_saves_background_settings_on_an_existing_block(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                $this->sheet($block),
                [
                    'background_type' => 'video',
                    'background_video_url' => 'https://example.com/bg.mp4',
                    'background_overlay' => 65,
                    'padding_size' => 'xl',
                    'content_width' => 'full',
                    'full_height' => true,
                    'spacing_top' => 'none',
                    'spacing_bottom' => 'lg',
                ],
            )
            ->call('save')
            ->assertHasNoErrors();

        $block->refresh();
        $this->assertSame('https://example.com/bg.mp4', $block->background_video_url);
        $this->assertSame(65, $block->background_overlay);
        $this->assertSame('xl', $block->padding_size);
        $this->assertSame('none', $block->spacing_top);
        $this->assertSame('lg', $block->spacing_bottom);
        $this->assertSame('full', $block->content_width);
        $this->assertTrue($block->full_height);
    }

    public function test_block_spacing_presets_render_as_inline_styles_on_the_public_page(): void
    {
        $page = $this->pageWith([
            'padding_size' => 'xl',
            'spacing_top' => 'none',
            'spacing_bottom' => 'lg',
            'content' => [$this->paragraph('Spaced out block')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('padding: clamp(1.5rem, 7.5vw, 6rem); margin-top: 0; margin-bottom: clamp(1.5rem, 5vw, 3.5rem); --fbe-block-pad: clamp(1.5rem, 7.5vw, 6rem);', false);
    }

    public function test_per_item_spacing_renders_on_the_public_page(): void
    {
        $page = $this->pageWith([
            'content' => [
                [
                    'type' => 'paragraph',
                    'props' => ['spaceTop' => 'lg', 'spaceBottom' => 'xl'],
                    'content' => [['type' => 'text', 'text' => 'An item with its own breathing room']],
                ],
                $this->paragraph('An item left alone'),
            ],
        ]);

        $html = $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('An item with its own breathing room')
            ->assertSee('padding-top: 3.5rem; padding-bottom: 6rem;', false)
            ->assertSee('An item left alone')
            ->getContent();

        // Only the spaced item gets a wrapper; the untouched one is left as it was.
        $this->assertSame(1, substr_count($html, 'bn-item-space'));
    }

    public function test_a_full_height_block_fills_the_browser_window_on_the_public_page(): void
    {
        $page = $this->pageWith(['full_height' => true, 'content' => [$this->paragraph('A hero that fills the screen')]]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('fbe-block-full-height')
            ->assertSee('min-height: 100vh;', false);
    }

    public function test_the_content_width_setting_limits_the_column_inside_a_full_width_block(): void
    {
        $page = $this->pageWith(['content_width' => 'narrow', 'content' => [$this->paragraph('A narrow column of text')]]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('max-width: 42rem;', false);
    }

    public function test_a_full_bleed_block_does_not_limit_its_content_column(): void
    {
        $page = $this->pageWith(['content_width' => 'full', 'content' => [$this->paragraph('Edge to edge content')]]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('max-width: none;', false);
    }

    public function test_blocks_render_as_full_width_sections_inside_the_page_body(): void
    {
        $page = $this->pageWith(['content' => [$this->paragraph('A full width section')]]);

        $html = $this->get(route('pages.show', $page->slug))->assertOk()->getContent();

        $this->assertMatchesRegularExpression('~<main>\s*<section\s+class="fbe-block"~', $html);
        $this->assertStringContainsString('<div class="fbe-block-content fbe-rich-text"', $html);
    }

    public function test_blocks_and_page_sections_render_in_order(): void
    {
        $page = Page::factory()->create(['title' => 'Pool Proposal']);
        ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 1, 'content' => [$this->paragraph('Welcome to our site')]]);
        ContentBlock::factory()->for($page, 'blockable')->section('contact')->create(['sort_order' => 2]);
        ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 3, 'content' => [$this->paragraph('Our terms and conditions')]]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSeeInOrder([
                'Welcome to our site',
                'Contact us',
                'drawn by the page itself (Pool Proposal)',
                'Our terms and conditions',
            ]);
    }

    public function test_blocks_render_in_sort_order(): void
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create([
            'sort_order' => 2,
            'content' => [$this->paragraph('Second block')],
        ]);
        ContentBlock::factory()->for($page, 'blockable')->create([
            'sort_order' => 1,
            'content' => [$this->paragraph('First block')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSeeInOrder(['First block', 'Second block']);
    }

    public function test_inline_columns_render_side_by_side_content(): void
    {
        $page = $this->pageWith([
            'content' => [
                [
                    'type' => 'columnList',
                    'children' => [
                        [
                            'type' => 'column',
                            'props' => ['width' => 1],
                            'children' => [$this->paragraph('Left column text')],
                        ],
                        [
                            'type' => 'column',
                            'props' => ['width' => 1],
                            'children' => [$this->paragraph('Right column text')],
                        ],
                    ],
                ],
            ],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('bn-columns')
            ->assertSeeInOrder(['Left column text', 'Right column text']);
    }

    public function test_a_block_background_image_and_overlay_render(): void
    {
        $page = $this->pageWith([
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
            'background_overlay' => 45,
            'content' => [$this->paragraph('Text on a background')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('fbe-block-has-bg')
            ->assertSee('blocks/backgrounds/pool.jpg')
            ->assertSee('fbe-block-overlay');
    }

    public function test_a_copy_of_a_page_copies_blocks_with_content_and_background(): void
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->fullHeight()->create([
            'sort_order' => 1,
            'content_width' => 'wide',
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
            'content' => [$this->paragraph('First')],
        ]);
        ContentBlock::factory()->for($page, 'blockable')->section('contact')->create(['sort_order' => 2]);
        ContentBlock::factory()->for($page, 'blockable')->create(['collection' => 'footer', 'sort_order' => 1]);
        $copy = Page::factory()->create();

        $page->copyContentBlocksTo($copy);

        $blocks = $copy->contentBlocks;
        $this->assertCount(2, $blocks);
        $this->assertCount(1, $copy->contentBlocksIn('footer')->get());
        $this->assertSame('blocks/backgrounds/pool.jpg', $blocks->first()->background_image_path);
        $this->assertSame($page->contentBlocks->first()->content, $blocks->first()->content);
        $this->assertSame('wide', $blocks->first()->content_width);
        $this->assertTrue($blocks->first()->full_height);
        $this->assertSame('contact', $blocks->last()->kind);
        // The original keeps its own blocks.
        $this->assertCount(2, $page->contentBlocks()->get());
        $this->assertSame(6, ContentBlock::count());
    }

    public function test_a_copy_can_be_limited_to_one_list_of_blocks(): void
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create();
        ContentBlock::factory()->for($page, 'blockable')->create(['collection' => 'footer']);
        $copy = Page::factory()->create();

        $page->copyContentBlocksTo($copy, 'footer');

        $this->assertCount(0, $copy->contentBlocks);
        $this->assertCount(1, $copy->contentBlocksIn('footer')->get());
    }

    public function test_a_page_can_hold_several_lists_of_blocks(): void
    {
        $page = Page::factory()->create();
        $body = ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 1]);
        $footer = ContentBlock::factory()->for($page, 'blockable')->create(['collection' => 'footer', 'sort_order' => 1]);
        ContentBlock::factory()->for(Page::factory()->create(), 'blockable')->create(['collection' => 'footer']);

        $this->assertSame([$body->id], $page->contentBlocks->pluck('id')->all());
        $this->assertSame([$footer->id], $page->contentBlocksIn('footer')->get()->pluck('id')->all());
    }

    public function test_deleting_a_page_deletes_its_blocks(): void
    {
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();
        $footer = ContentBlock::factory()->for($page, 'blockable')->create(['collection' => 'footer']);
        $other = ContentBlock::factory()->for(Page::factory()->create(), 'blockable')->create();

        $page->delete();

        $this->assertModelMissing($block);
        $this->assertModelMissing($footer);
        $this->assertModelExists($other);
    }

    public function test_the_public_page_loads_only_the_web_fonts_its_blocks_use(): void
    {
        $page = $this->pageWith([
            'content' => [[
                'type' => 'paragraph',
                'content' => [
                    ['type' => 'text', 'text' => 'Modern', 'styles' => ['fontFamily' => 'poppins']],
                    ['type' => 'text', 'text' => 'Plain', 'styles' => ['fontFamily' => 'georgia']],
                ],
            ]],
        ]);

        $html = $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('font-family: &#039;Poppins&#039;, sans-serif;', false)
            ->getContent();

        $this->assertSame(1, preg_match('~<link rel="stylesheet" href="(https://fonts\.bunny\.net/[^"]*)">~', $html, $link));
        $this->assertStringContainsString('family=poppins:400,700', $link[1]);

        // Georgia is on the reader's device and Roboto is not used here, so
        // neither should cost the page a download.
        $this->assertStringNotContainsString('georgia', $link[1]);
        $this->assertStringNotContainsString('roboto', $link[1]);
    }

    public function test_a_page_with_no_web_fonts_loads_no_font_stylesheet(): void
    {
        $page = $this->pageWith([
            'content' => [$this->paragraph('Nothing fancy')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertDontSee('fonts.bunny.net');
    }

    public function test_web_fonts_are_not_linked_when_the_font_host_is_switched_off(): void
    {
        config(['filament-block-editor.fonts.web_fonts_url' => null]);
        $page = $this->pageWith([
            'content' => [[
                'type' => 'paragraph',
                'content' => [['type' => 'text', 'text' => 'Modern', 'styles' => ['fontFamily' => 'poppins']]],
            ]],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('Modern')
            ->assertDontSee('family=poppins');
    }

    public function test_a_plain_summary_field_renders_on_the_public_page(): void
    {
        $page = Page::factory()->create(['summary' => [$this->paragraph('Summary on its own')]]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('class="fbe-rich-text demo-summary"', false)
            ->assertSee('Summary on its own');
    }

    public function test_the_blocks_component_can_transform_the_rendered_html(): void
    {
        $page = $this->pageWith(['content' => [$this->paragraph('Hello {name}')]]);

        $html = Blade::render(
            '<x-filament-block-editor::blocks :blocks="$blocks" :transform="fn (string $html) => str_replace(\'{name}\', \'Sam\', $html)" />',
            ['blocks' => $page->contentBlocks],
        );

        $this->assertStringContainsString('Hello Sam', $html);
        $this->assertStringNotContainsString('{name}', $html);
    }

    public function test_the_style_sheet_saves_a_solid_colour_background(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                $this->sheet($block),
                [
                    'background_type' => 'color',
                    'background_color' => '#1E1B4B',
                ],
            )
            ->call('save')
            ->assertHasNoErrors();

        $block->refresh();
        $this->assertSame('color', $block->background_type);
        $this->assertSame('#1e1b4b', $block->background_color);
    }

    public function test_the_style_sheet_saves_image_tint_blur_position_and_card_settings(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('blocks/backgrounds/pool.jpg', 'jpeg-bytes');

        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create([
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
        ]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                $this->sheet($block),
                [
                    'background_type' => 'image',
                    'background_tint_color' => '#ff0000',
                    'background_tint_style' => 'blend',
                    'background_overlay' => 30,
                    'background_blur' => 6,
                    'background_position' => 'top',
                    'background_card' => true,
                ],
            )
            ->call('save')
            ->assertHasNoErrors();

        $block->refresh();
        $this->assertSame('image', $block->background_type);
        $this->assertSame('#ff0000', $block->background_tint_color);
        $this->assertSame('blend', $block->background_tint_style);
        $this->assertSame(30, $block->background_overlay);
        $this->assertSame(6, $block->background_blur);
        $this->assertSame('top', $block->background_position);
        $this->assertTrue($block->background_card);
    }

    public function test_the_style_sheet_rejects_a_colour_that_is_not_a_hex_code(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                $this->sheet($block),
                [
                    'background_type' => 'color',
                    'background_color' => 'navy',
                ],
            )
            ->assertHasActionErrors(['background_color']);
    }

    public function test_a_dark_solid_colour_background_renders_with_light_text(): void
    {
        $page = $this->pageWith([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'content' => [$this->paragraph('Text on navy')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('background-color: #1e1b4b', false)
            ->assertSee('class="fbe-block fbe-block-has-bg fbe-block-light-text"', false)
            ->assertDontSee('class="fbe-block-bg', false)
            ->assertDontSee('class="fbe-block-overlay', false);
    }

    public function test_a_light_solid_colour_background_keeps_dark_text(): void
    {
        $page = $this->pageWith([
            'background_type' => 'color',
            'background_color' => '#f1f5f9',
            'content' => [$this->paragraph('Text on light grey')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('background-color: #f1f5f9', false)
            ->assertSee('class="fbe-block fbe-block-has-bg"', false);
    }

    public function test_image_tint_blur_position_and_card_render_on_the_public_page(): void
    {
        $page = $this->pageWith([
            'background_type' => 'image',
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
            'background_tint_color' => '#ff0000',
            'background_tint_style' => 'blend',
            'background_overlay' => 30,
            'background_blur' => 6,
            'background_position' => 'top',
            'background_card' => true,
            'content' => [$this->paragraph('Text on a card')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('class="fbe-block fbe-block-has-bg fbe-block-card"', false)
            ->assertSee('--fbe-bg-blur: 6px', false)
            ->assertSee('background-position: top', false)
            ->assertSee('background-color: #ff0000; opacity: 0.3; mix-blend-mode: multiply', false);
    }

    public function test_a_colour_block_ignores_a_leftover_image_and_a_blank_colour_has_no_background(): void
    {
        $page = $this->pageWith([
            'background_type' => 'color',
            'background_color' => null,
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
            'content' => [$this->paragraph('Plain block')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('class="fbe-block"', false)
            ->assertDontSee('blocks/backgrounds/pool.jpg');
    }

    public function test_a_block_without_a_type_infers_it_from_the_media_it_has(): void
    {
        $this->assertSame('image', ContentBlock::factory()->make([
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
        ])->backgroundType()->value);

        $this->assertSame('video', ContentBlock::factory()->make([
            'background_image_path' => 'blocks/backgrounds/pool.jpg',
            'background_video_url' => 'https://example.com/bg.mp4',
        ])->backgroundType()->value);

        $this->assertSame('color', ContentBlock::factory()->make()->backgroundType()->value);
    }

    public function test_an_invalid_colour_falls_back_safely_when_rendering(): void
    {
        $block = ContentBlock::factory()->make([
            'background_type' => 'color',
            'background_color' => 'red; } body { display: none',
        ]);

        $this->assertFalse($block->hasBackground());
        $this->assertStringNotContainsString('display', $block->sectionStyle());
    }

    public function test_style_changes_apply_without_pressing_a_button(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();
        $sheet = $this->sheet($block);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->mountAction($sheet)
            ->setActionData([
                'background_type' => 'color',
                'background_color' => '#1e1b4b',
                'padding_size' => 'xl',
            ])
            ->assertActionMounted($sheet)
            ->call('save')
            ->assertHasNoErrors();

        $block->refresh();
        $this->assertSame('color', $block->background_type);
        $this->assertSame('#1e1b4b', $block->background_color);
        $this->assertSame('xl', $block->padding_size);
    }

    public function test_the_editor_preview_redraws_while_the_style_sheet_is_still_open(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();
        $sheet = $this->sheet($block);

        $component = Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->mountAction($sheet)
            ->set('mountedActions.0.data.background_type', 'color')
            ->set('mountedActions.0.data.background_color', '#123456')
            ->set('mountedActions.0.data.padding_size', 'xl')
            ->assertActionMounted($sheet);

        // Filament only redraws the mounted modal unless the action forces a
        // full render, so without that the block behind the sheet keeps its
        // old HTML until the sheet is closed.
        $html = $component->html();
        $this->assertStringContainsString('background-color: #123456;', $html);
        $this->assertStringContainsString('padding: 6rem;', $html);
        $this->assertStringContainsString('fbe-blocknote-has-bg', $html);
    }

    public function test_youtube_and_vimeo_links_become_silent_looping_players(): void
    {
        $youtube = BlockBackgroundVideo::embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        $this->assertStringStartsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?', $youtube);
        $this->assertStringContainsString('autoplay=1', $youtube);
        $this->assertStringContainsString('mute=1', $youtube);
        $this->assertStringContainsString('loop=1', $youtube);
        $this->assertStringContainsString('playlist=dQw4w9WgXcQ', $youtube);

        $short = BlockBackgroundVideo::embedUrl('https://youtu.be/dQw4w9WgXcQ');
        $this->assertStringStartsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?', $short);

        $vimeo = BlockBackgroundVideo::embedUrl('https://vimeo.com/123456');
        $this->assertStringStartsWith('https://player.vimeo.com/video/123456?', $vimeo);
        $this->assertStringContainsString('background=1', $vimeo);

        $unlisted = BlockBackgroundVideo::embedUrl('https://vimeo.com/123456/abc123def4');
        $this->assertStringStartsWith('https://player.vimeo.com/video/123456?h=abc123def4&', $unlisted);
        $this->assertStringContainsString('background=1', $unlisted);

        $this->assertNull(BlockBackgroundVideo::embedUrl('https://example.com/bg.mp4'));
        $this->assertNull(BlockBackgroundVideo::embedUrl(null));
    }

    public function test_a_youtube_background_renders_as_a_player_and_a_file_as_a_video_tag(): void
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create([
            'sort_order' => 1,
            'background_type' => 'video',
            'background_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'content' => [$this->paragraph('Text on a video')],
        ]);
        ContentBlock::factory()->for($page, 'blockable')->create([
            'sort_order' => 2,
            'background_type' => 'video',
            'background_video_url' => 'https://example.com/bg.mp4',
            'content' => [$this->paragraph('Text on a file video')],
        ]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('fbe-block-bg-embed')
            ->assertSee('youtube-nocookie.com/embed/dQw4w9WgXcQ')
            ->assertSee('src="https://example.com/bg.mp4"', false)
            ->assertSee('fbe-block-overlay');
    }

    public function test_a_youtube_background_sits_in_its_own_layer_so_padding_cannot_shrink_it(): void
    {
        $page = $this->pageWith([
            'background_type' => 'video',
            'background_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'padding_size' => 'xl',
            'content' => [$this->paragraph('Short and wide')],
        ]);

        $html = $this->get(route('pages.show', $page->slug))->assertOk()->getContent();

        // The player is sized from its layer, which covers the whole section.
        // Sized from the section itself it only saw the content box, so a
        // padded section was left with bare strips at the sides.
        $this->assertMatchesRegularExpression(
            '~<div class="fbe-block-bg-layer"[^>]*>\s*<iframe[^>]*class="fbe-block-bg-embed~',
            $html,
        );
    }

    public function test_the_editor_preview_plays_a_youtube_background_behind_the_block(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create([
            'background_type' => 'video',
            'background_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertSee('fbe-blocknote-has-media')
            ->assertSee('fbe-blocknote-media')
            ->assertSee('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }

    public function test_a_page_section_is_added_from_the_plus_menu_without_a_style_or_content(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($this->menu('addSection_contact'))
            ->call('save')
            ->assertHasNoErrors();

        $block = $page->refresh()->contentBlocks->sole();
        $this->assertSame('contact', $block->kind);
        $this->assertTrue($block->isSection());
        $this->assertNull($block->block_style_id);
        $this->assertEmpty($block->content);
    }

    public function test_a_page_section_can_only_be_placed_once_unless_it_is_repeatable(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();

        $editor = Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertActionVisible($this->menu('addSection_contact'))
            ->callAction($this->menu('addSection_contact'))
            ->assertActionHidden($this->menu('addSection_contact'));

        // Placed already: the top menu does not offer it either.
        $editor->assertActionHidden($this->menu('addSection_contact', '_top'))
            ->call('save');

        $this->assertCount(1, $page->refresh()->contentBlocks);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertActionHidden($this->menu('addSection_contact'))
            ->assertActionHidden($this->menu('addSection_contact', '_top'));
    }

    public function test_deleting_a_placed_section_brings_it_back_into_the_menu(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $section = ContentBlock::factory()->for($page, 'blockable')->section('contact')->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertActionHidden($this->menu('addSection_contact'))
            ->callAction(TestAction::make('delete')->schemaComponent('contentBlocks')->arguments(['item' => "record-{$section->id}"]))
            ->assertActionVisible($this->menu('addSection_contact'));
    }

    public function test_a_repeatable_page_section_can_be_placed_many_times(): void
    {
        PageSections::register('banner', 'Banner', 'workbench::sections.contact', repeatable: true);
        $this->actingAsAdmin();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($this->menu('addSection_banner'))
            ->callAction($this->menu('addSection_banner'))
            ->assertActionVisible($this->menu('addSection_banner'))
            ->call('save')
            ->assertHasNoErrors();

        $this->assertSame(['banner', 'banner'], $page->refresh()->contentBlocks->pluck('kind')->all());
    }

    public function test_a_page_section_has_no_style_sheet_and_cannot_be_saved_to_the_library(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $section = ContentBlock::factory()->for($page, 'blockable')->section('contact')->create();
        $content = ContentBlock::factory()->for($page, 'blockable')->create();

        $item = fn (ContentBlock $block): array => ['item' => "record-{$block->id}"];

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertActionHidden(TestAction::make('editStyle')->schemaComponent('contentBlocks')->arguments($item($section)))
            ->assertActionHidden(TestAction::make('saveToLibrary')->schemaComponent('contentBlocks')->arguments($item($section)))
            ->assertActionVisible(TestAction::make('editStyle')->schemaComponent('contentBlocks')->arguments($item($content)))
            ->assertActionVisible(TestAction::make('saveToLibrary')->schemaComponent('contentBlocks')->arguments($item($content)));
    }

    public function test_the_editor_shows_a_card_where_the_page_draws_a_section(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->section('contact')->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->assertSee('fbe-section-block')
            ->assertSee('The contact form, drawn by the page.');
    }

    public function test_a_page_section_with_an_unknown_kind_is_skipped_on_the_public_page(): void
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create(['sort_order' => 1, 'content' => [$this->paragraph('Kept block')]]);
        ContentBlock::factory()->for($page, 'blockable')->section('retired')->create(['sort_order' => 2]);

        $this->get(route('pages.show', $page->slug))
            ->assertOk()
            ->assertSee('Kept block')
            ->assertDontSee('Contact us');
    }

    /**
     * A page with one block, which is all the public page needs to draw.
     *
     * @param  array<string, mixed>  $block
     */
    private function pageWith(array $block = []): Page
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create($block);

        return $page->load('contentBlocks');
    }
}
