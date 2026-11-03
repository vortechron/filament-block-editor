# Block Editor

A visual page builder, like a small Elementor, that works in any web app and plugs into **Filament 5**.

The client builds pages from sections. They pick ready-made sections, type straight into the page, drag things
around, and see the real page in a live frame on desktop or phone width. You keep control of the design: your
own CSS themes the page, and your own blocks draw the parts of the design that must not break.

It started as the page builder of [NakJual](https://nakjual.com) and is made generic here.

- **Builder (JavaScript):** `mountPageBuilder(element, options)`. No framework needed: it talks to your app only
  through an adapter with three calls (save, preview, upload). React is bundled inside.
- **Content (PHP, Laravel):** cleans the page value (format 2, with versioned upgrades), draws it as HTML with
  Blade, styles per device as data, a design kit, locks, synced sections, dynamic values, a form block,
  ready-made section templates and blocks, and an own-block registry.
- **Filament:** one trait turns any Filament page into the full-screen builder.

## Requirements

- PHP 8.3+, Laravel 11+ (the content layer)
- Filament 5 (the Filament layer only)
- No Node in your app: the builder is shipped prebuilt in `resources/dist/`.

## Install

```bash
composer config repositories.vortechron-block-editor vcs https://github.com/vortechron/filament-block-editor.git
composer require vortechron/filament-block-editor:^2.0
php artisan filament:assets   # with Filament
# or, without Filament:
php artisan vendor:publish --tag=filament-block-editor-assets
```

## Show a page

A page is a page value stored as JSON: `['version' => 2, 'sections' => [...]]` (see
[The page value](docs/php.md#the-page-value)). Older values (a bare list, or `['sections' => [...]]`) are
upgraded when they are read. Draw it with:

```blade
<head>
    <x-filament-block-editor::styles />
</head>
<body>
    <x-filament-block-editor::page :sections="$page->sections" />
</body>
```

The styles component also prints the site's [design kit](docs/php.md#design-kit) (colours, fonts, corners,
buttons, forms). You can still theme with CSS custom properties (`--sf-accent`, `--sf-text`,
`--sf-heading-font`, ...): see [docs/php.md](docs/php.md#theme-it-with-css-variables).

## Edit a page in Filament

Use the trait on any Filament page, standalone or inside a resource:

```php
use Filament\Resources\Pages\Concerns\InteractsWithRecord;
use Filament\Resources\Pages\Page;
use Vortechron\FilamentBlockEditor\Filament\Concerns\InteractsWithPageBuilder;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

class BuildPage extends Page
{
    use InteractsWithPageBuilder;
    use InteractsWithRecord;

    protected static string $resource = PageResource::class;

    public function mount(int|string $record): void
    {
        $this->record = $this->resolveRecord($record);
        $this->authorizePageBuilder();
    }

    protected function getPageBuilderValue(): array
    {
        return $this->record->content ?? [];   // any format: it is upgraded for the builder
    }

    protected function savePageBuilderValue(array $value): void
    {
        // ['version' => 2, 'sections' => [...]], already validated, cleaned and guarded
        $this->record->update(['content' => $value]);
    }

    protected function renderPageBuilderPreview(array $sections): string
    {
        // Your real page view, drawn with the builder's marks so a click picks a section.
        return view('pages.show', [
            'page' => $this->record,
            'sections' => $sections,
            'context' => $this->getPageBuilderPreviewContext(),   // forBuilder, isPreview, your render values
        ])->render();
    }

    protected function getPageBuilderBackUrl(): ?string
    {
        return PageResource::getUrl();
    }

    // Runs before every save, preview and upload (Livewire calls can be sent
    // without opening the page). Call it from mount() too.
    protected function authorizePageBuilder(): void
    {
        abort_unless(PageResource::canEdit($this->record), 403);
    }
}
```

Every save by someone who is not a developer keeps the stored locks and developer-only data
(`PageValue::guard()`). Override these hooks to switch more on; each one has a safe default, and the
builder only offers what you override:

```php
protected function isPageBuilderDeveloper(): bool { return auth()->user()->is_developer; }  // locks, custom CSS
protected function getPageBuilderKit(): ?array { return Kit::normalize(setting('kit')); }    // null: KitSource's current kit
protected function savePageBuilderKit(array $kit): void { setting(['kit' => $kit]); }        // the design panel
protected function savePageBuilderSection(array $section, string $title, bool $synced): array { /* ... */ return ['ok' => true, 'id' => $id, 'template' => null]; }
protected function getPageBuilderSiteInfo(): ?array { /* groups of Fields and their values */ }
protected function savePageBuilderSiteInfo(array $values): void { /* validate and save */ }
protected function getPageBuilderSyncedSections(): array { return []; }   // [['id', 'title', 'editUrl', 'section']]
protected function getPageBuilderParts(): array { return []; }            // [['key' => 'header', 'title', 'editUrl']]
protected function getPageBuilderKind(): string { return 'page'; }        // an Enums\DocumentKind value
protected function getPageBuilderDynamicValues(): array { return []; }   // more values for this builder only
protected function getPageBuilderRenderValues(): array { return []; }    // ['page.title' => 'Laman Utama'] for the preview
```

The builder always gets the current kit (`kit`) and `Kit::defaults()` (`kitDefaults`, with your config),
for its colour and font pickers; the design panel shows only when you override `savePageBuilderKit()`.

Register the route like any resource page (`'build' => BuildPage::route('/{record}/build')`) and add
`FilamentBlockEditorPlugin::make()` to the panel. Uploads go to `config('filament-block-editor.disk')`
(`public` by default; any public disk, such as S3 or MinIO, works). For a page that is not a resource page,
extend `Vortechron\FilamentBlockEditor\Filament\Pages\PageBuilderPage`.

## Your own blocks

Draw the parts of a design the client fills in but cannot break. Declare the fields in PHP; the builder gets a
generated form, and your Blade view draws the block:

```php
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;

app(BlockRegistry::class)->register(
    OwnBlock::make('pricing')
        ->label('Pricing')
        ->icon('tag')                                 // a lucide icon name
        ->fields([
            Field::text('heading')->label('Heading')->default('Our packages'),
            Field::list('plans')->label('Plans')->maxItems(4)->fields([
                Field::text('name')->label('Name'),
                Field::number('price')->label('Price'),
                Field::toggle('popular')->label('Popular'),
            ]),
        ])
        ->view('blocks.pricing'),                    // gets $values, $block, $context
);
```

Field types: `text`, `textarea`, `select`, `toggle`, `number`, `image`, `link`, `list`. Values are cleaned by the
definition before your view sees them. Mark a field `->developerOnly()` to keep it to developers. A section with `width: full` and `padding: none` lets your block draw edge
to edge. More in [docs/php.md](docs/php.md#your-own-blocks).

## Use the builder anywhere else

The builder needs only an element and an adapter. Any backend works, as long as it can draw the page for the
preview (the PHP layer does that for Laravel; another stack draws the same HTML from the same JSON):

```html
<link rel="stylesheet" href="/vendor/filament-block-editor/page-builder.css">
<div id="builder" style="position: fixed; inset: 0"></div>
<script type="module">
  import { mountPageBuilder } from '/vendor/filament-block-editor/page-builder.js';

  mountPageBuilder(document.getElementById('builder'), {
    value: { sections: await (await fetch('/api/pages/1')).json() },
    adapter: {
      save: (value) => fetch('/api/pages/1', { method: 'PUT', body: JSON.stringify(value) }).then(() => ({ ok: true })),
      preview: (value) => fetch('/api/pages/1/preview', { method: 'POST', body: JSON.stringify(value) }).then((r) => r.text()),
      upload: (file) => { const body = new FormData(); body.append('file', file); return fetch('/api/uploads', { method: 'POST', body }).then((r) => r.json()); },
    },
    blocks: [/* own block definitions, from BlockRegistry::definitions() */],
    templates: [/* from SectionTemplates::all('en') */],
    locale: 'en',
    title: 'Home',
    backUrl: '/admin',
  });
</script>
```

The full option list and the adapter types are in [docs/v1-architecture.md](docs/v1-architecture.md) and
`builder/src/index.ts`.

## Ready-made blocks

The package registers five blocks for every site: FAQ (`fbe-faq`), map (`fbe-map`), icon list
(`fbe-icon-list`), pricing (`fbe-pricing`) and testimonials (`fbe-testimonials`). Anyone can also build a
form in the editor (the `form` block); your app saves the submissions through a `FormEndpoint`. Turn the
ready-made blocks off with `'core_blocks' => false`. More in [docs/php.md](docs/php.md#core-blocks).

## What changed in 2.0

2.0 is page format 2 (the full plan is [docs/v2-plan.md](docs/v2-plan.md)). Old pages need no data move: a
page value without a `version` is upgraded when it is read.

- Every page value has `version: 2`. Sections can be synced (`type: "ref"`) and locked (`lock`).
- Styles are data: a style bag per section and per block (desktop, tablet, phone, hover), plus class names,
  hide on a device, and developer-only custom CSS.
- A design kit (site colours, fonts, buttons, forms) as CSS variables, edited in the builder.
- Dynamic values (shop name, phone, links) in text, links and pictures; a form block; five ready-made blocks.
- Header and footer parts, shop info and synced sections in the builder, through new Filament hooks.
- Visible changes: every block carries a `look` prop, and the band on every second section counts with
  `:nth-of-type`.

## What changed from 0.1

1.0 is a rewrite. The 0.1 form field (`BlockSections`), the `ContentBlock`, `BlockStyle`, `SavedBlock` and media
library models and screens, and block presets are gone. No project used 0.1.

## Package development

```bash
composer install && npm install
php bin/export-rules.php   # after changing a limit in PHP: the builder's rules (builder/src/generated)
npm run build        # builder, its stylesheet and the public page.css into resources/dist
npm test             # builder tests (Vitest)
vendor/bin/phpunit   # PHP tests
vendor/bin/pint --test
```

The builder's limits come from PHP (`Support\BuilderRules`), and `tests/fixtures/shared` holds cases both
test suites run, so the two sides clean every value the same way. See
[docs/php.md](docs/php.md#the-rules-the-builder-checks).

`builder/demo/index.html` mounts the built bundle with an in-memory adapter for a quick look in a browser. The
workbench has a sample page at `/` (`composer serve`) and a demo builder at `/admin/demo-builder`.

## License

GPL-3.0-or-later, as before (see `LICENSE`).
