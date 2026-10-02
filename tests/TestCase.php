<?php

namespace Vortechron\FilamentBlockEditor\Tests;

use BladeUI\Heroicons\BladeHeroiconsServiceProvider;
use BladeUI\Icons\BladeIconsServiceProvider;
use Filament\Actions\ActionsServiceProvider;
use Filament\Facades\Filament;
use Filament\FilamentServiceProvider;
use Filament\Forms\FormsServiceProvider;
use Filament\Infolists\InfolistsServiceProvider;
use Filament\Notifications\NotificationsServiceProvider;
use Filament\QueryBuilder\QueryBuilderServiceProvider;
use Filament\Schemas\SchemasServiceProvider;
use Filament\Support\SupportServiceProvider;
use Filament\Tables\TablesServiceProvider;
use Filament\Widgets\WidgetsServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Kirschbaum\PowerJoins\PowerJoinsServiceProvider;
use Livewire\LivewireServiceProvider;
use Orchestra\Testbench\Concerns\WithWorkbench;
use Orchestra\Testbench\TestCase as Orchestra;
use RyanChandler\BladeCaptureDirective\BladeCaptureDirectiveServiceProvider;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorServiceProvider;
use Vortechron\FilamentBlockEditor\Support\BlockPresetLibrary;
use Workbench\App\Models\Team;
use Workbench\App\Models\User;
use Workbench\App\Providers\Filament\AdminPanelProvider;
use Workbench\App\Providers\Filament\TeamPanelProvider;
use Workbench\App\Providers\WorkbenchServiceProvider;

/**
 * Boots the workbench app: an "admin" panel without tenancy (one shared
 * library) and a "team" panel where each Team has its own library.
 */
abstract class TestCase extends Orchestra
{
    use RefreshDatabase;
    use WithWorkbench;

    protected function tearDown(): void
    {
        BlockPresetLibrary::flushRegistered();

        parent::tearDown();
    }

    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            ActionsServiceProvider::class,
            BladeCaptureDirectiveServiceProvider::class,
            BladeHeroiconsServiceProvider::class,
            BladeIconsServiceProvider::class,
            FilamentServiceProvider::class,
            FormsServiceProvider::class,
            InfolistsServiceProvider::class,
            LivewireServiceProvider::class,
            NotificationsServiceProvider::class,
            PowerJoinsServiceProvider::class,
            QueryBuilderServiceProvider::class,
            SchemasServiceProvider::class,
            SupportServiceProvider::class,
            TablesServiceProvider::class,
            WidgetsServiceProvider::class,
            FilamentBlockEditorServiceProvider::class,
            WorkbenchServiceProvider::class,
            AdminPanelProvider::class,
            TeamPanelProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
        $app['config']->set('database.default', 'testing');
        $app['config']->set('filesystems.disks.public.url', '/storage');
    }

    /**
     * Sign in to the "admin" panel, which has no tenancy.
     */
    protected function actingAsAdmin(?User $user = null): User
    {
        $user ??= User::factory()->create();

        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::getCurrentPanel()->boot();

        return $user;
    }

    /**
     * Sign in to the "team" panel with the given team open.
     */
    protected function actingAsTeamMember(?Team $team = null, ?User $user = null): Team
    {
        $team ??= Team::factory()->create();
        $user ??= User::factory()->create();
        $user->teams()->syncWithoutDetaching([$team->getKey()]);

        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('team'));
        Filament::setTenant($team);
        Filament::getCurrentPanel()->boot();

        return $team;
    }

    /**
     * Sign in to the "admin" panel and open a team in it. The workbench only
     * registers the page resource on the admin panel, so this is how the page
     * builder is tested with a tenant open: the library code reads the open
     * tenant from Filament, whichever panel it is.
     */
    protected function actingAsAdminWithTeamOpen(?Team $team = null): Team
    {
        $team ??= Team::factory()->create();
        $user = $this->actingAsAdmin();
        $user->teams()->attach($team->getKey());
        Filament::setTenant($team, isQuiet: true);

        return $team;
    }

    /**
     * @return array<string, mixed>
     */
    protected function paragraph(string $text): array
    {
        return [
            'type' => 'paragraph',
            'props' => [],
            'content' => [['type' => 'text', 'text' => $text, 'styles' => []]],
        ];
    }

    protected function assertBelongsToTenant(?Model $tenant, Model $record): void
    {
        $record->refresh();

        $this->assertSame($tenant?->getMorphClass(), $record->tenant_type);
        $this->assertSame($tenant?->getKey(), $record->tenant_id);
    }
}
