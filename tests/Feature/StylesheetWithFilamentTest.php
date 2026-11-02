<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use BladeUI\Icons\BladeIconsServiceProvider;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\SupportServiceProvider;
use Illuminate\Support\Facades\Blade;
use Livewire\LivewireServiceProvider;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorServiceProvider;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

/**
 * With Filament's asset manager present, the stylesheet is a Filament asset.
 */
class StylesheetWithFilamentTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [BladeIconsServiceProvider::class, LivewireServiceProvider::class, SupportServiceProvider::class, FilamentBlockEditorServiceProvider::class];
    }

    public function test_the_stylesheet_is_registered_as_a_filament_asset_that_loads_only_on_request(): void
    {
        $style = collect(FilamentAsset::getStyles([FilamentBlockEditorServiceProvider::ASSET_PACKAGE]))
            ->first(fn ($asset) => $asset->getId() === FilamentBlockEditorServiceProvider::PAGE_STYLESHEET);

        $this->assertNotNull($style);
        $this->assertTrue($style->isLoadedOnRequest());
        $this->assertSame(FilamentBlockEditorServiceProvider::PAGE_STYLESHEET_PATH, $style->getRelativePublicPath());
    }

    public function test_the_styles_component_links_the_filament_asset(): void
    {
        $html = Blade::render('<x-filament-block-editor::styles />');

        $this->assertMatchesRegularExpression('~href="[^"]*/vendor/filament-block-editor/page\.css\?v=[^"]+"~', $html);
    }
}
