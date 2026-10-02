<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Filament\Actions\Testing\TestAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\BlockStyleResource;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages\EditBlockStyle;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages\ListBlockStyles;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Support\BlockStyles;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Workbench\App\Filament\Resources\Pages\Pages\EditPage;
use Workbench\App\Models\Page;
use Workbench\App\Models\Team;

class BlockStyleTest extends TestCase
{
    public function test_a_block_following_a_style_renders_that_styles_look(): void
    {
        $style = BlockStyle::factory()->create([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'padding_size' => 'xl',
        ]);
        $page = $this->pageWithBlock(['block_style_id' => $style->id]);

        $html = $this->publicPageOf($page);

        $this->assertStringContainsString('background-color: #1e1b4b;', $html);
        $this->assertStringContainsString('padding: clamp(1.5rem, 7.5vw, 6rem);', $html);
    }

    public function test_editing_a_style_changes_every_block_that_follows_it(): void
    {
        $style = BlockStyle::factory()->create([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
        ]);

        $first = $this->pageWithBlock(['block_style_id' => $style->id]);
        $second = $this->pageWithBlock(['block_style_id' => $style->id]);

        $style->update(['background_color' => '#7f1d1d']);

        foreach ([$first, $second] as $page) {
            $html = $this->publicPageOf($page);
            $this->assertStringContainsString('background-color: #7f1d1d;', $html);
            $this->assertStringNotContainsString('background-color: #1e1b4b;', $html);
        }
    }

    public function test_a_changed_setting_wins_while_the_rest_keep_following(): void
    {
        $style = BlockStyle::factory()->create([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'padding_size' => 'xl',
        ]);
        $page = $this->pageWithBlock([
            'block_style_id' => $style->id,
            'style_overrides' => ['padding_size'],
            'padding_size' => 'none',
        ]);

        $html = $this->publicPageOf($page);

        $this->assertStringContainsString('padding: 0;', $html);
        $this->assertStringContainsString('background-color: #1e1b4b;', $html);
    }

    public function test_handing_a_setting_back_makes_it_follow_the_style_again(): void
    {
        $style = BlockStyle::factory()->create(['padding_size' => 'xl']);
        $page = $this->pageWithBlock([
            'block_style_id' => $style->id,
            'style_overrides' => ['padding_size'],
            'padding_size' => 'none',
        ]);

        $page->contentBlocks->first()->update(['style_overrides' => []]);

        $this->assertStringContainsString('padding: clamp(1.5rem, 7.5vw, 6rem);', $this->publicPageOf($page));
    }

    public function test_clearing_a_colour_on_one_block_keeps_it_cleared(): void
    {
        // The reason overrides are recorded by name rather than by leaving the
        // column empty: "no colour" is a real choice a person can make.
        $style = BlockStyle::factory()->create([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
        ]);
        $page = $this->pageWithBlock([
            'block_style_id' => $style->id,
            'style_overrides' => ['background_color'],
            'background_color' => null,
        ]);

        $this->assertStringNotContainsString('background-color: #1e1b4b;', $this->publicPageOf($page));
    }

    public function test_a_block_with_no_style_renders_exactly_as_before(): void
    {
        $page = $this->pageWithBlock([
            'padding_size' => 'lg',
            'spacing_top' => 'none',
            'background_type' => 'color',
            'background_color' => '#0f172a',
        ]);

        $html = $this->publicPageOf($page);

        $this->assertStringContainsString('padding: clamp(1.5rem, 5vw, 3.5rem);', $html);
        $this->assertStringContainsString('margin-top: 0;', $html);
        $this->assertStringContainsString('background-color: #0f172a;', $html);
    }

    public function test_the_plus_menu_starts_a_blank_block_from_the_default_style(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->isDefault()->create();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(TestAction::make('addBlank__contentBlocks')->schemaComponent('contentBlocks'))
            ->call('save')
            ->assertHasNoErrors();

        $this->assertSame($style->id, $page->refresh()->contentBlocks->first()->block_style_id);
    }

    public function test_the_plus_menu_starts_a_blank_block_from_the_open_teams_default_style(): void
    {
        BlockStyle::factory()->isDefault()->create(['name' => 'Shared default']);
        BlockStyle::factory()->for(Team::factory()->create(), 'tenant')->isDefault()->create(['name' => 'Their default']);
        $team = $this->actingAsAdminWithTeamOpen();
        $style = BlockStyle::factory()->isDefault()->create(['name' => 'Our default']);
        $page = Page::factory()->create();

        $this->assertBelongsToTenant($team, $style);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(TestAction::make('addBlank__contentBlocks')->schemaComponent('contentBlocks'))
            ->call('save')
            ->assertHasNoErrors();

        $this->assertSame($style->id, $page->refresh()->contentBlocks->first()->block_style_id);
    }

    public function test_a_team_without_a_default_style_starts_blank_blocks_with_no_style(): void
    {
        BlockStyle::factory()->isDefault()->create(['name' => 'Shared default']);
        $this->actingAsAdminWithTeamOpen();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(TestAction::make('addBlank__contentBlocks')->schemaComponent('contentBlocks'))
            ->call('save')
            ->assertHasNoErrors();

        $this->assertNull($page->refresh()->contentBlocks->first()->block_style_id);
    }

    public function test_a_ready_made_design_keeps_its_own_look_instead_of_the_default_style(): void
    {
        $this->actingAsAdmin();
        BlockStyle::factory()->isDefault()->create();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('addReadyMade__contentBlocks')->schemaComponent('contentBlocks'),
                ['selection' => 'preset:hero'],
            )
            ->call('save')
            ->assertHasNoErrors();

        $this->assertNull($page->refresh()->contentBlocks->first()->block_style_id);
    }

    public function test_only_one_style_can_be_the_default_for_new_blocks_in_the_shared_library(): void
    {
        $first = BlockStyle::factory()->isDefault()->create();
        $second = BlockStyle::factory()->isDefault()->create();

        $this->assertFalse($first->fresh()->is_default);
        $this->assertTrue($second->fresh()->is_default);
    }

    public function test_only_one_style_can_be_the_default_for_new_blocks_in_a_team(): void
    {
        $other = Team::factory()->create();
        $shared = BlockStyle::factory()->isDefault()->create();
        $theirs = BlockStyle::factory()->for($other, 'tenant')->isDefault()->create();

        $team = $this->actingAsTeamMember();
        $first = BlockStyle::factory()->isDefault()->create();
        $second = BlockStyle::factory()->isDefault()->create();

        $this->assertBelongsToTenant($team, $second);
        $this->assertFalse($first->fresh()->is_default);
        $this->assertTrue($second->fresh()->is_default);
        // Another library's default is none of this team's business.
        $this->assertTrue($shared->fresh()->is_default);
        $this->assertTrue($theirs->fresh()->is_default);
    }

    public function test_making_an_existing_style_the_default_turns_the_old_one_off(): void
    {
        $old = BlockStyle::factory()->isDefault()->create();
        $other = BlockStyle::factory()->create();

        $other->update(['is_default' => true]);

        $this->assertFalse($old->fresh()->is_default);
        $this->assertTrue($other->fresh()->is_default);
    }

    public function test_deleting_a_style_leaves_its_blocks_looking_the_same(): void
    {
        $style = BlockStyle::factory()->create([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'padding_size' => 'xl',
        ]);
        $page = $this->pageWithBlock(['block_style_id' => $style->id]);
        $saved = SavedBlock::factory()->create(['block_style_id' => $style->id]);

        $before = $this->publicPageOf($page);

        $style->delete();

        $this->assertSame($before, $this->publicPageOf($page->fresh()));
        $this->assertNull($page->fresh()->contentBlocks->first()->block_style_id);
        $this->assertSame('xl', $saved->fresh()->padding_size);
        $this->assertNull($saved->fresh()->block_style_id);
    }

    public function test_a_block_keeps_following_its_style_when_the_style_changes(): void
    {
        $style = BlockStyle::factory()->create(['padding_size' => 'xl']);
        $page = $this->pageWithBlock(['block_style_id' => $style->id]);
        $block = $page->contentBlocks->first();

        $style->update(['padding_size' => 'none']);

        $this->assertSame($style->id, $block->fresh()->block_style_id);
        $this->assertSame('0', $block->fresh()->paddingSize()->css());
    }

    public function test_a_copy_of_a_page_keeps_following_the_style(): void
    {
        $style = BlockStyle::factory()->create();
        $page = $this->pageWithBlock([
            'block_style_id' => $style->id,
            'style_overrides' => ['padding_size'],
            'padding_size' => 'none',
        ]);
        $copy = Page::factory()->create();

        $page->copyContentBlocksTo($copy);

        $block = $copy->contentBlocks()->get()->sole();
        $this->assertSame($style->id, $block->block_style_id);
        $this->assertSame(['padding_size'], $block->styleOverrides());
        $this->assertNotSame($page->contentBlocks->first()->id, $block->id);
    }

    public function test_setting_one_field_leaves_the_rest_following_the_style(): void
    {
        $style = BlockStyle::factory()->create(['padding_size' => 'xl', 'content_width' => 'wide']);
        $block = ContentBlock::factory()->for(Page::factory()->create(), 'blockable')->create(['block_style_id' => $style->id]);

        $payload = $block->appearancePayload(['padding_size' => 'none']);
        $block->update($payload);

        $this->assertSame('none', $block->appearance('padding_size'));
        // Untouched, so it still comes from the style.
        $this->assertSame('wide', $block->appearance('content_width'));
        $this->assertSame(['padding_size'], $block->styleOverrides());
    }

    public function test_letting_go_of_a_style_keeps_the_look_the_block_had(): void
    {
        $style = BlockStyle::factory()->create(['padding_size' => 'xl', 'background_color' => '#1e1b4b']);
        $block = ContentBlock::factory()->for(Page::factory()->create(), 'blockable')->create(['block_style_id' => $style->id]);

        $block->update($block->appearancePayload(['block_style_id' => null]));

        $block->refresh();
        $this->assertNull($block->block_style_id);
        $this->assertSame('xl', $block->padding_size);
        $this->assertSame('#1e1b4b', $block->background_color);
    }

    public function test_a_media_file_used_only_by_a_style_still_counts_as_in_use(): void
    {
        Storage::fake('public');

        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('hero.jpg'));
        BlockStyle::factory()->create([
            'name' => 'Dark hero',
            'background_type' => 'image',
            'background_image_path' => $asset->path,
        ]);

        $usages = app(MediaLibrary::class)->usages($asset);

        $this->assertSame(['Block style: Dark hero'], $usages);
    }

    public function test_blocks_sharing_one_style_cost_one_extra_query(): void
    {
        $style = BlockStyle::factory()->create();
        $page = Page::factory()->create();

        foreach (range(1, 5) as $ignored) {
            ContentBlock::factory()->for($page, 'blockable')->create(['block_style_id' => $style->id]);
        }

        DB::enableQueryLog();
        $this->publicPageOf($page);
        $queries = $this->styleQueries();
        DB::disableQueryLog();

        $this->assertSame(1, $queries, 'Five blocks sharing one style must not cost five lookups.');
    }

    public function test_blocks_that_were_not_eager_loaded_still_cost_one_style_lookup(): void
    {
        $style = BlockStyle::factory()->create();
        $page = Page::factory()->create();

        foreach (range(1, 5) as $ignored) {
            ContentBlock::factory()->for($page, 'blockable')->create(['block_style_id' => $style->id]);
        }

        $blocks = $page->contentBlocks()->get();

        DB::enableQueryLog();
        $blocks->each(fn (ContentBlock $block): string => $block->sectionStyle());
        $queries = $this->styleQueries();
        DB::disableQueryLog();

        $this->assertSame(1, $queries, 'The per-request style lookup must cache a style by id.');
    }

    public function test_a_dangling_style_id_is_looked_up_once_and_the_block_stands_on_its_own(): void
    {
        $block = ContentBlock::factory()->make(['block_style_id' => 9999, 'padding_size' => 'lg']);

        DB::enableQueryLog();
        $this->assertNull($block->resolvedBlockStyle());
        $this->assertNull($block->resolvedBlockStyle());
        $queries = $this->styleQueries();
        DB::disableQueryLog();

        $this->assertSame(1, $queries);
        $this->assertSame('lg', $block->appearance('padding_size'));
    }

    public function test_the_style_lookup_is_forgotten_after_a_style_is_written(): void
    {
        $style = BlockStyle::factory()->create(['padding_size' => 'xl']);
        $service = app(BlockStyles::class);

        $this->assertSame('xl', $service->find($style->id)->padding_size);

        $style->update(['padding_size' => 'sm']);
        $service->forget($style->id);

        $this->assertSame('sm', $service->find($style->id)->padding_size);
    }

    public function test_the_editor_preview_and_the_public_page_agree_on_an_inherited_look(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->create([
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'padding_size' => 'xl',
        ]);
        $page = $this->pageWithBlock(['block_style_id' => $style->id]);

        $editor = Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])->html();

        $this->assertStringContainsString('background-color: #1e1b4b;', $editor);
        $this->assertStringContainsString('padding: 6rem;', $editor);
        $this->assertStringContainsString('background-color: #1e1b4b;', $this->publicPageOf($page));
    }

    public function test_the_style_picker_offers_the_shared_library_without_a_tenant(): void
    {
        $this->actingAsAdmin();
        $shared = BlockStyle::factory()->create(['name' => 'Shared dark']);
        BlockStyle::factory()->archived()->create(['name' => 'Shared old']);
        BlockStyle::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Team only']);

        $this->assertSame([$shared->id => 'Shared dark'], app(BlockStyles::class)->optionsFor(null));
    }

    public function test_a_team_cannot_point_a_block_at_another_teams_style(): void
    {
        $theirs = BlockStyle::factory()->for(Team::factory()->create(), 'tenant')->create();
        $shared = BlockStyle::factory()->create();
        $team = $this->actingAsAdminWithTeamOpen();
        $mine = BlockStyle::factory()->create(['padding_size' => 'xl']);
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();
        $sheet = TestAction::make('editStyle')->schemaComponent('contentBlocks')->arguments(['item' => "record-{$block->id}"]);

        $this->assertBelongsToTenant($team, $mine);
        $this->assertSame([$mine->id => $mine->name], app(BlockStyles::class)->optionsFor($team));

        foreach ([$theirs, $shared] as $foreign) {
            Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
                ->callAction($sheet, ['block_style_id' => $foreign->id])
                ->assertHasActionErrors(['block_style_id']);
        }

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($sheet, ['block_style_id' => $mine->id])
            ->assertHasNoActionErrors()
            ->call('save')
            ->assertHasNoErrors();

        $this->assertSame($mine->id, $block->refresh()->block_style_id);
    }

    public function test_the_block_styles_pages_open(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->darkHero()->create(['name' => 'Dark hero']);

        $list = $this->get(BlockStyleResource::getUrl())->assertOk();
        $this->assertStringContainsString('Dark hero', $list->getContent());
        // The list drops Filament's trailing "List" crumb.
        $this->assertStringNotContainsString('>List<', $list->getContent());

        $this->get(BlockStyleResource::getUrl('create'))->assertOk();
        $this->get(BlockStyleResource::getUrl('edit', ['record' => $style]))->assertOk();
    }

    public function test_a_block_style_is_addressed_by_its_uuid_not_its_number(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->create();

        $this->assertStringEndsWith("/block-styles/{$style->uuid}/edit", BlockStyleResource::getUrl('edit', ['record' => $style]));
    }

    public function test_the_team_block_styles_pages_open(): void
    {
        $team = $this->actingAsTeamMember();
        $style = BlockStyle::factory()->darkHero()->create(['name' => 'Dark hero']);

        $this->get(BlockStyleResource::getUrl(tenant: $team))->assertOk()->assertSee('Dark hero');
        $this->get(BlockStyleResource::getUrl('create', tenant: $team))->assertOk();
        $this->get(BlockStyleResource::getUrl('edit', ['record' => $style], tenant: $team))->assertOk();
    }

    public function test_a_style_in_the_shared_library_shows_in_the_admin_panel(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->create(['name' => 'Mine']);

        Livewire::test(ListBlockStyles::class)->assertCanSeeTableRecords([$style]);
    }

    public function test_a_style_only_shows_in_its_own_team(): void
    {
        $shared = BlockStyle::factory()->create(['name' => 'Shared']);
        $theirs = BlockStyle::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Theirs']);
        $team = $this->actingAsTeamMember();
        $mine = BlockStyle::factory()->create(['name' => 'Mine']);

        $html = $this->get(BlockStyleResource::getUrl(tenant: $team))->assertOk()->getContent();

        $this->assertStringContainsString('Mine', $html);
        $this->assertStringNotContainsString('Theirs', $html);
        $this->assertStringNotContainsString('Shared', $html);

        Livewire::test(ListBlockStyles::class)
            ->assertCanSeeTableRecords([$mine])
            ->assertCanNotSeeTableRecords([$shared, $theirs]);
    }

    public function test_a_team_cannot_open_another_teams_style(): void
    {
        $theirs = BlockStyle::factory()->for(Team::factory()->create(), 'tenant')->create();
        $team = $this->actingAsTeamMember();

        $this->get(BlockStyleResource::getUrl('edit', ['record' => $theirs], tenant: $team))->assertNotFound();
    }

    public function test_saving_a_style_says_how_many_blocks_follow_it(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->create(['name' => 'Dark hero']);
        $page = Page::factory()->create();
        ContentBlock::factory()->count(2)->for($page, 'blockable')->create(['block_style_id' => $style->id]);
        SavedBlock::factory()->create(['block_style_id' => $style->id]);

        $this->assertSame(3, $style->followerCount());

        Livewire::test(EditBlockStyle::class, ['record' => $style->getRouteKey()])
            ->fillForm(['name' => 'Darker hero'])
            ->call('save')
            ->assertHasNoFormErrors()
            ->assertNotified('Style saved. 3 blocks updated.');
    }

    public function test_saving_a_style_nobody_follows_says_so_plainly(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->create(['name' => 'Lonely']);

        Livewire::test(EditBlockStyle::class, ['record' => $style->getRouteKey()])
            ->fillForm(['name' => 'Still lonely'])
            ->call('save')
            ->assertNotified('Style saved');
    }

    public function test_saving_a_page_whose_block_follows_a_style_keeps_working(): void
    {
        $this->actingAsAdmin();
        $style = BlockStyle::factory()->create(['padding_size' => 'xl']);
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create(['block_style_id' => $style->id]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('editStyle')
                    ->schemaComponent('contentBlocks')
                    ->arguments(['item' => "record-{$block->id}"]),
                ['block_style_id' => $style->id],
            )
            ->call('save')
            ->assertHasNoErrors();

        $this->assertSame('xl', $block->refresh()->appearance('padding_size'));
    }

    /**
     * A page with one block, which is all the public page needs to draw.
     *
     * @param  array<string, mixed>  $block
     */
    private function pageWithBlock(array $block = []): Page
    {
        $page = Page::factory()->create();
        ContentBlock::factory()->for($page, 'blockable')->create($block);

        return $page->load('contentBlocks');
    }

    private function publicPageOf(Page $page): string
    {
        return $this->get(route('pages.show', $page->slug))->assertOk()->getContent();
    }

    private function styleQueries(): int
    {
        return collect(DB::getQueryLog())
            ->filter(fn (array $query): bool => str_contains($query['query'], 'block_editor_styles'))
            ->count();
    }
}
