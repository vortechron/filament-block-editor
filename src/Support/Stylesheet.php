<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Filament\Support\Assets\AssetManager;
use Filament\Support\Facades\FilamentAsset;
use LogicException;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorServiceProvider;

/**
 * Where the public page stylesheet (page.css) is linked from.
 *
 * With Filament installed the stylesheet is a Filament asset, so
 * `php artisan filament:assets` publishes it. Without Filament, or before
 * it is registered, the link points at the file
 * `vendor:publish --tag=filament-block-editor-assets` copies into public/.
 * Both land on the same file.
 */
final class Stylesheet
{
    public static function href(): string
    {
        if (class_exists(AssetManager::class) && app()->bound(AssetManager::class)) {
            try {
                return FilamentAsset::getStyleHref(
                    FilamentBlockEditorServiceProvider::PAGE_STYLESHEET,
                    package: FilamentBlockEditorServiceProvider::ASSET_PACKAGE,
                );
            } catch (LogicException) {
                // Not registered (yet): fall back to the published file.
            }
        }

        return asset(FilamentBlockEditorServiceProvider::PAGE_STYLESHEET_PATH);
    }
}
