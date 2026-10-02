<?php

namespace Vortechron\FilamentBlockEditor;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\Facades\Blade;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Vortechron\FilamentBlockEditor\Support\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\Support\BlockStyles;

class FilamentBlockEditorServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-block-editor';

    public const ASSET_PACKAGE = 'vortechron/filament-block-editor';

    public function configurePackage(Package $package): void
    {
        $package
            ->name(static::$name)
            ->hasConfigFile()
            ->hasViews();
    }

    public function packageRegistered(): void
    {
        // Scoped, never a singleton: the style cache must not outlive the
        // request (or, in tests, leak from one test into the next).
        $this->app->scoped(BlockStyles::class);
        $this->app->bind(BlockNoteRenderer::class);
    }

    public function packageBooted(): void
    {
        FilamentAsset::register([
            // The editor itself: React and BlockNote, loaded only where an
            // editor is shown.
            AlpineComponent::make('block-note-editor', __DIR__.'/../resources/dist/components/block-note-editor.js'),
            Css::make('blocknote', __DIR__.'/../resources/dist/blocknote.css')->loadedOnRequest(),
            // Library cards, colour swatches and block previews.
            Css::make('filament-block-editor', __DIR__.'/../resources/dist/filament-block-editor.css'),
            // The public stylesheet, linked by <x-filament-block-editor::styles>.
            Css::make('block-editor-page', __DIR__.'/../resources/dist/page.css')->loadedOnRequest(),
        ], package: self::ASSET_PACKAGE);

        Blade::anonymousComponentPath(__DIR__.'/../resources/views/components', 'filament-block-editor');

        if (config('filament-block-editor.run_migrations', true)) {
            $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        }

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../database/migrations' => database_path('migrations'),
            ], 'filament-block-editor-migrations');
        }
    }
}
