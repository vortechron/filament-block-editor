{{--
    The full-screen page builder. The Livewire page (InteractsWithPageBuilder)
    is the adapter: save, preview and upload are calls back to it. saveKit,
    saveSection and saveSiteInfo are wired only when the page overrides
    their hooks (getPageBuilderSupports()).
--}}
<div class="fbe-filament-host" style="position: fixed; inset: 0; z-index: 30;">
    <link rel="stylesheet" href="{{ $this->getPageBuilderStyleUrl() }}">

    <div
        wire:ignore
        class="fbe-filament-mount"
        style="position: absolute; inset: 0;"
        x-data
        x-init="(async () => {
            const options = @js($this->getPageBuilderOptions());
            const supports = @js($this->getPageBuilderSupports());
            const { mountPageBuilder } = await import(@js($this->getPageBuilderScriptUrl()));
            const wire = $wire;

            mountPageBuilder($el, {
                ...options,
                adapter: {
                    save: (value) => wire.savePageBuilder(value),
                    preview: (value, extra) => wire.previewPageBuilder(value, extra?.kit ?? null, extra?.siteInfo ?? null),
                    ...(supports.saveKit ? { saveKit: (kit) => wire.saveKitFromPageBuilder(kit) } : {}),
                    ...(supports.saveSection ? { saveSection: (section, meta) => wire.saveSectionFromPageBuilder(section, meta?.title ?? '', meta?.synced ?? false) } : {}),
                    ...(supports.saveSiteInfo ? { saveSiteInfo: (values) => wire.saveSiteInfoFromPageBuilder(values) } : {}),
                    upload: (file, kind) => new Promise((resolve, reject) => {
                        wire.upload(
                            'pageBuilderUpload',
                            file,
                            () => wire.storePageBuilderUpload(kind ?? 'image').then(resolve, reject),
                            () => reject(new Error('Upload failed')),
                        );
                    }),
                },
            });
        })()"
    ></div>
</div>
