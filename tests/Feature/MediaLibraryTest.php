<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Workbench\App\Models\Page;
use Workbench\App\Models\Team;
use Workbench\App\Models\User;

class MediaLibraryTest extends TestCase
{
    /** A one pixel PNG. */
    private const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private Team $team;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->team = Team::factory()->create();
        $this->user = User::factory()->create();
        $this->user->teams()->attach($this->team->getKey());
    }

    private function uploadUrl(?Team $team = null): string
    {
        return $team === null
            ? route('filament.admin.block-editor.upload')
            : route('filament.team.block-editor.upload', ['tenant' => $team->slug]);
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function mediaUrl(?Team $team = null, array $query = []): string
    {
        return $team === null
            ? route('filament.admin.block-editor.media', $query)
            : route('filament.team.block-editor.media', ['tenant' => $team->slug, ...$query]);
    }

    public function test_an_upload_in_the_admin_panel_is_indexed_in_the_shared_library_with_a_random_filename(): void
    {
        $response = $this->actingAs($this->user)->postJson($this->uploadUrl(), [
            'file' => UploadedFile::fake()->image('My pool.jpg'),
        ])->assertOk()->assertJsonPath('asset.name', 'My pool.jpg')->assertJsonPath('asset.is_video', false);

        $asset = MediaAsset::withoutGlobalScopes()->findOrFail($response->json('asset.id'));
        $this->assertBelongsToTenant(null, $asset);
        $this->assertStringStartsWith('block-editor/shared/', $asset->path);
        $this->assertStringNotContainsString('My pool', $asset->path);
        $this->assertSame($asset->url, $response->json('url'));
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_an_upload_in_the_team_panel_is_indexed_in_that_teams_library(): void
    {
        $response = $this->actingAs($this->user)->postJson($this->uploadUrl($this->team), [
            'file' => UploadedFile::fake()->image('My pool.jpg'),
        ])->assertOk()->assertJsonPath('asset.name', 'My pool.jpg');

        $asset = MediaAsset::withoutGlobalScopes()->findOrFail($response->json('asset.id'));
        $this->assertBelongsToTenant($this->team, $asset);
        $this->assertStringStartsWith('block-editor/'.$this->team->getKey().'/', $asset->path);
        $this->assertStringNotContainsString('My pool', $asset->path);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_uploads_and_listing_need_a_signed_in_user(): void
    {
        $this->getJson($this->mediaUrl())->assertUnauthorized();
        $this->postJson($this->uploadUrl())->assertUnauthorized();
        $this->getJson($this->mediaUrl($this->team))->assertUnauthorized();
        $this->postJson($this->uploadUrl($this->team))->assertUnauthorized();

        $this->assertSame(0, MediaAsset::count());
    }

    public function test_uploads_and_listing_require_membership_in_the_route_team(): void
    {
        $otherTeam = Team::factory()->create();

        $this->actingAs($this->user)->getJson($this->mediaUrl($otherTeam))->assertNotFound();
        $this->postJson($this->uploadUrl($otherTeam), [
            'file' => UploadedFile::fake()->image('pool.jpg'),
        ])->assertNotFound();

        $this->assertSame(0, MediaAsset::withoutGlobalScopes()->count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_invalid_and_oversized_uploads_do_not_create_assets(): void
    {
        $this->actingAs($this->user);

        foreach ([$this->uploadUrl(), $this->uploadUrl($this->team)] as $url) {
            foreach ([UploadedFile::fake()->create('unsafe.svg', 1, 'image/svg+xml'), UploadedFile::fake()->image('huge.jpg')->size(20481)] as $file) {
                $this->postJson($url, ['file' => $file])
                    ->assertUnprocessable()->assertJsonValidationErrors('file');
            }
        }

        $this->assertSame(0, MediaAsset::withoutGlobalScopes()->count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_the_upload_size_limit_follows_the_config(): void
    {
        config(['filament-block-editor.max_upload_size' => 100]);

        $this->actingAs($this->user)->postJson($this->uploadUrl(), ['file' => UploadedFile::fake()->image('big.jpg')->size(101)])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->postJson($this->uploadUrl(), ['file' => UploadedFile::fake()->image('small.jpg')->size(99)])->assertOk();
    }

    public function test_uploads_go_to_the_configured_disk_and_directory(): void
    {
        Storage::fake('media');
        config(['filament-block-editor.disk' => 'media', 'filament-block-editor.directory' => 'site-media']);

        $response = $this->actingAs($this->user)->postJson($this->uploadUrl(), ['file' => UploadedFile::fake()->image('pool.jpg')])->assertOk();

        $asset = MediaAsset::withoutGlobalScopes()->findOrFail($response->json('asset.id'));
        $this->assertSame('media', $asset->disk);
        $this->assertStringStartsWith('site-media/shared/', $asset->path);
        Storage::disk('media')->assertExists($asset->path);
        Storage::disk('public')->assertMissing($asset->path);
    }

    public function test_video_uploads_are_available_in_the_library(): void
    {
        $response = $this->actingAs($this->user)->postJson($this->uploadUrl(), [
            'file' => UploadedFile::fake()->create('Pool tour.mp4', 1024, 'video/mp4'),
        ])->assertOk()->assertJsonPath('asset.is_video', true)->assertJsonPath('asset.mime_type', 'video/mp4');

        Storage::disk('public')->assertExists($response->json('asset.path'));
    }

    public function test_a_pdf_upload_is_stored_as_a_document(): void
    {
        $pdf = UploadedFile::fake()->createWithContent('Tile guide.pdf', "%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n");

        $response = $this->actingAs($this->user)->postJson($this->uploadUrl(), ['file' => $pdf])
            ->assertOk()
            ->assertJsonPath('asset.kind', 'document')
            ->assertJsonPath('asset.mime_type', 'application/pdf');

        Storage::disk('public')->assertExists($response->json('asset.path'));
    }

    public function test_an_identical_file_is_found_as_a_duplicate_and_a_different_one_is_not(): void
    {
        $library = app(MediaLibrary::class);
        $stored = $library->store(null, UploadedFile::fake()->createWithContent('a.png', base64_decode(self::PNG_BASE64)));

        $this->assertTrue($stored->is($library->findDuplicate(null, UploadedFile::fake()->createWithContent('b.png', base64_decode(self::PNG_BASE64)))));
        $this->assertNull($library->findDuplicate(null, UploadedFile::fake()->image('other.png', 3, 3)));
        $this->assertNull($library->findDuplicate($this->team, UploadedFile::fake()->createWithContent('c.png', base64_decode(self::PNG_BASE64))));
    }

    public function test_a_duplicate_is_only_found_inside_the_same_team(): void
    {
        $library = app(MediaLibrary::class);
        $stored = $library->store($this->team, UploadedFile::fake()->createWithContent('a.png', base64_decode(self::PNG_BASE64)));

        $this->assertTrue($stored->is($library->findDuplicate($this->team, UploadedFile::fake()->createWithContent('b.png', base64_decode(self::PNG_BASE64)))));
        $this->assertNull($library->findDuplicate(Team::factory()->create(), UploadedFile::fake()->createWithContent('c.png', base64_decode(self::PNG_BASE64))));
        $this->assertNull($library->findDuplicate(null, UploadedFile::fake()->createWithContent('d.png', base64_decode(self::PNG_BASE64))));
    }

    public function test_service_calls_cannot_bypass_supported_file_validation(): void
    {
        try {
            app(MediaLibrary::class)->store(null, UploadedFile::fake()->create('script.php', 1, 'text/x-php'));
            $this->fail('The media service must reject unsupported files.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('file', $exception->errors());
        }

        $this->assertSame(0, MediaAsset::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_a_failed_asset_record_removes_the_newly_uploaded_file(): void
    {
        MediaAsset::creating(function (): void {
            throw new RuntimeException('Database write failed');
        });

        try {
            app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
            $this->fail('The failed model write must be reported.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Database write failed', $exception->getMessage());
        }

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_reusing_a_temporary_upload_never_overwrites_an_existing_asset(): void
    {
        $library = app(MediaLibrary::class);
        $file = UploadedFile::fake()->image('pool.jpg');
        $first = $library->store(null, $file);
        $second = $library->store(null, $file);

        $this->assertNotSame($first->path, $second->path);
        Storage::disk('public')->assertExists([$first->path, $second->path]);
        $this->assertSame(2, MediaAsset::count());
    }

    public function test_listing_in_the_shared_library_is_searchable_and_filterable(): void
    {
        $image = MediaAsset::factory()->create(['name' => 'Pool image']);
        MediaAsset::factory()->video()->create(['name' => 'Pool video']);
        MediaAsset::factory()->create(['name' => 'Garden']);
        MediaAsset::factory()->for($this->team, 'tenant')->create(['name' => 'Private pool image']);

        $this->actingAs($this->user)->getJson($this->mediaUrl(null, [
            'search' => 'Pool',
            'kind' => 'image',
        ]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $image->id)->assertJsonPath('per_page', 24);

        $this->getJson($this->mediaUrl(null, ['kind' => 'video']))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_video', true);
    }

    public function test_listing_is_team_scoped_searchable_and_filterable(): void
    {
        $image = MediaAsset::factory()->for($this->team, 'tenant')->create(['name' => 'Pool image']);
        MediaAsset::factory()->for($this->team, 'tenant')->video()->create(['name' => 'Pool video']);
        MediaAsset::factory()->for($this->team, 'tenant')->create(['name' => 'Garden']);
        MediaAsset::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Private pool image']);
        MediaAsset::factory()->create(['name' => 'Shared pool image']);

        $this->actingAs($this->user)->getJson($this->mediaUrl($this->team, [
            'search' => 'Pool',
            'kind' => 'image',
        ]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $image->id)->assertJsonPath('per_page', 24);

        $this->getJson($this->mediaUrl($this->team))->assertOk()->assertJsonCount(3, 'data');
        $this->getJson($this->mediaUrl($this->team, ['kind' => 'video']))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_video', true);
    }

    public function test_the_listing_rejects_an_unknown_kind(): void
    {
        $this->actingAs($this->user)->getJson($this->mediaUrl(null, ['kind' => 'audio']))
            ->assertUnprocessable()->assertJsonValidationErrors('kind');
    }

    public function test_listing_paginates_and_does_not_import_existing_files(): void
    {
        MediaAsset::factory()->count(26)->create();
        SavedBlock::factory()->create(['background_image_path' => $this->existingImage('legacy.jpg')]);

        $this->actingAs($this->user)->getJson($this->mediaUrl())
            ->assertOk()->assertJsonCount(24, 'data')->assertJsonPath('total', 26)->assertJsonPath('last_page', 2);
        $this->getJson($this->mediaUrl(null, ['page' => 2]))
            ->assertOk()->assertJsonCount(2, 'data');

        $this->assertSame(26, MediaAsset::count());
    }

    public function test_import_indexes_only_owned_references_once_including_nested_content_and_archived_items(): void
    {
        $nestedPath = $this->existingImage('blocks/nested image.jpg');
        $backgroundPath = $this->existingImage('blocks/background.jpg');
        $stylePath = $this->existingImage('styles/dark.jpg');
        $pageBlockPath = $this->existingImage('blocks/header.jpg');
        $unrelatedPath = $this->existingImage('blocks/unreferenced.jpg');
        $otherPath = $this->existingImage('blocks/other-team.jpg');

        SavedBlock::factory()->archived()->create([
            'background_image_path' => $backgroundPath,
            'content' => [['type' => 'columnList', 'children' => [['type' => 'column', 'children' => [['type' => 'image', 'props' => ['url' => Storage::url($nestedPath)]]]]]]],
        ]);
        BlockStyle::factory()->archived()->create(['background_image_path' => $stylePath]);
        ContentBlock::factory()->for(Page::factory()->create(), 'blockable')->create(['background_image_path' => $pageBlockPath]);
        SavedBlock::factory()->for($this->team, 'tenant')->create(['background_image_path' => $otherPath]);

        $library = app(MediaLibrary::class);
        $this->assertSame(4, $library->importExisting(null));
        $this->assertSame(0, $library->importExisting(null));
        $this->assertEqualsCanonicalizing([$nestedPath, $backgroundPath, $stylePath, $pageBlockPath], MediaAsset::pluck('path')->all());
        Storage::disk('public')->assertExists([$unrelatedPath, $otherPath]);
    }

    public function test_import_for_a_team_indexes_only_that_teams_references(): void
    {
        $mine = $this->existingImage('blocks/mine.jpg');
        $mineOnAPage = $this->existingImage('blocks/mine-on-a-page.jpg');
        $theirs = $this->existingImage('blocks/theirs.jpg');
        $shared = $this->existingImage('blocks/shared.jpg');
        $otherTeam = Team::factory()->create();

        SavedBlock::factory()->for($this->team, 'tenant')->create(['background_image_path' => $mine]);
        SavedBlock::factory()->for($otherTeam, 'tenant')->create(['background_image_path' => $theirs]);
        SavedBlock::factory()->create(['background_image_path' => $shared]);
        $this->actingAsTeamMember($this->team);
        ContentBlock::factory()->for(Page::factory()->create(), 'blockable')->create(['background_image_path' => $mineOnAPage]);

        $library = app(MediaLibrary::class);
        $this->assertSame(2, $library->importExisting($this->team));
        $this->assertSame(0, $library->importExisting($this->team));
        $this->assertEqualsCanonicalizing([$mine, $mineOnAPage], MediaAsset::withoutGlobalScopes()->forTenant($this->team)->pluck('path')->all());
        $this->assertSame(0, MediaAsset::withoutGlobalScopes()->forTenant($otherTeam)->count());
        $this->assertSame(0, MediaAsset::withoutGlobalScopes()->forTenant(null)->count());
    }

    public function test_import_ignores_remote_missing_traversal_and_non_media_files(): void
    {
        $imagePath = $this->existingImage('blocks/pool.jpg');
        Storage::disk('public')->put('blocks/text.txt', 'ordinary text');
        SavedBlock::factory()->create([
            'background_image_path' => '../blocks/pool.jpg',
            'content' => [
                ['type' => 'image', 'props' => ['url' => 'https://other.example/storage/'.$imagePath]],
                ['type' => 'image', 'props' => ['url' => '/storage/%2e%2e/blocks/pool.jpg']],
                ['type' => 'image', 'props' => ['url' => '/storage/missing.jpg']],
                ['type' => 'image', 'props' => ['url' => '/storage/blocks/text.txt']],
            ],
        ]);

        $this->assertSame(0, app(MediaLibrary::class)->importExisting(null));
        $this->assertSame(0, MediaAsset::count());
    }

    public function test_usages_include_archived_blocks_block_styles_and_page_blocks(): void
    {
        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
        SavedBlock::factory()->archived()->create(['name' => 'Old pool', 'background_image_path' => $asset->path]);
        BlockStyle::factory()->create(['name' => 'Dark hero', 'background_image_path' => $asset->path]);
        $page = Page::factory()->create(['title' => 'Pool page']);
        ContentBlock::factory()->for($page, 'blockable')->create(['background_video_url' => $asset->url]);

        $usages = app(MediaLibrary::class)->usages($asset);
        $this->assertContains('Saved block: Old pool (archived)', $usages);
        $this->assertContains('Block style: Dark hero', $usages);
        $this->assertContains('Page: Pool page', $usages);
    }

    public function test_usages_find_a_picture_inside_a_blocks_content(): void
    {
        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
        $page = Page::factory()->create(['title' => 'Pool page']);
        ContentBlock::factory()->for($page, 'blockable')->create(['content' => [['type' => 'image', 'props' => ['url' => $asset->url]]]]);

        $this->assertSame(['Page: Pool page'], app(MediaLibrary::class)->usages($asset));
    }

    public function test_usage_checks_across_teams_without_exposing_names(): void
    {
        $asset = app(MediaLibrary::class)->store($this->team, UploadedFile::fake()->image('pool.jpg'));
        SavedBlock::factory()->for(Team::factory()->create(), 'tenant')->create(['name' => 'Secret other team block', 'content' => [['type' => 'image', 'props' => ['url' => $asset->url]]]]);

        $this->assertSame(['Content in another team'], app(MediaLibrary::class)->usages($asset));

        try {
            app(MediaLibrary::class)->delete($asset);
            $this->fail('An asset used by another team must not be deleted.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('media', $exception->errors());
        }

        $this->assertModelExists($asset);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_a_shared_file_used_by_a_team_cannot_be_deleted(): void
    {
        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
        SavedBlock::factory()->for($this->team, 'tenant')->create(['name' => 'Secret team block', 'background_image_path' => $asset->path]);

        $this->assertSame(['Content in another team'], app(MediaLibrary::class)->usages($asset));
        $this->expectException(ValidationException::class);
        app(MediaLibrary::class)->delete($asset);
    }

    public function test_an_asset_record_sharing_a_file_prevents_file_deletion(): void
    {
        $asset = app(MediaLibrary::class)->store(null, UploadedFile::fake()->image('pool.jpg'));
        MediaAsset::factory()->for($this->team, 'tenant')->create(['path' => $asset->path]);

        $this->assertSame(['Another media library entry'], app(MediaLibrary::class)->usages($asset));
        $this->expectException(ValidationException::class);
        app(MediaLibrary::class)->delete($asset);
    }

    public function test_unused_assets_and_missing_files_can_be_deleted(): void
    {
        $library = app(MediaLibrary::class);
        $asset = $library->store(null, UploadedFile::fake()->image('pool.jpg'));
        $library->delete($asset);

        $this->assertModelMissing($asset);
        Storage::disk('public')->assertMissing($asset->path);

        $missing = MediaAsset::factory()->create();
        $library->delete($missing);
        $this->assertModelMissing($missing);
    }

    public function test_deleting_a_teams_asset_leaves_other_teams_files_alone(): void
    {
        $library = app(MediaLibrary::class);
        $mine = $library->store($this->team, UploadedFile::fake()->image('pool.jpg'));
        $theirs = $library->store(Team::factory()->create(), UploadedFile::fake()->image('pool.jpg'));

        $library->delete($mine);

        $this->assertModelMissing($mine);
        $this->assertModelExists($theirs);
        Storage::disk('public')->assertExists($theirs->path);
    }

    private function existingImage(string $path): string
    {
        Storage::disk('public')->put($path, UploadedFile::fake()->image(basename($path))->getContent());

        return $path;
    }
}
