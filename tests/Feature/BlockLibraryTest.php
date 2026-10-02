<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Filament\Actions\Action;
use Filament\Actions\Testing\TestAction;
use Filament\Facades\Filament;
use Filament\Support\Enums\SlideOverPosition;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Livewire\Livewire;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Vortechron\FilamentBlockEditor\Filament\Pages\MediaLibrary as MediaPage;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\EditSavedBlock;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\ListSavedBlocks;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockLibraryPicker;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Support\BlockLibrary;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Workbench\App\Filament\Resources\Pages\Pages\EditPage;
use Workbench\App\Models\Page;
use Workbench\App\Models\Team;

class BlockLibraryTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function poolIntro(): array
    {
        return [
            'name' => 'Pool intro',
            'background_color' => '#1e1b4b',
            'content' => [['type' => 'heading', 'props' => ['level' => 1], 'content' => [['type' => 'text', 'text' => 'Your new pool']]]],
        ];
    }

    public function test_saved_block_cards_in_the_shared_library_render_content_without_opening_the_editor(): void
    {
        $this->actingAsAdmin();
        $mine = SavedBlock::factory()->create($this->poolIntro());

        Livewire::test(ListSavedBlocks::class)
            ->assertCanSeeTableRecords([$mine])
            ->assertSee('Your new pool')
            ->assertSee('fbe-block-preview', false)
            ->assertSee('#1e1b4b', false)
            ->assertSee('Pool intro')
            ->searchTable('not a block')
            ->assertCanNotSeeTableRecords([$mine]);
    }

    public function test_saved_block_cards_show_only_the_open_teams_blocks(): void
    {
        $shared = SavedBlock::factory()->create(['name' => 'Shared block']);
        $theirs = SavedBlock::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Private block']);
        $team = $this->actingAsTeamMember();
        $mine = SavedBlock::factory()->create($this->poolIntro());

        $this->assertBelongsToTenant($team, $mine);

        Livewire::test(ListSavedBlocks::class)
            ->assertCanSeeTableRecords([$mine])
            ->assertCanNotSeeTableRecords([$theirs, $shared])
            ->assertSee('Your new pool')
            ->assertDontSee('Private block');
    }

    public function test_previews_keep_video_players_inert_and_escape_content(): void
    {
        $block = new SavedBlock([
            'background_type' => 'video', 'background_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'content' => [
                ['type' => 'video', 'props' => ['url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']],
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => '<script>alert(1)</script>']]],
            ],
        ]);
        $html = Blade::render('<x-filament-block-editor::preview :block="$block" />', ['block' => $block]);

        $this->assertStringNotContainsString('<iframe', $html);
        $this->assertStringNotContainsString('<video', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('Video background', $html);
        $this->assertStringContainsString('inert', $html);
    }

    public function test_library_search_and_pagination_work_in_the_shared_library(): void
    {
        $this->actingAsAdmin();
        $team = Team::factory()->create();
        SavedBlock::factory()->count(13)->create(['name' => 'Pool']);
        SavedBlock::factory()->archived()->create(['name' => 'Pool archived']);
        SavedBlock::factory()->for($team, 'tenant')->create(['name' => 'Pool private']);
        MediaAsset::factory()->create(['name' => 'Pool image']);
        MediaAsset::factory()->for($team, 'tenant')->create(['name' => 'Pool private image']);

        $this->assertCount(12, BlockLibrary::items(null, 'saved', 'Pool'));
        $this->assertCount(1, BlockLibrary::items(null, 'saved', 'Pool', 2));
        $this->assertCount(0, BlockLibrary::items(null, 'saved', 'missing'));
        $this->assertCount(1, BlockLibrary::items(null, 'media', 'Pool'));
        $this->assertCount(2, BlockLibrary::items(null, 'presets', 'hero'));
    }

    public function test_library_search_and_pagination_stay_within_the_team(): void
    {
        $other = Team::factory()->create();
        SavedBlock::factory()->create(['name' => 'Pool shared']);
        MediaAsset::factory()->create(['name' => 'Pool shared image']);
        SavedBlock::factory()->for($other, 'tenant')->create(['name' => 'Pool private']);
        MediaAsset::factory()->for($other, 'tenant')->create(['name' => 'Pool private image']);

        $team = $this->actingAsTeamMember();
        SavedBlock::factory()->count(13)->create(['name' => 'Pool']);
        SavedBlock::factory()->archived()->create(['name' => 'Pool archived']);
        MediaAsset::factory()->create(['name' => 'Pool image']);

        $this->assertCount(12, BlockLibrary::items($team, 'saved', 'Pool'));
        $this->assertCount(1, BlockLibrary::items($team, 'saved', 'Pool', 2));
        $this->assertCount(0, BlockLibrary::items($team, 'saved', 'missing'));
        $this->assertCount(1, BlockLibrary::items($team, 'media', 'Pool'));
        $this->assertCount(2, BlockLibrary::items($team, 'presets', 'hero'));
        $this->assertCount(1, BlockLibrary::items($other, 'saved', 'Pool'));
    }

    public function test_the_preset_search_matches_names_and_categories(): void
    {
        $values = fn (string $search): array => collect(BlockLibrary::items(null, 'presets', $search)->items())->pluck('value')->all();

        $this->assertSame(['preset:cta'], $values('action'));
        $this->assertSame(['preset:hero', 'preset:hero_split'], $values('hero'));
        $this->assertSame(['preset:cta', 'preset:terms', 'preset:next_steps'], $values('Closing sections'));
        $this->assertSame([], $values('no such design'));
    }

    public function test_the_shared_library_hands_out_its_own_saved_block_media_and_presets(): void
    {
        $saved = SavedBlock::factory()->create(['content' => [$this->paragraph('Shared welcome')]]);
        $asset = MediaAsset::factory()->create();

        $this->assertSame([$this->paragraph('Shared welcome')], BlockLibrary::attributes(null, 'saved:'.$saved->id)['content']);
        $this->assertSame($asset->url, BlockLibrary::attributes(null, 'media:'.$asset->id)['content'][0]['props']['url']);
        $this->assertSame(
            'A headline that says what you do',
            BlockLibrary::attributes(null, 'preset:hero')['content'][0]['content'][0]['text'],
        );
    }

    public function test_library_rejects_another_teams_saved_block(): void
    {
        $team = Team::factory()->create();
        $other = SavedBlock::factory()->for(Team::factory()->create(), 'tenant')->create();

        $this->expectException(ValidationException::class);
        BlockLibrary::attributes($team, 'saved:'.$other->id);
    }

    public function test_library_rejects_another_teams_media(): void
    {
        $team = Team::factory()->create();
        $other = MediaAsset::factory()->for(Team::factory()->create(), 'tenant')->create();

        $this->expectException(ValidationException::class);
        BlockLibrary::attributes($team, 'media:'.$other->id);
    }

    public function test_the_shared_library_and_a_teams_library_never_hand_out_each_others_items(): void
    {
        $team = Team::factory()->create();
        $sharedBlock = SavedBlock::factory()->create();
        $teamBlock = SavedBlock::factory()->for($team, 'tenant')->create();
        $sharedMedia = MediaAsset::factory()->create();
        $teamMedia = MediaAsset::factory()->for($team, 'tenant')->create();

        foreach ([
            [$team, 'saved:'.$sharedBlock->id],
            [null, 'saved:'.$teamBlock->id],
            [$team, 'media:'.$sharedMedia->id],
            [null, 'media:'.$teamMedia->id],
        ] as [$tenant, $selection]) {
            try {
                BlockLibrary::attributes($tenant, $selection);
                $this->fail("{$selection} must not cross libraries.");
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('selection', $exception->errors());
            }
        }

        $this->assertSame($teamBlock->content, BlockLibrary::attributes($team, 'saved:'.$teamBlock->id)['content']);
        $this->assertSame($teamMedia->url, BlockLibrary::attributes($team, 'media:'.$teamMedia->id)['content'][0]['props']['url']);
    }

    public function test_library_rejects_unknown_preset(): void
    {
        $this->expectException(ValidationException::class);
        BlockLibrary::attributes(null, 'preset:missing');
    }

    public function test_library_rejects_an_archived_saved_block(): void
    {
        $archived = SavedBlock::factory()->archived()->create();

        $this->expectException(ValidationException::class);
        BlockLibrary::attributes(null, 'saved:'.$archived->id);
    }

    public function test_media_insertion_keeps_existing_blocks_and_the_chosen_placement(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $existing = ContentBlock::factory()->for($page, 'blockable')->create();
        $asset = MediaAsset::factory()->create();
        $other = MediaAsset::factory()->for(Team::factory()->create(), 'tenant')->create();
        $action = TestAction::make('addMedia__contentBlocks')->schemaComponent('contentBlocks');

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($action, ['selection' => 'media:'.$other->id])->assertHasActionErrors(['selection']);

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction($action, ['selection' => 'media:'.$asset->id])->assertHasNoActionErrors()
            ->call('save')->assertHasNoErrors();

        $this->assertModelExists($existing);
        $blocks = $page->refresh()->contentBlocks;
        $this->assertCount(2, $blocks);
        $this->assertSame($existing->id, $blocks->first()->id);
        $this->assertSame($asset->url, $blocks->last()->content[0]['props']['url']);
        $this->assertSame('image', $blocks->last()->content[0]['type']);
    }

    public function test_the_top_media_menu_puts_the_picture_before_the_existing_blocks(): void
    {
        $this->actingAsAdmin();
        $page = Page::factory()->create();
        $existing = ContentBlock::factory()->for($page, 'blockable')->create();
        $asset = MediaAsset::factory()->create();

        Livewire::test(EditPage::class, ['record' => $page->getRouteKey()])
            ->callAction(TestAction::make('addMedia__contentBlocks_top')->schemaComponent('contentBlocks'), ['selection' => 'media:'.$asset->id])
            ->assertHasNoActionErrors()
            ->call('save')->assertHasNoErrors();

        $blocks = $page->refresh()->contentBlocks;
        $this->assertCount(2, $blocks);
        $this->assertSame('image', $blocks->first()->content[0]['type']);
        $this->assertSame($existing->id, $blocks->last()->id);
    }

    public function test_media_page_upload_search_rename_and_delete_in_the_shared_library(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();
        $other = MediaAsset::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Private photo']);

        Livewire::test(MediaPage::class)->callAction('upload', ['files' => [UploadedFile::fake()->image('Pool photo.jpg')]])
            ->assertHasNoActionErrors()->assertCanNotSeeTableRecords([$other]);
        $asset = MediaAsset::withoutGlobalScopes()->whereNull('tenant_id')->sole();
        Storage::disk('public')->assertExists($asset->path);
        $this->assertStringStartsWith('block-editor/shared/', $asset->path);

        Livewire::test(MediaPage::class)->callAction(TestAction::make('rename')->table($asset), ['name' => 'Summer pool'])
            ->assertHasNoActionErrors()->searchTable('Summer')->assertCanSeeTableRecords([$asset])
            ->callAction(TestAction::make('delete')->table($asset))->assertHasNoActionErrors();

        $this->assertModelMissing($asset);
        Storage::disk('public')->assertMissing($asset->path);
    }

    public function test_media_page_upload_search_rename_and_delete_stay_within_the_team(): void
    {
        Storage::fake('public');
        $team = $this->actingAsTeamMember();
        $other = MediaAsset::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Private photo']);

        Livewire::test(MediaPage::class)->callAction('upload', ['files' => [UploadedFile::fake()->image('Pool photo.jpg')]])
            ->assertHasNoActionErrors()->assertCanNotSeeTableRecords([$other]);
        $asset = MediaAsset::withoutGlobalScopes()->forTenant($team)->sole();
        Storage::disk('public')->assertExists($asset->path);
        $this->assertStringStartsWith('block-editor/'.$team->getKey().'/', $asset->path);

        Livewire::test(MediaPage::class)->callAction(TestAction::make('rename')->table($asset), ['name' => 'Summer pool'])
            ->assertHasNoActionErrors()->searchTable('Summer')->assertCanSeeTableRecords([$asset])
            ->callAction(TestAction::make('delete')->table($asset))->assertHasNoActionErrors();

        $this->assertModelMissing($asset);
        Storage::disk('public')->assertMissing($asset->path);
        $this->assertModelExists($other);
    }

    public function test_media_page_keeps_files_that_are_in_use(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();
        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
        SavedBlock::factory()->create(['background_image_path' => $asset->path]);

        Livewire::test(MediaPage::class)->callAction(TestAction::make('delete')->table($asset));

        $this->assertModelExists($asset);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_media_page_keeps_a_teams_files_that_are_in_use(): void
    {
        Storage::fake('public');
        $team = $this->actingAsTeamMember();
        $asset = app(MediaLibrary::class)->store($team, UploadedFile::fake()->image('pool.jpg'));
        SavedBlock::factory()->create(['background_image_path' => $asset->path]);

        Livewire::test(MediaPage::class)->callAction(TestAction::make('delete')->table($asset));

        $this->assertModelExists($asset);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_background_picker_reuses_an_existing_image(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();
        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
        $block = SavedBlock::factory()->create(['background_type' => 'image']);

        $this->pickBackgroundImage($block, $asset);

        $this->assertSame($asset->path, $block->refresh()->background_image_path);
    }

    public function test_background_picker_only_offers_the_open_teams_images(): void
    {
        Storage::fake('public');
        $team = $this->actingAsTeamMember();
        $mine = app(MediaLibrary::class)->store($team, UploadedFile::fake()->image('pool.jpg'));
        $theirs = MediaAsset::factory()->for(Team::factory()->create(), 'tenant')->create();
        $block = SavedBlock::factory()->create(['background_type' => 'image']);

        Livewire::test(EditSavedBlock::class, ['record' => $block->getRouteKey()])
            ->mountAction(TestAction::make('editStyle')->schemaComponent('savedBlock'))
            ->callAction(TestAction::make('chooseBackgroundImage')->schemaComponent('background_image_path', schema: 'mountedActionSchema0'), ['selection' => 'media:'.$theirs->id])
            ->assertHasActionErrors(['selection']);

        $this->pickBackgroundImage($block, $mine);

        $this->assertSame($mine->path, $block->refresh()->background_image_path);
    }

    public function test_pdfs_are_listed_on_the_media_page_but_never_offered_as_a_picture(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();
        $picture = MediaAsset::factory()->create(['name' => 'Pool image']);
        $pdf = MediaAsset::factory()->pdf()->create(['name' => 'Pool guide.pdf']);

        $this->assertSame([$picture->getKey()], collect(BlockLibrary::items(null, 'media', 'Pool')->items())
            ->map(fn (array $item): int => $item['media']->getKey())->all());

        try {
            BlockLibrary::attributes(null, 'media:'.$pdf->id);
            $this->fail('A PDF must not be dropped in as a picture.');
        } catch (ValidationException) {
            // Expected.
        }

        Livewire::test(MediaPage::class)
            ->assertCanSeeTableRecords([$picture, $pdf])
            ->filterTable('kind', 'document')
            ->assertCanSeeTableRecords([$pdf])
            ->assertCanNotSeeTableRecords([$picture])
            ->assertSee('PDF');

        Livewire::test(MediaPage::class)
            ->callAction('upload', ['files' => [UploadedFile::fake()->createWithContent('Tile guide.pdf', "%PDF-1.4\n%%EOF\n")]])
            ->assertHasNoActionErrors();

        $this->assertSame(1, MediaAsset::query()->where('name', 'Tile guide.pdf')->count());
    }

    public function test_library_sheet_enters_from_the_left(): void
    {
        $action = BlockLibraryPicker::sheet(Action::make('library'));
        $this->assertSame(SlideOverPosition::Start, $action->getModalSlideOverPosition());
    }

    public function test_the_picker_works_in_the_shared_library_without_a_tenant(): void
    {
        $this->actingAsAdmin();

        $this->assertNull(Filament::getTenant());
        $this->assertNull(BlockLibraryPicker::tenant());
    }

    public function test_the_picker_works_in_the_open_teams_library(): void
    {
        $team = $this->actingAsTeamMember();

        $this->assertTrue($team->is(BlockLibraryPicker::tenant()));
    }

    public function test_the_picker_refuses_a_team_the_person_does_not_belong_to(): void
    {
        $this->actingAsTeamMember();
        Filament::setTenant(Team::factory()->create(), isQuiet: true);

        try {
            BlockLibraryPicker::tenant();
            $this->fail('Somebody else\'s team must not open its library.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
    }

    private function pickBackgroundImage(SavedBlock $block, MediaAsset $asset): void
    {
        Livewire::test(EditSavedBlock::class, ['record' => $block->getRouteKey()])
            ->mountAction(TestAction::make('editStyle')->schemaComponent('savedBlock'))
            ->callAction(TestAction::make('chooseBackgroundImage')->schemaComponent('background_image_path', schema: 'mountedActionSchema0'), ['selection' => 'media:'.$asset->id])
            ->assertHasNoActionErrors()
            ->call('callMountedAction')
            ->call('save')->assertHasNoErrors();
    }
}
