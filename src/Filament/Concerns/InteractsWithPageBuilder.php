<?php

namespace Vortechron\FilamentBlockEditor\Filament\Concerns;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Content\TextTranslations;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Design\KitSource;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;
use Vortechron\FilamentBlockEditor\Support\Assets;
use Vortechron\FilamentBlockEditor\Templates\SectionTemplates;

/**
 * Turns any Filament page (a standalone page or a resource page) into the
 * full-screen page builder. The builder talks to the page through three
 * Livewire calls: savePageBuilder(), previewPageBuilder() and, after a
 * Livewire upload into $pageBuilderUpload, storePageBuilderUpload().
 *
 * The page supplies the value, saves it and draws the preview:
 *
 *     protected function getPageBuilderValue(): array          // a page value of any format
 *     protected function savePageBuilderValue(array $value): void  // ['version' => 2, 'sections' => [...]]
 *     protected function renderPageBuilderPreview(array $sections): string  // a full HTML document
 *
 * The optional parts (design kit, saved and synced sections, shop info,
 * header and footer) are hooks with safe defaults: see PageBuilderHooks.
 */
trait InteractsWithPageBuilder
{
    use PageBuilderHooks;
    use WithFileUploads;

    /**
     * The file the builder is uploading right now.
     */
    public ?TemporaryUploadedFile $pageBuilderUpload = null;

    /**
     * The stored page: a page value of any format (Content\PageValue):
     * `['version' => 2, 'sections' => [...]]`, `['sections' => [...]]` or a
     * bare list of sections. It is upgraded before the builder gets it.
     *
     * @return array<mixed>
     */
    abstract protected function getPageBuilderValue(): array;

    /**
     * @param  array{version: int, sections: list<array<string, mixed>>}  $value  a format 2 value, already validated, cleaned and guarded
     */
    abstract protected function savePageBuilderValue(array $value): void;

    /**
     * The page drawn with these unsaved sections, as a full HTML document.
     * Draw the sections with $this->getPageBuilderPreviewContext() (or your
     * own RenderContext(forBuilder: true, isPreview: true)).
     *
     * @param  list<array<string, mixed>>  $sections
     */
    abstract protected function renderPageBuilderPreview(array $sections): string;

    /**
     * Whether the signed-in user is a developer: they may set locks, custom
     * CSS and developer-only fields. Everyone else's saves go through
     * PageValue::guard(), which keeps the stored developer-only data.
     */
    protected function isPageBuilderDeveloper(): bool
    {
        return false;
    }

    /**
     * Checks that the signed-in user may edit this page. It runs before
     * every save, preview and upload, because a Livewire call can be sent
     * without opening the page. Throw (for example abort(403)) to refuse.
     * Call it from mount() as well.
     */
    protected function authorizePageBuilder(): void {}

    public function getView(): string
    {
        return 'filament-block-editor::filament.page-builder';
    }

    public function getLayout(): string
    {
        return 'filament-panels::components.layout.base';
    }

    protected function getPageBuilderBackUrl(): ?string
    {
        return null;
    }

    protected function getPageBuilderViewUrl(): ?string
    {
        return null;
    }

    protected function getPageBuilderAccent(): ?string
    {
        return null;
    }

    protected function getPageBuilderLocale(): string
    {
        return str_starts_with(app()->getLocale(), 'ms') ? 'ms' : 'en';
    }

    /**
     * The language of the words a ready-made section puts on the page: the
     * site's (Rendering\ContentLocale), which may differ from the builder's.
     */
    protected function getPageBuilderContentLocale(): string
    {
        return str_starts_with(ContentLocale::site(), 'ms') ? 'ms' : 'en';
    }

    /**
     * Everything mountPageBuilder() needs except the adapter, which the view
     * wires to this page.
     *
     * @return array<string, mixed>
     */
    public function getPageBuilderOptions(): array
    {
        $locale = $this->getPageBuilderLocale();

        $contentLocale = $this->getPageBuilderContentLocale();
        $valueLocale = $this->pageBuilderValueLocale();

        return ContentLocale::with($valueLocale, fn (): array => array_filter([
            'value' => PageValue::normalize($this->getPageBuilderValue()),
            'blocks' => app(BlockRegistry::class)->definitions(),
            'templates' => SectionTemplates::all($locale, $valueLocale),
            'locale' => $locale,
            'contentLocale' => $contentLocale,
            'title' => (string) $this->getTitle(),
            'backUrl' => $this->getPageBuilderBackUrl(),
            'viewUrl' => $this->getPageBuilderViewUrl(),
            'accent' => $this->getPageBuilderAccent(),
            'fonts' => array_map(fn (string $key, array $font): array => ['value' => $key, ...$font], array_keys(Kit::fonts()), Kit::fonts()),
            'dynamicValues' => $this->pageBuilderDynamicValues(),
            ...$this->getPageBuilderHookOptions(),
        ], fn (mixed $value): bool => $value !== null));
    }

    public function getPageBuilderScriptUrl(): string
    {
        return Assets::builderScriptUrl();
    }

    private function pageBuilderValueLocale(): string
    {
        return $this->getPageBuilderFieldLanguages()['defaultLocale'] ?? $this->getPageBuilderContentLocale();
    }

    public function getPageBuilderStyleUrl(): string
    {
        return Assets::builderStyleUrl();
    }

    /**
     * @param  array<string, mixed>  $value
     * @return array{ok: bool, errors?: array<string, string>}
     */
    public function savePageBuilder(array $value): array
    {
        $this->authorizePageBuilder();

        return ContentLocale::with($this->pageBuilderValueLocale(), function () use ($value): array {
            $value = PageValue::upgrade($value);
            $validator = Validator::make(['value' => $value], PageValue::rules());

            if ($validator->fails()) {
                return [
                    'ok' => false,
                    'errors' => collect($validator->errors()->messages())->map(fn (array $messages): string => $messages[0])->mapWithKeys(fn ($message, $key) => [str_starts_with($key, 'value.sections') ? substr($key, 6) : $key => $message])->all(),
                ];
            }

            try {
                $value = PageValue::normalize($value);

                // Safe by default: a host that forgets the guard still never saves
                // locks or custom CSS from someone who is not a developer.
                if (! $this->isPageBuilderDeveloper()) {
                    $value = PageValue::guard($value, PageValue::normalize($this->getPageBuilderValue()));
                }

            } catch (InvalidArgumentException $error) {
                return ['ok' => false, 'errors' => ['value' => $error->getMessage()]];
            }

            $this->savePageBuilderValue($value);

            return ['ok' => true];
        });
    }

    /**
     * The page drawn with unsaved sections, with an unsaved design kit
     * when one is given (KitSource::override(), for this draw only), and
     * with unsaved shop info when it is given (withPageBuilderSiteInfo(),
     * never saved). The host's render values apply to this draw too
     * (DynamicValues::drawWith()).
     *
     * @param  array<string, mixed>  $value  a page value of any format
     * @param  array<string, mixed>|null  $kit
     * @param  array<string, mixed>|null  $siteInfo  the shop info form's values, by group
     */
    public function previewPageBuilder(array $value, ?array $kit = null, ?array $siteInfo = null, ?string $contentLocale = null, ?array $siteInfoTranslations = null): string
    {
        $this->authorizePageBuilder();

        $languages = $this->getPageBuilderFieldLanguages();
        $allowed = array_column($languages['locales'] ?? [], 'locale');
        $contentLocale = in_array($contentLocale, $allowed, true) ? $contentLocale : $this->getPageBuilderContentLocale();

        return ContentLocale::with($contentLocale, function () use ($value, $kit, $siteInfo, $contentLocale, $siteInfoTranslations): string {
            $sections = ContentLocale::with($this->pageBuilderValueLocale(), function () use ($value, $contentLocale): array {
                $value = PageValue::normalize($value);

                return TextTranslations::apply($value, $value['translations'][$contentLocale] ?? [])['sections'];
            });
            $drawPage = fn (): string => app(DynamicValues::class)->drawWith($this->getPageBuilderRenderValues(), fn (): string => $this->renderPageBuilderPreview($sections));
            $draw = $siteInfo === null
                ? $drawPage
                : fn (): string => $this->withPageBuilderSiteInfoTranslations(array_filter($siteInfo, is_array(...)), $siteInfoTranslations ?? [], $drawPage);

            if ($kit === null) {
                return $draw();
            }

            $source = app(KitSource::class);
            $source->override($kit);

            try {
                return $draw();
            } finally {
                $source->override(null);
            }
        });
    }

    /**
     * Stores the file the builder just uploaded and returns its address.
     *
     * @return array{url: string, name: string}
     */
    public function storePageBuilderUpload(string $kind = 'image'): array
    {
        $this->authorizePageBuilder();

        $mimes = match ($kind) {
            'video' => 'mimes:mp4,webm,mov',
            'file' => 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip',
            default => 'mimes:jpg,jpeg,png,webp,gif',
        };

        $this->validate([
            'pageBuilderUpload' => ['required', 'file', $mimes, 'max:'.(int) config('filament-block-editor.max_upload_size', 20480)],
        ]);

        $disk = (string) config('filament-block-editor.disk', 'public');
        $file = $this->pageBuilderUpload;
        $path = $file->store((string) config('filament-block-editor.directory', 'block-editor'), ['disk' => $disk, 'visibility' => 'public']);
        $this->pageBuilderUpload = null;

        return ['url' => Storage::disk($disk)->url($path), 'name' => $file->getClientOriginalName()];
    }
}
