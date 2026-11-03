<?php

namespace Workbench\App\Filament\Pages;

use Illuminate\Validation\ValidationException;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Filament\Pages\PageBuilderPage;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * A builder page that overrides every format 2 hook: /admin/full-demo-builder.
 * Tests read what each hook got from the static properties.
 */
class FullDemoBuilder extends PageBuilderPage
{
    protected static ?string $slug = 'full-demo-builder';

    protected static ?string $title = 'Full demo';

    public static bool $denied = false;

    public static bool $developer = false;

    /** @var array<string, mixed> */
    public static array $calls = [];

    public static function forgetCalls(): void
    {
        self::$denied = false;
        self::$developer = false;
        self::$calls = [];
    }

    protected function authorizePageBuilder(): void
    {
        abort_if(self::$denied, 403);
    }

    protected function isPageBuilderDeveloper(): bool
    {
        return self::$developer;
    }

    protected function getPageBuilderValue(): array
    {
        // A bare list: an old host's value still works.
        return [['id' => 'one', 'type' => 'rich', 'data' => ['document' => []]]];
    }

    protected function savePageBuilderValue(array $value): void
    {
        self::$calls['value'] = $value;
    }

    protected function renderPageBuilderPreview(array $sections): string
    {
        return view('workbench::preview', ['sections' => $sections, 'context' => new RenderContext(forBuilder: true, isPreview: true)])->render();
    }

    protected function getPageBuilderKit(): ?array
    {
        return ['colors' => ['primary' => '#c59d6e', 'text' => 'nonsense']];
    }

    protected function savePageBuilderKit(array $kit): void
    {
        self::$calls['kit'] = $kit;
    }

    protected function savePageBuilderSection(array $section, string $title, bool $synced): array
    {
        self::$calls['section'] = [$section, $title, $synced];

        return ['ok' => true, 'id' => 41, 'template' => $synced ? null : ['key' => 'saved-41', 'label' => $title, 'category' => 'saved', 'section' => $section]];
    }

    protected function getPageBuilderSiteInfo(): ?array
    {
        return [
            'groups' => [['key' => 'contact', 'label' => 'Hubungan', 'fields' => [Field::text('phone')->label('Telefon'), ['name' => 'email', 'type' => 'text']]]],
            'values' => ['contact' => ['phone' => '012', 'email' => 'a@b.c']],
        ];
    }

    protected function savePageBuilderSiteInfo(array $values): void
    {
        if (($values['contact']['phone'] ?? null) === 'bad') {
            throw ValidationException::withMessages(['contact.phone' => 'Telefon tidak sah.']);
        }

        self::$calls['siteInfo'] = $values;
    }

    protected function getPageBuilderSyncedSections(): array
    {
        return [
            ['id' => 7, 'title' => 'Header', 'editUrl' => '/admin/sections/7', 'section' => ['type' => 'rich', 'data' => ['padding' => 'huge']]],
            ['id' => 8, 'title' => 'Not a section', 'section' => 'junk'],
        ];
    }

    protected function getPageBuilderParts(): array
    {
        return [['key' => 'header', 'title' => 'Header', 'editUrl' => '/admin/parts/header']];
    }

    protected function getPageBuilderKind(): string
    {
        return 'header';
    }

    protected function getPageBuilderDynamicValues(): array
    {
        return [
            ['key' => 'page.title', 'label' => 'Tajuk halaman', 'type' => 'text', 'group' => 'Halaman'],
            ['key' => 'site.phone', 'label' => 'Nombor kedai', 'type' => 'text', 'settings' => 'contact'],
            ['key' => 'Not A Key', 'label' => 'Rosak', 'type' => 'text'],
            ['key' => 'page.url', 'label' => 'Pautan', 'type' => 'video'],
        ];
    }

    /**
     * What getPageBuilderPreviewContext() holds, for the tests.
     *
     * @return array<string, mixed>
     */
    public function previewContextValues(): array
    {
        return $this->getPageBuilderPreviewContext()->values;
    }

    protected function getPageBuilderRenderValues(): array
    {
        return ['page.title' => 'Laman Utama', 'site.phone' => '019'];
    }
}
