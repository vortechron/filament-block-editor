<?php

namespace Vortechron\FilamentBlockEditor\Filament\Concerns;

use Closure;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use ReflectionClass;
use ReflectionMethod;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Design\KitSource;
use Vortechron\FilamentBlockEditor\Enums\DocumentKind;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Support\Urls;

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
     * The stored design kit. Null uses the current kit (KitSource). The
     * builder always gets the kit and Kit::defaults(), for its colour and
     * font pickers; the "Reka bentuk" (design) panel shows only when
     * savePageBuilderKit() is overridden.
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
        return ['ok' => false, 'errors' => ['section' => __('filament-block-editor::builder.errors.section_not_available')]];
    }

    /**
     * A canonical section and its section-scoped text maps, for shared-language hosts.
     * The older hook remains compatible with hosts that store one language.
     *
     * @param  array<string, array<string, string>>  $translations
     */
    protected function savePageBuilderSectionTranslations(array $section, string $title, bool $synced, array $translations): array
    {
        return $this->savePageBuilderSection($section, $title, $synced);
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

    protected function savePageBuilderSiteInfoTranslations(array $values, array $translations): void
    {
        $this->savePageBuilderSiteInfo($values);
    }

    protected function withPageBuilderSiteInfoTranslations(array $values, array $translations, Closure $draw): string
    {
        return $this->withPageBuilderSiteInfo($values, $draw);
    }

    /**
     * Draws the builder's preview with shop info that is not saved yet, so
     * the canvas follows the shop info form while the owner types. Call
     * `$draw()` while your settings (or the dynamic values that read them)
     * show `$values`, then put them back. For example:
     *
     *     return app(DynamicValues::class)->drawWith(['site.phone' => $values['contact']['phone'] ?? null], $draw);
     *
     * `$values` come straight from the builder, by group
     * (`['contact' => ['phone' => ...]]`): clean them yourself, and never
     * save them here (savePageBuilderSiteInfo() saves). Access was checked
     * before this runs. The default ignores them.
     *
     * @param  array<string, array<mixed>>  $values  by group
     * @param  Closure(): string  $draw
     */
    protected function withPageBuilderSiteInfo(array $values, Closure $draw): string
    {
        return $draw();
    }

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
     * The site's pages a link can point to, as `['title' => ..., 'url' => '/path']`, in menu order.
     *
     * @return list<array<string, mixed>>
     */
    protected function getPageBuilderPages(): array
    {
        return [];
    }

    /**
     * The pages one can build, for the menu under the builder's title:
     * `['title' => ..., 'url' => <its builder>, 'current' => bool]`, this
     * page among them. Shown with two or more. None by default.
     *
     * @return list<array<string, mixed>>
     */
    protected function getPageBuilderPageMenu(): array
    {
        return [];
    }

    /**
     * Counterpart builders, or null URLs for languages with no draft yet.
     * Hidden with fewer than two. The host checks permissions and creates
     * the new draft in createPageBuilderTranslation(), never in this hook.
     *
     * @return list<array{locale: string, label: string, url: string|null, current: bool}>
     */
    protected function getPageBuilderFieldLanguages(): array
    {
        return [];
    }

    protected function getPageBuilderLanguages(): array
    {
        return [];
    }

    /**
     * Hosts override this public Livewire action, check access, validate the
     * requested language and return the counterpart builder's URL. No page
     * content is passed here; translating never saves the open document.
     *
     * @return array{url: string}
     */
    public function createPageBuilderTranslation(string $locale): array
    {
        $this->authorizePageBuilder();
        abort(403);
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
     * Dynamic values for this builder only, on top of the registered ones
     * (Content\DynamicValues): `[['key' => 'page.title', 'label' => ...,
     * 'type' => 'text'|'link'|'image', 'group' => ?string, 'preview' => ?string,
     * 'settings' => ?string]]`, where `settings` is the shop info group the
     * value comes from.
     * One with the key of a registered value wins over it. With no
     * `preview`, the builder shows its render value (getPageBuilderRenderValues()).
     *
     * @return list<array<string, mixed>>
     */
    protected function getPageBuilderDynamicValues(): array
    {
        return [];
    }

    /**
     * Values of the page being built, by dynamic value key (such as
     * `['page.title' => 'Laman Utama', 'entry.photo' => '/a.jpg']`). They
     * are in the context the builder's preview is drawn with, so its chips
     * and the preview show real values.
     *
     * @return array<string, mixed>
     */
    protected function getPageBuilderRenderValues(): array
    {
        return [];
    }

    /**
     * The context to draw renderPageBuilderPreview() with: for the
     * builder, a preview, and the render values. A host that makes its own
     * context still gets the render values for the preview draw.
     */
    protected function getPageBuilderPreviewContext(): RenderContext
    {
        return (new RenderContext(forBuilder: true, isPreview: true))->withValues($this->getPageBuilderRenderValues());
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
            'saveSection' => $this->overridesPageBuilderHook('savePageBuilderSection') || $this->overridesPageBuilderHook('savePageBuilderSectionTranslations'),
            'saveSiteInfo' => $this->overridesPageBuilderHook('savePageBuilderSiteInfo') || $this->overridesPageBuilderHook('savePageBuilderSiteInfoTranslations'),
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
            return ['ok' => false, 'errors' => ['kit' => __('filament-block-editor::builder.errors.kit_not_available')]];
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
    public function saveSectionFromPageBuilder(array $section, string $title = '', bool $synced = false, array $translations = []): array
    {
        $this->authorizePageBuilder();

        if (! $this->overridesPageBuilderHook('savePageBuilderSection') && ! $this->overridesPageBuilderHook('savePageBuilderSectionTranslations')) {
            return ['ok' => false, 'errors' => ['section' => __('filament-block-editor::builder.errors.section_not_available')]];
        }

        $title = mb_substr(trim($title), 0, PageContent::MAX_TITLE_LENGTH);
        $languages = $this->getPageBuilderFieldLanguages();
        $value = ['sections' => [$section], ...($translations !== [] || $languages !== [] ? ['translations' => $translations] : [])];
        $validator = Validator::make(['value' => $value], PageValue::rules());
        if ($validator->fails()) {
            return ['ok' => false, 'errors' => self::firstErrors($validator->errors()->messages())];
        }
        try {
            $value = ContentLocale::with($languages['defaultLocale'] ?? $this->getPageBuilderContentLocale(), function () use ($value): array {
                $clean = PageValue::normalize($value);

                // A saved section is new; base words and every map follow the same guard.
                return $this->isPageBuilderDeveloper() ? $clean : PageValue::guard($clean, []);
            });
        } catch (InvalidArgumentException $exception) {
            return ['ok' => false, 'errors' => ['section' => $exception->getMessage()]];
        }
        $clean = $value['sections'][0] ?? null;

        if ($title === '' || ($clean['type'] ?? null) !== PageContent::TYPE) {
            return ['ok' => false, 'errors' => $title === '' ? ['title' => __('filament-block-editor::builder.errors.title_needed')] : ['section' => __('filament-block-editor::builder.errors.section_only')]];
        }

        $result = $this->savePageBuilderSectionTranslations($clean, $title, $synced, $value['translations'] ?? []);

        return ($result['ok'] ?? false) === true
            ? ['ok' => true, 'id' => $result['id'] ?? null, 'template' => is_array($result['template'] ?? null) ? $result['template'] : null,
                ...(is_array($result['section'] ?? null) ? ['section' => $result['section']] : []),
                ...(is_array($result['translations'] ?? null) ? ['translations' => $result['translations']] : []),
            ]
            : ['ok' => false, 'errors' => is_array($result['errors'] ?? null) ? $result['errors'] : ['section' => __('filament-block-editor::builder.errors.section_not_saved')]];
    }

    /**
     * Saves the shop info. A good save answers with the dynamic values read
     * again (`dynamicValues`, as in the options), so the builder's chips and
     * shop info rows show the new values at once.
     *
     * @param  array<string, mixed>  $values
     * @return array{ok: bool, errors?: array<string, string>, dynamicValues?: list<array<string, mixed>>}
     */
    public function saveSiteInfoFromPageBuilder(array $values, ?array $translations = null): array
    {
        $this->authorizePageBuilder();

        if (! $this->getPageBuilderSupports()['saveSiteInfo']) {
            return ['ok' => false, 'errors' => ['siteInfo' => __('filament-block-editor::builder.errors.site_info_not_available')]];
        }

        $result = $this->refusingInvalid(fn () => $this->savePageBuilderSiteInfoTranslations(array_filter($values, is_array(...)), $translations ?? []));

        return $result['ok'] ? [...$result, 'dynamicValues' => ContentLocale::with($this->getPageBuilderContentLocale(), fn (): array => $this->pageBuilderDynamicValues())] : $result;
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
        $pages = $this->pageBuilderPages();

        return array_filter([
            'developer' => $this->isPageBuilderDeveloper(),
            'kit' => Kit::normalize($kit ?? app(KitSource::class)->current()),
            'kitDefaults' => Kit::defaults(),
            'syncedSections' => $this->pageBuilderSyncedSections(),
            'parts' => array_values(array_filter($this->getPageBuilderParts(), fn (mixed $part): bool => is_array($part) && is_string($part['key'] ?? null) && (DocumentKind::tryFrom($part['key'])?->isPart() ?? false))),
            'siteInfo' => $siteInfo === null ? null : self::siteInfo($siteInfo),
            'pages' => $pages === [] ? null : $pages,
            'pageMenu' => count($menu = $this->pageBuilderPageMenu()) < 2 ? null : $menu,
            'fieldLanguages' => $this->getPageBuilderFieldLanguages() ?: null,
            'languages' => count($languages = $this->pageBuilderLanguages()) < 2 ? null : $languages,
            'kind' => (DocumentKind::tryFrom($this->getPageBuilderKind()) ?? DocumentKind::Page)->value,
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * The registered dynamic values, then the host's own
     * (getPageBuilderDynamicValues()), which win on the same key. Each
     * preview is read with the render values.
     *
     * @return list<array{key: string, label: string, type: string, group: string, preview: string|null, settings?: string}>
     */
    protected function pageBuilderDynamicValues(): array
    {
        $values = app(DynamicValues::class);
        $context = (new RenderContext(forBuilder: true))->withValues($this->getPageBuilderRenderValues());
        $own = [];

        foreach ($this->getPageBuilderDynamicValues() as $entry) {
            $key = is_array($entry) ? ($entry['key'] ?? null) : null;
            $type = $entry['type'] ?? 'text';

            if (! DynamicValues::isKey($key) || ! in_array($type, DynamicValues::TYPES, true) || ! is_string($entry['label'] ?? null)) {
                continue;
            }

            $own[$key] = [
                'key' => $key,
                'label' => $entry['label'],
                'type' => $type,
                'group' => is_string($entry['group'] ?? null) && $entry['group'] !== '' ? $entry['group'] : 'Site',
                'preview' => is_string($entry['preview'] ?? null) ? $entry['preview'] : $values->preview($key, $context),
                ...(is_string($entry['settings'] ?? null) && $entry['settings'] !== '' ? ['settings' => $entry['settings']] : []),
            ];
        }

        $registered = array_filter($values->definitions($context), fn (array $definition): bool => ! isset($own[$definition['key']]));

        return [...array_values($registered), ...array_values($own)];
    }

    /**
     * The host's pages without any entry that has no title or a url that
     * does not stay on the site (it must start with one `/`).
     *
     * @return list<array{title: string, url: string}>
     */
    private function pageBuilderPages(): array
    {
        $pages = [];

        foreach ($this->getPageBuilderPages() as $entry) {
            $title = is_array($entry) && is_string($entry['title'] ?? null) ? mb_substr(trim($entry['title']), 0, 120) : '';
            $url = is_array($entry) ? ($entry['url'] ?? null) : null;

            if ($title !== '' && is_string($url) && str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
                $pages[] = ['title' => $title, 'url' => $url];
            }
        }

        return $pages;
    }

    /**
     * The title menu's pages: a name, a safe link (Urls::link()) and at
     * most one current.
     *
     * @return list<array{title: string, url: string, current: bool}>
     */
    private function pageBuilderPageMenu(): array
    {
        $menu = [];
        $hasCurrent = false;

        foreach ($this->getPageBuilderPageMenu() as $entry) {
            $title = is_array($entry) && is_string($entry['title'] ?? null) ? mb_substr(trim($entry['title']), 0, 120) : '';
            $url = is_array($entry) ? Urls::link($entry['url'] ?? null) : null;

            if ($title !== '' && $url !== null) {
                $current = ($entry['current'] ?? false) === true && ! $hasCurrent;
                $hasCurrent = $hasCurrent || $current;
                $menu[] = ['title' => $title, 'url' => $url, 'current' => $current];
            }
        }

        return $menu;
    }

    /** @return list<array{locale: string, label: string, url: string|null, current: bool}> */
    private function pageBuilderLanguages(): array
    {
        $languages = [];
        $hasCurrent = false;

        foreach ($this->getPageBuilderLanguages() as $entry) {
            if (! is_array($entry) || ! array_key_exists('url', $entry)) {
                continue;
            }

            $locale = $entry['locale'] ?? null;
            $label = is_string($entry['label'] ?? null) ? mb_substr(trim($entry['label']), 0, 120) : '';
            $url = $entry['url'] ?? null;

            if (! is_string($locale) || preg_match('/^[a-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/D', $locale) !== 1 || isset($languages[$locale]) || $label === '') {
                continue;
            }

            if ($url !== null && (! is_string($url) || preg_match('~^(https?://|/(?!/))~i', $url) !== 1 || Urls::link($url) === null)) {
                continue;
            }

            $current = ($entry['current'] ?? false) === true && ! $hasCurrent;
            $hasCurrent = $hasCurrent || $current;
            $languages[$locale] = ['locale' => $locale, 'label' => $label, 'url' => $url, 'current' => $current];
        }

        return array_values($languages);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function pageBuilderSyncedSections(): array
    {
        $synced = [];

        foreach ($this->getPageBuilderSyncedSections() as $entry) {
            $value = is_array($entry['section'] ?? null)
                ? ContentLocale::with($this->getPageBuilderFieldLanguages()['defaultLocale'] ?? $this->getPageBuilderContentLocale(), fn (): array => PageValue::normalize(['sections' => [$entry['section']], ...(is_array($entry['translations'] ?? null) ? ['translations' => $entry['translations']] : [])]))
                : [];
            $section = $value['sections'][0] ?? null;
            $id = PageContent::ref($entry['id'] ?? null);

            if ($id !== null && ($section['type'] ?? null) === PageContent::TYPE) {
                $synced[] = ['id' => $id, 'title' => (string) ($entry['title'] ?? ''), 'editUrl' => is_string($entry['editUrl'] ?? null) ? $entry['editUrl'] : null, 'section' => $section, ...(isset($value['translations']) ? ['translations' => $value['translations']] : [])];
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

        return ['groups' => $groups, 'values' => is_array($siteInfo['values'] ?? null) ? $siteInfo['values'] : [], ...(is_array($siteInfo['translations'] ?? null) ? ['translations' => $siteInfo['translations']] : [])];
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
