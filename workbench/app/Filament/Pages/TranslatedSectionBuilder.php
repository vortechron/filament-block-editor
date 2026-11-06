<?php

namespace Workbench\App\Filament\Pages;

class TranslatedSectionBuilder extends DemoBuilder
{
    public static array $sectionCalls = [];

    protected function getPageBuilderContentLocale(): string
    {
        return 'en';
    }

    protected function getPageBuilderFieldLanguages(): array
    {
        return ['defaultLocale' => 'ms', 'locales' => [['locale' => 'ms', 'label' => 'Bahasa Melayu'], ['locale' => 'en', 'label' => 'English']]];
    }

    protected function getPageBuilderSyncedSections(): array
    {
        $saved = self::$sectionCalls[0] ?? null;

        return $saved === null ? [] : [['id' => 72, ...$saved]];
    }

    protected function savePageBuilderSectionTranslations(array $section, string $title, bool $synced, array $translations): array
    {
        self::$sectionCalls[] = compact('section', 'title', 'synced', 'translations');

        return ['ok' => true, 'id' => 72, 'section' => $section, 'translations' => $translations];
    }
}
