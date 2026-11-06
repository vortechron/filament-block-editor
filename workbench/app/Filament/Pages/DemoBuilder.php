<?php

namespace Workbench\App\Filament\Pages;

use Vortechron\FilamentBlockEditor\Filament\Pages\PageBuilderPage;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Workbench\App\Support\SamplePage;

/**
 * The builder on the workbench panel: /admin/demo-builder. The page lives in
 * memory, which is enough for tests and a manual look.
 */
class DemoBuilder extends PageBuilderPage
{
    protected static ?string $slug = 'demo-builder';

    /** @var array<string, mixed>|null */
    public static ?array $saved = null;

    /** Tests flip this to check that every builder call asks first. */
    public static bool $denied = false;

    /** Tests flip this to save as a developer. */
    public static bool $developer = false;

    public static ?string $contentLocale = null;

    /** @var array<mixed> */
    public static array $languages = [];

    protected function getPageBuilderLanguages(): array
    {
        return self::$languages;
    }

    protected function getPageBuilderContentLocale(): string
    {
        return self::$contentLocale ?? parent::getPageBuilderContentLocale();
    }

    protected function authorizePageBuilder(): void
    {
        abort_if(self::$denied, 403);
    }

    protected function isPageBuilderDeveloper(): bool
    {
        return self::$developer;
    }

    protected static ?string $title = 'Demo page';

    protected function getPageBuilderValue(): array
    {
        return self::$saved ?? ['sections' => SamplePage::sections('ms')];
    }

    protected function savePageBuilderValue(array $value): void
    {
        self::$saved = $value;
    }

    protected function renderPageBuilderPreview(array $sections): string
    {
        return view('workbench::page', [
            'locale' => 'ms',
            'sections' => $sections,
            'context' => new RenderContext(forBuilder: true, isPreview: true),
        ])->render();
    }

    protected function getPageBuilderBackUrl(): ?string
    {
        return url('/admin');
    }
}
