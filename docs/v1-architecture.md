# Block editor v1: architecture and contract

v1 replaces the v0.1 package (block sections stored as `ContentBlock` rows, block styles, saved blocks,
presets, media library) with the NakJual page builder, made generic. No project installs v0.1, so v1 is a
clean break. The NakJual source this is ported from lives in `~/Projects/nakjual` (read-only for this work).

## Three layers

| Layer | Where | Depends on | Who can use it |
| --- | --- | --- | --- |
| Builder (React, TypeScript) | `builder/` → built to `resources/dist/page-builder.js` + `.css` | nothing from the host; talks only through the adapter | any web app, any backend |
| Content core (PHP) | `src/Content/`, `src/Rendering/`, `src/Blocks/`, `resources/views/`, `resources/css/page/` → `resources/dist/page.css` | Laravel (Blade, Str, Validator) | any Laravel app |
| Filament layer (PHP) | `src/Filament/`, `src/FilamentBlockEditorPlugin.php` | Filament 5 + the two layers above | Filament panels |

Namespace stays `Vortechron\FilamentBlockEditor`. Composer name stays `vortechron/filament-block-editor`.
Class and file names below are the contract: other layers code against them.

## The page value (shared by every layer)

A page is a list of sections. Same shape as NakJual's `SalesPageBlocks`:

```json
{
  "sections": [
    {
      "id": "a1b2c3d4",
      "type": "rich",
      "hidden": true,
      "data": {
        "document": [ /* BlockNote blocks */ ],
        "layout": "plain",
        "background": "none",
        "background_color": null,
        "image": null,
        "tint": 40,
        "card": false,
        "padding": "md",
        "font": "theme",
        "align": "auto",
        "text_color": null,
        "corners": "theme",
        "button": "theme"
      }
    }
  ]
}
```

- `hidden` is present only when true. Hidden sections stay in the builder and are left off the public page.
- Field specs, enums and defaults are NakJual's (`app/Support/SalesPageBlocks.php`, `App\Enums\SectionLayout`,
  `App\Enums\SectionFont`), ported as `Content\PageContent`, `Enums\SectionLayout`, `Enums\SectionFont`.
- **Images are URLs, not disk paths.** A section background `image` and every image, video or file block hold
  an `http(s)://` URL or a root-relative `/...` URL. `normalize()` drops anything else (`javascript:`,
  `data:`, `//host`). There is no `image_url` field: the renderer uses `image` directly.
- At most 30 sections (`PageContent::MAX_SECTIONS`).

## Blocks inside a section

The BlockNote schema is NakJual's (`@vortechron/blocknote-kit`, now v0.3.0, plus NakJual's own blocks), with
these changes:

- **Removed (selling only):** `orderButton`, `priceTag`, `countdown`, `enquiryForm`, and any layout or item that
  only works with products or checkout. Their React and PHP code is not ported.
- **Kept:** every text, list, media, `gallery`, columns, card, spacer, divider and `layoutItem` block, and all
  16 section layouts unless a layout depends on removed blocks (document any dropped layout in the README).
- **New core block `button`:** props `{ text: string, url: string, variant: 'solid' | 'outline' }`. Renders
  `<a class="bn-button bn-button-{variant}" href="...">text</a>`. Allowed urls: `http(s)://`, `mailto:`,
  `tel:`, `#anchor`, root-relative `/path`; anything else renders as a `<span>` with no link.
- **New core block `ownBlock`:** a block the host app defines and draws. Props
  `{ kind: string, values: string }`, where `values` is a JSON object string (BlockNote props are scalars).
  - Builder: shows a card with the definition's label, icon and a one-line summary of the values. Picking it
    opens the item panel with a generated form built from the definition's fields. Unknown kinds show a
    warning card and keep their values.
  - PHP: `Blocks\BlockRegistry::render(kind, values, RenderContext)` renders the definition's Blade view with
    `$values` (array, defaults applied), `$block` (the raw block) and `$context`. Unknown kind → empty string
    (in builder preview: a `bn-media-empty` style placeholder saying the block is missing).

## Own blocks (how a host adds its own)

PHP is the single source of truth. The builder receives the definitions as JSON.

```php
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;

app(BlockRegistry::class)->register(
    OwnBlock::make('stationery-board')
        ->label('Stationery board')
        ->icon('pencil')                      // a lucide icon name
        ->description('Categories and items from the Barang screen.')
        ->fields([
            Field::text('heading')->label('Heading')->default('Stationery'),
            Field::textarea('intro')->label('Intro'),
            Field::select('style')->options(['plain' => 'Plain', 'boxed' => 'Boxed'])->default('plain'),
            Field::toggle('show_prices')->label('Show prices')->default(true),
            Field::image('photo')->label('Photo'),
            Field::link('link')->label('Link'),
            Field::number('limit')->label('Limit'),
            Field::list('items')->label('Items')->fields([Field::text('name')])->maxItems(6),
        ])
        ->view('blocks.stationery-board'),   // gets $values, $block, $context
);
```

`OwnBlock::toArray()` / `BlockRegistry::definitions()` produce the JSON the builder gets:

```json
{ "kind": "stationery-board", "label": "...", "icon": "pencil", "description": "...",
  "fields": [ { "name": "heading", "label": "Heading", "type": "text", "default": "Stationery" },
              { "name": "items", "type": "list", "fields": [ ... ], "maxItems": 6 } ],
  "defaults": { "heading": "Stationery", ... } }
```

Field types: `text`, `textarea`, `select` (`options: [{value,label}]`), `toggle`, `number`, `image` (URL via the
adapter's upload), `link` (URL, same allow-list as `button`), `list` (`fields`, `maxItems`). Values are cleaned
on the PHP side by the definition (`OwnBlock::clean(array $values): array`) before rendering.

## Section templates

Ready-made sections for the builder's "add" panel. Ported from NakJual's `SectionTemplates` / `SectionLibrary`
with generic copy (no selling words), in Malay and English: `Templates\SectionTemplates::all(string $locale): array`
returns `[{ key, label, category, section }]` where `section` is a full section value. Hosts may add their own
with `SectionTemplates::register(...)`.

## Rendering (PHP)

- `Rendering\RenderContext` — `new RenderContext(forBuilder: bool = false, isPreview: bool = false)`.
- `Rendering\PageRenderer::render(array $sections, RenderContext $context): string` — normalizes, skips hidden
  sections unless `forBuilder`, and draws each section (port of `storefront/blocks/rich.blade.php` +
  `SectionLayoutRenderer` + `BlockNoteRenderer`).
- Preview markers are NakJual's, unchanged, so the builder's canvas works as is: each section is wrapped in
  `<div data-block-id="{id}" data-empty-label="...">` when `isPreview`; items carry `data-item="{path}"` when
  `forBuilder`; empty media show `<figure class="bn-media-empty" data-empty-media="{kind}">`.
- CSS class prefix stays `sf-` (section frame) and `bn-` (blocks) to keep the port faithful.
- Blade: `<x-filament-block-editor::page :sections="$sections" :context="$context" />` and
  `<x-filament-block-editor::styles />` (links `page.css` through Filament's asset manager when Filament is
  installed, else `asset('vendor/filament-block-editor/page.css')` published by `vendor:publish`).
- Theming: `page.css` reads CSS custom properties (`--sf-accent`, `--sf-text`, `--sf-heading-font`,
  `--sf-body-font`, `--sf-radius`, ...) with sensible defaults; the host's own CSS overrides them.

## The builder (JS) — public API

```ts
import { mountPageBuilder } from './page-builder.js';

const builder = mountPageBuilder(element, {
  value: { sections: [...] },
  adapter: {
    save(value): Promise<{ ok: true } | { ok: false; errors: Record<string, string> }>,
    preview(value): Promise<string>,          // full HTML document, drawn with RenderContext(forBuilder, isPreview)
    upload(file: File, kind: 'image' | 'video' | 'file'): Promise<{ url: string; name?: string }>,
  },
  blocks: [ /* own block definitions */ ],
  templates: [ /* section templates */ ],
  locale: 'ms',                // 'ms' | 'en'; strings for both ship in the bundle
  strings: { /* optional overrides */ },
  title: 'Halaman utama',
  backUrl: '/admin/pages',     // the "back" button; omit to hide it
  viewUrl: 'https://example.com/',  // "view page" button; omit to hide it
  accent: '#2563eb',
  onChange(value) {},
});

builder.getValue();
builder.unmount();
```

- Everything NakJual's builder did through Inertia, Wayfinder routes or the page form now goes through these
  options. No `@inertiajs/*`, no `@/routes`, no NakJual types remain.
- Kept from NakJual: canvas with the live page frame, layers panel, add panel with templates, section panel
  (content and style tabs), item panel, drag and drop, section text editor, desktop/phone switch, preview
  dialog, keyboard shortcuts, mobile dock, undo of the last change if NakJual has it.
- Left out: products, checkout, tracking, design/theme tab, AI writer and AI undo, publish checks, plan
  paywall, custom domain, discount codes.
- UI kit: copy the shadcn components the builder uses into `builder/src/ui/`. Styles are scoped under a root
  class so they never leak into the host page (Tailwind build is fine, output into `page-builder.css`).
- `npm run build` writes `resources/dist/page-builder.js` (ESM, React bundled in), `page-builder.css` and
  `page.css`. Built files are committed: host apps never run a JS build.

## The Filament layer

- `Filament\Pages\PageBuilderPage` — an abstract full-screen Filament page that mounts the builder and wires the
  adapter to Livewire: `save(array $value)`, `preview(array $value): string`, uploads through a Livewire
  temporary upload stored on `config('filament-block-editor.disk')`. Host pages implement
  `getPageValue(): array`, `savePageValue(array $value): void` and `renderPreview(array $sections): string`.
- `FilamentBlockEditorPlugin` registers the assets and nothing else by default.

## Tests

- PHP: Testbench (`tests/`), porting NakJual's renderer and normalize tests; own block registry, cleaning,
  rendering and unknown kinds; `button` url allow-list; templates are valid sections; preview markers.
- JS: `builder/` tests with Vitest (port `builder.test.ts`, `page-frame.test.ts`), plus adapter tests.
- A demo page `builder/demo/index.html` mounts the built bundle with an in-memory adapter (preview returns
  HTML drawn by a tiny JS stub) for browser checks.
