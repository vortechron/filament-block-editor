<?php

namespace Vortechron\FilamentBlockEditor;

use Filament\Support\Assets\AssetManager;
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\Facades\Blade;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Content\NullSectionResolver;
use Vortechron\FilamentBlockEditor\Content\SectionResolver;
use Vortechron\FilamentBlockEditor\Design\DefaultKitSource;
use Vortechron\FilamentBlockEditor\Design\KitSource;

class FilamentBlockEditorServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-block-editor';

    public const ASSET_PACKAGE = 'vortechron/filament-block-editor';

    /**
     * Filament's asset id of the public page stylesheet.
     */
    public const PAGE_STYLESHEET = 'block-editor-page';

    /**
     * Where the stylesheet is published, relative to public/, by
     * `vendor:publish --tag=filament-block-editor-assets` and by
     * `php artisan filament:assets`.
     */
    public const PAGE_STYLESHEET_PATH = 'vendor/filament-block-editor/page.css';

    /**
     * Filament's asset ids and public paths of the page builder itself.
     */
    public const BUILDER_SCRIPT = 'page-builder';

    public const BUILDER_SCRIPT_PATH = 'vendor/filament-block-editor/page-builder.js';

    public const BUILDER_STYLESHEET = 'page-builder';

    public const BUILDER_STYLESHEET_PATH = 'vendor/filament-block-editor/page-builder.css';

    public function configurePackage(Package $package): void
    {
        $package
            ->name(static::$name)
            ->hasConfigFile()
            ->hasViews()
            ->hasTranslations();
    }

    public function packageRegistered(): void
    {
        // One registry for the whole app: hosts register their own blocks at boot.
        $this->app->singleton(BlockRegistry::class);

        // One registry of dynamic values (site.phone, ...): hosts register them at boot.
        $this->app->singleton(DynamicValues::class);

        // A host binds its own source (a stored kit); the override lasts one request.
        $this->app->scopedIf(KitSource::class, DefaultKitSource::class);

        // Hosts that store synced sections bind their own.
        $this->app->bindIf(SectionResolver::class, NullSectionResolver::class);
    }

    public function packageBooted(): void
    {
        Blade::anonymousComponentPath(__DIR__.'/../resources/views/components', 'filament-block-editor');

        if (class_exists(AssetManager::class) && $this->app->bound(AssetManager::class)) {
            FilamentAsset::register([
                // The public stylesheet, linked by <x-filament-block-editor::styles>.
                Css::make(self::PAGE_STYLESHEET, __DIR__.'/../resources/dist/page.css')
                    ->relativePublicPath(self::PAGE_STYLESHEET_PATH)
                    ->loadedOnRequest(),
                // The page builder, loaded only on builder pages.
                Js::make(self::BUILDER_SCRIPT, __DIR__.'/../resources/dist/page-builder.js')
                    ->module()
                    ->loadedOnRequest(),
                Css::make(self::BUILDER_STYLESHEET, __DIR__.'/../resources/dist/page-builder.css')
                    ->relativePublicPath(self::BUILDER_STYLESHEET_PATH)
                    ->loadedOnRequest(),
            ], package: self::ASSET_PACKAGE);
        }

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../resources/dist/page.css' => public_path(self::PAGE_STYLESHEET_PATH),
                __DIR__.'/../resources/dist/page-builder.js' => public_path(self::BUILDER_SCRIPT_PATH),
                __DIR__.'/../resources/dist/page-builder.css' => public_path(self::BUILDER_STYLESHEET_PATH),
            ], 'filament-block-editor-assets');
        }
    }
}
