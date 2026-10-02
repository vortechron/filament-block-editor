<?php

namespace Workbench\Database\Seeders;

use Illuminate\Database\Seeder;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Support\BlockPresetLibrary;
use Workbench\App\Models\Page;
use Workbench\App\Models\Team;
use Workbench\App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Admin', 'password' => 'password'],
        );

        // The "team" panel (/team) has tenancy: each team has its own library.
        $team = Team::query()->updateOrCreate(['slug' => 'acme'], ['name' => 'Acme']);
        $user->teams()->syncWithoutDetaching([$team->getKey()]);

        BlockStyle::query()->updateOrCreate(['name' => 'Dark hero'], [
            'background_type' => 'color',
            'background_color' => '#1e1b4b',
            'padding_size' => 'xl',
            'content_width' => 'wide',
        ]);

        $page = Page::query()->updateOrCreate(['slug' => 'welcome'], ['title' => 'Welcome', 'summary' => []]);

        if ($page->contentBlocks()->exists()) {
            return;
        }

        foreach (['hero', 'features', 'stats', 'cta'] as $order => $preset) {
            $page->contentBlocks()->create([...BlockPresetLibrary::attributes($preset), 'sort_order' => $order]);
        }
    }
}
