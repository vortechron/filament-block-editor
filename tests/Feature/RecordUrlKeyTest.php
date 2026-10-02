<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\BlockStyleResource;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\SavedBlockResource;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Workbench\App\Models\Team;
use Workbench\App\Models\User;

/**
 * Panel addresses carry a random UUID, never the row number. A number such
 * as /saved-blocks/2 tells anyone watching a shared screen how many saved
 * blocks the whole app holds.
 */
class RecordUrlKeyTest extends TestCase
{
    private Team $team;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create();
    }

    /**
     * @return array<string, array{0: class-string<Model>, 1: string}>
     */
    public static function recordPages(): array
    {
        return [
            'saved block edit' => [SavedBlock::class, '/saved-blocks/%s/edit'],
            'block style edit' => [BlockStyle::class, '/block-styles/%s/edit'],
        ];
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    #[DataProvider('recordPages')]
    public function test_a_record_page_in_the_admin_panel_is_addressed_by_its_uuid_not_its_number(string $modelClass, string $path): void
    {
        $record = $modelClass::factory()->create();
        $this->actingAs(User::factory()->create());

        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/', (string) $record->getAttribute('uuid'));
        $this->assertSame($record->getAttribute('uuid'), $record->getRouteKey());

        $this->get('/admin'.sprintf($path, $record->getRouteKey()))->assertOk();
        $this->get('/admin'.sprintf($path, $record->getKey()))->assertNotFound();
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    #[DataProvider('recordPages')]
    public function test_a_record_page_in_the_team_panel_is_addressed_by_its_uuid_not_its_number(string $modelClass, string $path): void
    {
        $record = $modelClass::factory()->for($this->team, 'tenant')->create();
        $this->actingAs($this->memberOf($this->team));

        $this->get("/team/{$this->team->slug}".sprintf($path, $record->getRouteKey()))->assertOk();
        $this->get("/team/{$this->team->slug}".sprintf($path, $record->getKey()))->assertNotFound();
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    #[DataProvider('recordPages')]
    public function test_another_teams_uuid_is_not_found(string $modelClass, string $path): void
    {
        $foreign = $modelClass::factory()->for(Team::factory()->create(), 'tenant')->create();
        $shared = $modelClass::factory()->create();
        $this->actingAs($this->memberOf($this->team));

        $this->get("/team/{$this->team->slug}".sprintf($path, $foreign->getRouteKey()))->assertNotFound();
        $this->get("/team/{$this->team->slug}".sprintf($path, $shared->getRouteKey()))->assertNotFound();
    }

    public function test_links_built_from_a_record_carry_its_uuid(): void
    {
        $this->actingAsAdmin();
        $block = SavedBlock::factory()->create();
        $style = BlockStyle::factory()->create();

        $this->assertStringEndsWith("/admin/saved-blocks/{$block->uuid}/edit", SavedBlockResource::getUrl('edit', ['record' => $block]));
        $this->assertStringEndsWith("/admin/block-styles/{$style->uuid}/edit", BlockStyleResource::getUrl('edit', ['record' => $style]));
    }

    public function test_links_in_a_team_panel_carry_the_uuid_and_the_team(): void
    {
        $team = $this->actingAsTeamMember($this->team);
        $block = SavedBlock::factory()->create();

        $this->assertStringEndsWith(
            "/team/{$team->slug}/saved-blocks/{$block->uuid}/edit",
            SavedBlockResource::getUrl('edit', ['record' => $block], tenant: $team),
        );
    }

    public function test_a_copy_gets_its_own_uuid(): void
    {
        $block = SavedBlock::factory()->create();
        $style = BlockStyle::factory()->create();

        $blockCopy = tap($block->replicate())->save();
        $styleCopy = tap($style->replicate())->save();

        $this->assertNotNull($blockCopy->uuid);
        $this->assertNotNull($styleCopy->uuid);
        $this->assertNotSame($block->uuid, $blockCopy->uuid);
        $this->assertNotSame($style->uuid, $styleCopy->uuid);
    }

    public function test_the_uuid_cannot_be_mass_assigned(): void
    {
        $block = SavedBlock::factory()->create();
        $style = BlockStyle::factory()->create();
        $originalBlock = $block->uuid;
        $originalStyle = $style->uuid;

        $block->update(['uuid' => '00000000-0000-7000-8000-000000000000']);
        $style->update(['uuid' => '00000000-0000-7000-8000-000000000000']);

        $this->assertSame($originalBlock, $block->fresh()->uuid);
        $this->assertSame($originalStyle, $style->fresh()->uuid);
    }

    public function test_every_record_has_a_unique_uuid_and_the_old_ulid_column_is_gone(): void
    {
        foreach (['block_editor_saved_blocks', 'block_editor_styles'] as $table) {
            $this->assertTrue(Schema::hasColumn($table, 'uuid'), $table);
            $this->assertFalse(Schema::hasColumn($table, 'ulid'), $table);
        }

        $uuids = SavedBlock::factory()->count(3)->create()->pluck('uuid');

        $this->assertCount(3, $uuids->unique());
    }

    private function memberOf(Team $team): User
    {
        $user = User::factory()->create();
        $user->teams()->attach($team->getKey());

        return $user;
    }
}
