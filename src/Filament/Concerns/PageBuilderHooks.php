<?php

namespace Vortechron\FilamentBlockEditor\Filament\Concerns;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use ReflectionMethod;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Design\KitSource;
use Vortechron\FilamentBlockEditor\Enums\DocumentKind;

/**
 * The page builder's optional parts: the design kit, saved and synced
 * sections, the shop info of the header and footer, and the kind of
 * document. Part of InteractsWithPageBuilder.
 *
 * Every hook has a safe default. A save hook is only offered to the builder
 * when the host overrides it: getPageBuilderSupports() tells the view which
 * adapter calls to wire, and each Livewire call refuses a hook the host did
 * not override. Every Livewire call checks access first.
 */
trait PageBuilderHooks
{
    /**
     * The stored design kit, for the builder's "Reka bentuk" panel. Null
     * for none (the panel shows the current kit when savePageBuilderKit()
     * is overridden).
     *
     * @return array<mixed>|null
     */
    protected function getPageBuilderKit(): ?array
    {
        return null;
    }

    /**
     * @param  array<string, mixed>  $kit  cleaned (Kit::normalize())
     */
    protected function savePageBuilderKit(array $kit): void {}

    /**
     * Saves a section as a template, or as a synced section when `$synced`.
     * Return `['ok' => true, 'id' => ..., 'template' => ?array]`, where
     * `template` is the new entry of the builder's templates (category
     * "saved"), or `['ok' => false, 'errors' => [...]]`.
     *
     * @param  array<string, mixed>  $section  one cleaned rich section
     * @return array<string, mixed>
     */
    protected function savePageBuilderSection(array $section, string $title, bool $synced): array
    {
        return ['ok' => false, 'errors' => ['section' => 'Saving sections is not available here.']];
    }

    /**
     * The shop info the header and footer show:
     * `['groups' => [['key' => ..., 'label' => ..., 'fields' => [Field, ...]]], 'values' => [group => [field => value]]]`.
     *
     * @return array<string, mixed>|null
     */
    protected function getPageBuilderSiteInfo(): ?array
    {
        return null;
    }

    /**
     * Validate and save it; throw a ValidationException to refuse.
     *
     * @param  array<string, array<string, mixed>>  $values  by group
     */
    protected function savePageBuilderSiteInfo(array $values): void {}

    /**
     * The synced sections a page can use:
     * `[['id' => ..., 'title' => ..., 'editUrl' => ?string, 'section' => [...]], ...]`.
     *
     * @return list<array<string, mixed>>
     */
    protected function getPageBuilderSyncedSections(): array
    {
        return [];
    }

    /**
     * The header and footer: `[['key' => 'header', 'title' => ..., 'editUrl' => ...], ...]`.
     *
     * @return list<array<string, mixed>>
     */
    protected function getPageBuilderParts(): array
    {
        return [];
    }

    /**
     * What is being built: a DocumentKind value (page, header, footer,
     * section, card or single).
     */
    protected function getPageBuilderKind(): string
    {
        return 'page';
    }

    /**
     * Which optional adapter calls the view wires.
     *
     * @return array{saveKit: bool, saveSection: bool, saveSiteInfo: bool}
     */
    public function getPageBuilderSupports(): array
    {
        return [
            'saveKit' => $this->overridesPageBuilderHook('savePageBuilderKit'),
            'saveSection' => $this->overridesPageBuilderHook('savePageBuilderSection'),
            'saveSiteInfo' => $this->overridesPageBuilderHook('savePageBuilderSiteInfo'),
        ];
    }

    /**
     * @param  array<string, mixed>  $kit
     * @return array{ok: bool, errors?: array<string, string>}
     */
    public function saveKitFromPageBuilder(array $kit): array
    {
        $this->authorizePageBuilder();

        if (! $this->overridesPageBuilderHook('savePageBuilderKit')) {
            return ['ok' => false, 'errors' => ['kit' => 'Saving the design is not available here.']];
        }

        $validator = Validator::make(['kit' => $kit], Kit::rules());

        if ($validator->fails()) {
            return ['ok' => false, 'errors' => self::firstErrors($validator->errors()->messages())];
        }

        return $this->refusingInvalid(fn () => $this->savePageBuilderKit(Kit::normalize($kit)));
    }

    /**
     * @param  array<string, mixed>  $section
     * @return array<string, mixed>
     */
    public function saveSectionFromPageBuilder(array $section, string $title = '', bool $synced = false): array
    {
        $this->authorizePageBuilder();

        if (! $this->overridesPageBuilderHook('savePageBuilderSection')) {
            return ['ok' => false, 'errors' => ['section' => 'Saving sections is not available here.']];
        }

        $title = mb_substr(trim($title), 0, 120);
        $clean = PageContent::normalize([$section])[0] ?? null;

        if ($title === '' || ($clean['type'] ?? null) !== PageContent::TYPE) {
            return ['ok' => false, 'errors' => $title === '' ? ['title' => 'A title is needed.'] : ['section' => 'Only a section of its own can be saved.']];
        }

        // A saved section is new, so it keeps no developer-only data from someone else.
        if (! $this->isPageBuilderDeveloper()) {
            $clean = PageValue::guard(['sections' => [$clean]], [])['sections'][0];
        }

        $result = $this->savePageBuilderSection($clean, $title, $synced);

        return ($result['ok'] ?? false) === true
            ? ['ok' => true, 'id' => $result['id'] ?? null, 'template' => is_array($result['template'] ?? null) ? $result['template'] : null]
            : ['ok' => false, 'errors' => is_array($result['errors'] ?? null) ? $result['errors'] : ['section' => 'The section was not saved.']];
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array{ok: bool, errors?: array<string, string>}
     */
    public function saveSiteInfoFromPageBuilder(array $values): array
    {
        $this->authorizePageBuilder();

        if (! $this->overridesPageBuilderHook('savePageBuilderSiteInfo')) {
            return ['ok' => false, 'errors' => ['siteInfo' => 'Saving the shop info is not available here.']];
        }

        return $this->refusingInvalid(fn () => $this->savePageBuilderSiteInfo(array_filter($values, is_array(...))));
    }

    /**
     * The optional parts of the builder's options.
     *
     * @return array<string, mixed>
     */
    protected function getPageBuilderHookOptions(): array
    {
        $kit = $this->getPageBuilderKit();
        $siteInfo = $this->getPageBuilderSiteInfo();

        return array_filter([
            'developer' => $this->isPageBuilderDeveloper(),
            'kit' => $kit !== null ? Kit::normalize($kit) : ($this->overridesPageBuilderHook('savePageBuilderKit') ? app(KitSource::class)->current() : null),
            'syncedSections' => $this->pageBuilderSyncedSections(),
            'parts' => array_values(array_filter($this->getPageBuilderParts(), fn (mixed $part): bool => is_array($part) && is_string($part['key'] ?? null) && (DocumentKind::tryFrom($part['key'])?->isPart() ?? false))),
            'siteInfo' => $siteInfo === null ? null : self::siteInfo($siteInfo),
            'kind' => (DocumentKind::tryFrom($this->getPageBuilderKind()) ?? DocumentKind::Page)->value,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function pageBuilderSyncedSections(): array
    {
        $synced = [];

        foreach ($this->getPageBuilderSyncedSections() as $entry) {
            $section = is_array($entry['section'] ?? null) ? (PageContent::normalize([$entry['section']])[0] ?? null) : null;
            $id = PageContent::ref($entry['id'] ?? null);

            if ($id !== null && ($section['type'] ?? null) === PageContent::TYPE) {
                $synced[] = ['id' => $id, 'title' => (string) ($entry['title'] ?? ''), 'editUrl' => is_string($entry['editUrl'] ?? null) ? $entry['editUrl'] : null, 'section' => $section];
            }
        }

        return $synced;
    }

    /**
     * Site info with its Field objects as the builder's JSON.
     *
     * @param  array<string, mixed>  $siteInfo
     * @return array<string, mixed>
     */
    private static function siteInfo(array $siteInfo): array
    {
        $groups = array_map(fn (array $group): array => [
            ...$group,
            'fields' => array_values(array_map(fn (mixed $field): mixed => $field instanceof Field ? $field->toArray() : $field, (array) ($group['fields'] ?? []))),
        ], array_values(array_filter((array) ($siteInfo['groups'] ?? []), is_array(...))));

        return ['groups' => $groups, 'values' => is_array($siteInfo['values'] ?? null) ? $siteInfo['values'] : []];
    }

    /**
     * @param  callable(): void  $save
     * @return array{ok: bool, errors?: array<string, string>}
     */
    private function refusingInvalid(callable $save): array
    {
        try {
            $save();
        } catch (ValidationException $exception) {
            return ['ok' => false, 'errors' => self::firstErrors($exception->errors())];
        }

        return ['ok' => true];
    }

    /**
     * @param  array<string, list<string>>  $messages
     * @return array<string, string>
     */
    private static function firstErrors(array $messages): array
    {
        return array_map(fn (array $list): string => (string) ($list[0] ?? ''), $messages);
    }

    /**
     * Whether the host wrote its own version of a hook (its method lives in
     * another file than this trait).
     */
    private function overridesPageBuilderHook(string $method): bool
    {
        return (new ReflectionMethod($this, $method))->getFileName() !== (new ReflectionClass(PageBuilderHooks::class))->getFileName();
    }
}
