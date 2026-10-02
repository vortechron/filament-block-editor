<?php

namespace Vortechron\FilamentBlockEditor;

use Closure;
use Filament\Contracts\Plugin;
use Filament\Facades\Filament;
use Filament\Panel;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\HtmlString;
use UnitEnum;
use Vortechron\FilamentBlockEditor\Enums\BlockFont;
use Vortechron\FilamentBlockEditor\Filament\Pages\MediaLibrary;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\BlockStyleResource;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\SavedBlockResource;
use Vortechron\FilamentBlockEditor\Http\Controllers\MediaController;
use Vortechron\FilamentBlockEditor\Http\Controllers\UploadController;

/**
 * Add to a panel to use the block editor there:
 *
 *     ->plugin(FilamentBlockEditorPlugin::make())
 *
 * It registers the upload and media routes the editor talks to (behind the
 * panel's own sign-in and tenant checks), and the library screens: Saved
 * Blocks, Block Styles and Media.
 */
class FilamentBlockEditorPlugin implements Plugin
{
    public const ID = 'filament-block-editor';

    protected bool $hasSavedBlocks = true;

    protected bool $hasBlockStyles = true;

    protected bool $hasMediaLibrary = true;

    protected string|UnitEnum|Closure|null $navigationGroup = 'Content';

    protected ?Closure $canManageLibraryUsing = null;

    public static function make(): static
    {
        return app(static::class);
    }

    public function getId(): string
    {
        return self::ID;
    }

    /**
     * Show or hide the Saved Blocks screen. Saving and inserting saved blocks
     * from the page builder keeps working either way.
     */
    public function savedBlocks(bool $condition = true): static
    {
        $this->hasSavedBlocks = $condition;

        return $this;
    }

    /**
     * Show or hide the Block Styles screen.
     */
    public function blockStyles(bool $condition = true): static
    {
        $this->hasBlockStyles = $condition;

        return $this;
    }

    /**
     * Show or hide the Media screen. The editor's own media picker keeps
     * working either way.
     */
    public function mediaLibrary(bool $condition = true): static
    {
        $this->hasMediaLibrary = $condition;

        return $this;
    }

    public function navigationGroup(string|UnitEnum|Closure|null $group): static
    {
        $this->navigationGroup = $group;

        return $this;
    }

    /**
     * Who may open the library screens (Saved Blocks, Block Styles, Media).
     * Everyone who can edit a page can still use the library from the page
     * builder. Defaults to everyone signed in to the panel.
     */
    public function canManageLibraryUsing(?Closure $callback): static
    {
        $this->canManageLibraryUsing = $callback;

        return $this;
    }

    public function register(Panel $panel): void
    {
        $panel
            ->resources([
                ...($this->hasSavedBlocks ? [SavedBlockResource::class] : []),
                ...($this->hasBlockStyles ? [BlockStyleResource::class] : []),
            ])
            ->pages($this->hasMediaLibrary ? [MediaLibrary::class] : [])
            ->authenticatedTenantRoutes(function (): void {
                Route::post('block-editor/uploads', UploadController::class)
                    ->middleware('throttle:60,1')
                    ->name('block-editor.upload');

                Route::get('block-editor/media', MediaController::class)
                    ->name('block-editor.media');
            })
            // Declares every web font the font picker offers. The browser only
            // downloads a face once something on the page uses it.
            ->renderHook(PanelsRenderHook::HEAD_END, function (): HtmlString {
                $url = BlockFont::stylesheetUrl(BlockFont::cases());

                return new HtmlString($url === null ? '' : '<link rel="stylesheet" href="'.e($url).'">');
            });
    }

    public function boot(Panel $panel): void {}

    /**
     * The plugin on the panel in use, or null when that panel has not
     * registered it.
     */
    public static function current(): ?static
    {
        $panel = Filament::getCurrentOrDefaultPanel();

        if ($panel === null || ! $panel->hasPlugin(self::ID)) {
            return null;
        }

        /** @var static */
        return $panel->getPlugin(self::ID);
    }

    public static function canManageLibrary(): bool
    {
        $plugin = static::current();

        if ($plugin === null) {
            return false;
        }

        if ($plugin->canManageLibraryUsing === null) {
            return Filament::auth()->check();
        }

        return (bool) app()->call($plugin->canManageLibraryUsing);
    }

    public static function resolveNavigationGroup(): string|UnitEnum|null
    {
        $group = static::current()?->navigationGroup;

        return $group instanceof Closure ? app()->call($group) : $group;
    }

    /**
     * Links to the library screens this person may open, keyed by label.
     *
     * @return array<string, string>
     */
    public static function manageLinks(): array
    {
        $plugin = static::current();

        if ($plugin === null || ! static::canManageLibrary()) {
            return [];
        }

        return array_filter([
            'Manage saved blocks' => $plugin->hasSavedBlocks ? SavedBlockResource::getUrl() : null,
            'Manage media' => $plugin->hasMediaLibrary ? MediaLibrary::getUrl() : null,
        ]);
    }
}
