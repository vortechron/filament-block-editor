<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Filament\Support\Assets\AssetManager;
use Filament\Support\Facades\FilamentAsset;
use LogicException;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorServiceProvider as Provider;

/**
 * Where the builder's script and stylesheet are served from: Filament's
 * asset manager when Filament is installed, else the files that
 * `vendor:publish --tag=filament-block-editor-assets` copies into public/.
 */
final class Assets
{
    public static function builderScriptUrl(): string
    {
        return self::filamentUrl(fn (): string => FilamentAsset::getScriptSrc(Provider::BUILDER_SCRIPT, Provider::ASSET_PACKAGE))
            ?? asset(Provider::BUILDER_SCRIPT_PATH);
    }

    public static function builderStyleUrl(): string
    {
        return self::filamentUrl(fn (): string => FilamentAsset::getStyleHref(Provider::BUILDER_STYLESHEET, Provider::ASSET_PACKAGE))
            ?? asset(Provider::BUILDER_STYLESHEET_PATH);
    }

    private static function filamentUrl(callable $resolve): ?string
    {
        if (! class_exists(AssetManager::class) || ! app()->bound(AssetManager::class)) {
            return null;
        }

        try {
            return $resolve();
        } catch (LogicException) {
            return null;
        }
    }
}
