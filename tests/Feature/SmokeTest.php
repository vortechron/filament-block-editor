<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\ListSavedBlocks;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class SmokeTest extends TestCase
{
    public function test_the_saved_blocks_page_lists_the_shared_library(): void
    {
        $this->actingAsAdmin();
        $block = SavedBlock::factory()->create(['name' => 'Hero']);

        Livewire::test(ListSavedBlocks::class)->assertCanSeeTableRecords([$block]);
    }

    public function test_each_team_sees_only_its_own_saved_blocks(): void
    {
        $team = $this->actingAsTeamMember();
        $mine = SavedBlock::factory()->create(['name' => 'Mine']);
        $theirs = SavedBlock::withoutGlobalScopes()->forceCreate(['name' => 'Theirs', 'uuid' => (string) str()->uuid(), 'tenant_type' => $team->getMorphClass(), 'tenant_id' => $team->getKey() + 100]);

        $this->assertBelongsToTenant($team, $mine);

        Livewire::test(ListSavedBlocks::class)
            ->assertCanSeeTableRecords([$mine])
            ->assertCanNotSeeTableRecords([$theirs]);
    }
}
