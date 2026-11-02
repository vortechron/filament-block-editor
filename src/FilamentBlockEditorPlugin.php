<?php

namespace Vortechron\FilamentBlockEditor;

use Filament\Contracts\Plugin;
use Filament\Panel;

/**
 * Add to a panel that has page builder pages. The builder's assets are
 * registered by the service provider and load only on builder pages, so the
 * plugin itself has nothing to set up yet; it marks the panel and gives
 * future options one home.
 *
 *     ->plugin(FilamentBlockEditorPlugin::make())
 */
class FilamentBlockEditorPlugin implements Plugin
{
    public const ID = 'filament-block-editor';

    public static function make(): static
    {
        return app(static::class);
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function register(Panel $panel): void {}

    public function boot(Panel $panel): void {}
}
