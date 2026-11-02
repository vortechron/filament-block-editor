<?php

namespace Vortechron\FilamentBlockEditor\Filament\Concerns;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Content\PageContent;
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
 *     protected function getPageBuilderValue(): array          // ['sections' => [...]]
 *     protected function savePageBuilderValue(array $value): void
 *     protected function renderPageBuilderPreview(array $sections): string  // a full HTML document
 */
trait InteractsWithPageBuilder
{
    use WithFileUploads;

    /**
     * The file the builder is uploading right now.
     */
    public ?TemporaryUploadedFile $pageBuilderUpload = null;

    /**
     * @return array{sections: array<mixed>}
     */
    abstract protected function getPageBuilderValue(): array;

    /**
     * @param  array{sections: list<array<string, mixed>>}  $value  already validated and cleaned
     */
    abstract protected function savePageBuilderValue(array $value): void;

    /**
     * The page drawn with these unsaved sections, as a full HTML document.
     * Draw the sections with RenderContext(forBuilder: true, isPreview: true).
     *
     * @param  list<array<string, mixed>>  $sections
     */
    abstract protected function renderPageBuilderPreview(array $sections): string;

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
     * Everything mountPageBuilder() needs except the adapter, which the view
     * wires to this page.
     *
     * @return array<string, mixed>
     */
    public function getPageBuilderOptions(): array
    {
        $locale = $this->getPageBuilderLocale();

        return array_filter([
            'value' => ['sections' => PageContent::normalize((array) ($this->getPageBuilderValue()['sections'] ?? []))],
            'blocks' => app(BlockRegistry::class)->definitions(),
            'templates' => SectionTemplates::all($locale),
            'locale' => $locale,
            'title' => (string) $this->getTitle(),
            'backUrl' => $this->getPageBuilderBackUrl(),
            'viewUrl' => $this->getPageBuilderViewUrl(),
            'accent' => $this->getPageBuilderAccent(),
        ], fn (mixed $value): bool => $value !== null);
    }

    public function getPageBuilderScriptUrl(): string
    {
        return Assets::builderScriptUrl();
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
        $validator = Validator::make(['sections' => $value['sections'] ?? null], PageContent::rules('sections'));

        if ($validator->fails()) {
            return [
                'ok' => false,
                'errors' => collect($validator->errors()->messages())->map(fn (array $messages): string => $messages[0])->all(),
            ];
        }

        $this->savePageBuilderValue(['sections' => PageContent::normalize($value['sections'])]);

        return ['ok' => true];
    }

    /**
     * @param  array<string, mixed>  $value
     */
    public function previewPageBuilder(array $value): string
    {
        return $this->renderPageBuilderPreview(PageContent::normalize((array) ($value['sections'] ?? [])));
    }

    /**
     * Stores the file the builder just uploaded and returns its address.
     *
     * @return array{url: string, name: string}
     */
    public function storePageBuilderUpload(string $kind = 'image'): array
    {
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
