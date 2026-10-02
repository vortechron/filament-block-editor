<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Filament\Actions\Testing\TestAction;
use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\CreateSavedBlock;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\EditSavedBlock;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\ListSavedBlocks;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\SavedBlockResource;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Workbench\App\Filament\Resources\Pages\Pages\EditPage;
use Workbench\App\Models\Page;
use Workbench\App\Models\Team;

class SavedBlockTest extends TestCase
{
    /**
     * What a full-screen hero looks like.
     *
     * @return array<string, mixed>
     */
    private function heroLook(): array
    {
        return ['full_height' => true, 'content_width' => 'wide', 'padding_size' => 'xl'];
    }

    public function test_the_saved_blocks_list_page_shows_the_shared_library(): void
    {
        $this->actingAsAdmin();
        $mine = SavedBlock::factory()->create(['name' => 'My hero']);

        Livewire::test(ListSavedBlocks::class)
            ->assertCanSeeTableRecords([$mine]);
    }

    public function test_the_saved_blocks_list_page_only_shows_the_current_teams_blocks(): void
    {
        $shared = SavedBlock::factory()->create(['name' => 'Shared hero']);
        $theirs = SavedBlock::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Someone else hero']);
        $team = $this->actingAsTeamMember();
        $mine = SavedBlock::factory()->create(['name' => 'My hero']);

        $this->assertBelongsToTenant($team, $mine);

        Livewire::test(ListSavedBlocks::class)
            ->assertCanSeeTableRecords([$mine])
            ->assertCanNotSeeTableRecords([$shared, $theirs]);
    }

    public function test_a_saved_block_can_be_created_from_the_crud_page(): void
    {
        $this->actingAsAdmin();

        Livewire::test(CreateSavedBlock::class)
            ->fillForm([
                'name' => 'Full screen hero',
                'description' => 'Big opening section',
                'content' => [$this->paragraph('Welcome aboard')],
                'content_width' => 'wide',
                'full_height' => true,
                'padding_size' => 'xl',
                'spacing_top' => 'none',
                'spacing_bottom' => 'none',
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $block = SavedBlock::firstWhere('name', 'Full screen hero');

        $this->assertNotNull($block);
        $this->assertBelongsToTenant(null, $block);
        $this->assertTrue($block->full_height);
        $this->assertSame('wide', $block->content_width);
        $this->assertSame([$this->paragraph('Welcome aboard')], $block->content);
    }

    public function test_a_saved_block_created_in_a_team_belongs_to_that_team(): void
    {
        $team = $this->actingAsTeamMember();

        Livewire::test(CreateSavedBlock::class)
            ->fillForm([
                'name' => 'Team hero',
                'content' => [$this->paragraph('Welcome aboard')],
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $this->assertBelongsToTenant($team, SavedBlock::firstWhere('name', 'Team hero'));
    }

    public function test_a_saved_block_can_be_created_from_a_ready_made_design(): void
    {
        $this->actingAsAdmin();

        Livewire::test(ListSavedBlocks::class)
            ->callAction(TestAction::make('createFromPreset'), [
                'selection' => 'preset:hero',
                'name' => 'Opening hero',
            ]);

        $block = SavedBlock::firstWhere('name', 'Opening hero');

        $this->assertNotNull($block);
        $this->assertBelongsToTenant(null, $block);
        $this->assertTrue($block->full_height);
        $this->assertSame('wide', $block->content_width);
        $this->assertStringContainsString('A headline that says what you do', $block->renderContentHtml());
    }

    public function test_a_team_saved_block_can_be_created_from_a_ready_made_design(): void
    {
        $team = $this->actingAsTeamMember();

        Livewire::test(ListSavedBlocks::class)
            ->callAction(TestAction::make('createFromPreset'), [
                'selection' => 'preset:hero',
                'name' => 'Opening hero',
            ]);

        $block = SavedBlock::firstWhere('name', 'Opening hero');

        $this->assertNotNull($block);
        $this->assertBelongsToTenant($team, $block);
        $this->assertStringContainsString('A headline that says what you do', $block->renderContentHtml());
    }

    public function test_a_blank_saved_block_starts_from_the_open_teams_default_style(): void
    {
        $other = Team::factory()->create();
        BlockStyle::factory()->for($other, 'tenant')->isDefault()->create(['name' => 'Their default']);
        $team = $this->actingAsTeamMember();
        $style = BlockStyle::factory()->isDefault()->create(['name' => 'Our default']);

        Livewire::test(CreateSavedBlock::class)
            ->fillForm(['name' => 'Styled block', 'content' => [$this->paragraph('Hello')]])
            ->call('create')
            ->assertHasNoFormErrors();

        $block = SavedBlock::firstWhere('name', 'Styled block');

        $this->assertBelongsToTenant($team, $block);
        $this->assertSame($style->id, $block->block_style_id);
    }

    public function test_a_saved_block_can_be_edited_and_deleted(): void
    {
        $this->actingAsAdmin();
        $block = SavedBlock::factory()->create(['name' => 'Old name']);

        Livewire::test(EditSavedBlock::class, ['record' => $block->getRouteKey()])
            ->fillForm(['name' => 'New name'])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame('New name', $block->refresh()->name);

        Livewire::test(EditSavedBlock::class, ['record' => $block->getRouteKey()])
            ->callAction(TestAction::make('delete'));

        $this->assertModelMissing($block);
    }

    public function test_a_team_cannot_open_another_teams_saved_block(): void
    {
        $theirs = SavedBlock::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Their block']);
        $this->actingAsTeamMember();

        Livewire::test(EditSavedBlock::class, ['record' => $theirs->getRouteKey()])->assertNotFound();
    }

    public function test_the_style_sheet_saves_the_block_appearance(): void
    {
        $this->actingAsAdmin();
        $block = SavedBlock::factory()->create();

        Livewire::test(EditSavedBlock::class, ['record' => $block->getRouteKey()])
            ->callAction(
                TestAction::make('editStyle')->schemaComponent('savedBlock'),
                [
                    'content_width' => 'wide',
                    'full_height' => true,
                    'padding_size' => 'xl',
                    'spacing_top' => 'none',
                    'spacing_bottom' => 'none',
                ],
            )
            ->call('save')
            ->assertHasNoFormErrors();

        $block->refresh();

        $this->assertSame('wide', $block->content_width);
        $this->assertTrue($block->full_height);
        $this->assertSame('xl', $block->padding_size);
        $this->assertSame('none', $block->spacing_top);
    }

    public function test_the_duplicate_action_copies_a_saved_block(): void
    {
        $this->actingAsAdmin();
        $block = SavedBlock::factory()->create([...$this->heroLook(), 'name' => 'Hero']);

        Livewire::test(ListSavedBlocks::class)
            ->callAction(TestAction::make('duplicate')->table($block));

        $copy = SavedBlock::firstWhere('name', 'Hero (copy)');

        $this->assertNotNull($copy);
        $this->assertTrue($copy->full_height);
        $this->assertSame($block->content, $copy->content);
        $this->assertNotSame($block->uuid, $copy->uuid);
    }

    public function test_the_duplicate_action_keeps_the_copy_in_the_same_team(): void
    {
        $team = $this->actingAsTeamMember();
        $block = SavedBlock::factory()->create(['name' => 'Hero']);

        Livewire::test(ListSavedBlocks::class)
            ->callAction(TestAction::make('duplicate')->table($block));

        $this->assertBelongsToTenant($team, SavedBlock::firstWhere('name', 'Hero (copy)'));
    }

    public function test_a_block_in_a_page_can_be_saved_to_the_library(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->fullHeight()->create([
            'content_width' => 'wide',
            'content' => [$this->paragraph('Reusable welcome')],
        ]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('saveToLibrary')
                    ->schemaComponent('contentBlocks')
                    ->arguments(['item' => "record-{$block->id}"]),
                ['name' => 'Reusable welcome block'],
            );

        $saved = SavedBlock::firstWhere('name', 'Reusable welcome block');

        $this->assertNotNull($saved);
        $this->assertBelongsToTenant(null, $saved);
        $this->assertTrue($saved->full_height);
        $this->assertSame('wide', $saved->content_width);
        $this->assertSame($block->content, $saved->content);
    }

    public function test_a_block_saved_to_the_library_with_a_team_open_belongs_to_that_team(): void
    {
        $team = $this->actingAsAdminWithTeamOpen();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create(['content' => [$this->paragraph('Reusable welcome')]]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('saveToLibrary')
                    ->schemaComponent('contentBlocks')
                    ->arguments(['item' => "record-{$block->id}"]),
                ['name' => 'Reusable welcome block'],
            );

        $this->assertBelongsToTenant($team, SavedBlock::firstWhere('name', 'Reusable welcome block'));
    }

    public function test_saving_to_the_library_needs_a_name(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $block = ContentBlock::factory()->for($page, 'blockable')->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('saveToLibrary')
                    ->schemaComponent('contentBlocks')
                    ->arguments(['item' => "record-{$block->id}"]),
                ['name' => ''],
            )
            ->assertHasActionErrors(['name' => 'required']);

        $this->assertSame(0, SavedBlock::count());
    }

    public function test_a_saved_block_can_be_inserted_into_a_page(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $saved = SavedBlock::factory()->create([
            ...$this->heroLook(),
            'content' => [$this->paragraph('Inserted from the library')],
        ]);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('addSavedBlock__contentBlocks')->schemaComponent('contentBlocks'),
                ['selection' => 'saved:'.$saved->id],
            )
            ->call('save')
            ->assertHasNoErrors();

        $page->refresh();
        $this->assertCount(1, $page->contentBlocks);

        $inserted = $page->contentBlocks->first();
        $this->assertSame($saved->content, $inserted->content);
        $this->assertTrue($inserted->full_height);
        $this->assertSame('wide', $inserted->content_width);
        $this->assertSame('xl', $inserted->padding_size);
    }

    public function test_only_the_open_teams_saved_blocks_can_be_inserted_into_a_page(): void
    {
        $shared = SavedBlock::factory()->create();
        $theirs = SavedBlock::factory()->for(Team::factory()->create(), 'tenant')->create();
        $team = $this->actingAsAdminWithTeamOpen();
        $page = Page::factory()->create();
        $mine = SavedBlock::factory()->create(['content' => [$this->paragraph('Our block')]]);
        $action = TestAction::make('addSavedBlock__contentBlocks')->schemaComponent('contentBlocks');

        $this->assertBelongsToTenant($team, $mine);

        foreach ([$theirs, $shared] as $foreign) {
            Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
                ->callAction($action, ['selection' => 'saved:'.$foreign->id])
                ->assertHasActionErrors(['selection']);
        }

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($action, ['selection' => 'saved:'.$mine->id])
            ->assertHasNoActionErrors()
            ->call('save')
            ->assertHasNoErrors();

        $block = $page->refresh()->contentBlocks->sole();
        $this->assertSame($mine->content, $block->content);
        $this->assertBelongsToTenant($team, $block);
    }

    public function test_a_ready_made_preset_brings_its_own_layout_settings(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('addReadyMade__contentBlocks')->schemaComponent('contentBlocks'),
                ['selection' => 'preset:hero'],
            )
            ->call('save')
            ->assertHasNoErrors();

        $block = $page->refresh()->contentBlocks->first();

        $this->assertNotNull($block);
        $this->assertTrue($block->full_height);
        $this->assertSame('wide', $block->content_width);
        $this->assertSame('xl', $block->padding_size);
        $this->assertStringContainsString('A headline that says what you do', $block->renderContentHtml());
    }

    public function test_an_unknown_ready_made_design_is_refused(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(
                TestAction::make('addReadyMade__contentBlocks')->schemaComponent('contentBlocks'),
                ['selection' => 'preset:missing'],
            )
            ->assertHasActionErrors(['selection']);

        $this->assertSame(0, ContentBlock::count());
    }

    public function test_a_panel_without_a_tenant_lists_only_the_shared_library(): void
    {
        $team = Team::factory()->create();
        $teamBlock = SavedBlock::factory()->create(['name' => 'Team hero']);
        $teamBlock->tenant()->associate($team)->save();
        $shared = SavedBlock::factory()->create(['name' => 'Shared hero']);

        $this->actingAsAdmin();

        Livewire::test(ListSavedBlocks::class)
            ->assertCanSeeTableRecords([$shared])
            ->assertCanNotSeeTableRecords([$teamBlock]);

        $this->get(SavedBlockResource::getUrl('edit', ['record' => $teamBlock]))->assertNotFound();
    }
}
