# PHP side of the page builder

This file covers the PHP content core: saving a page, drawing it, your own blocks, section
templates and theming. It needs Laravel and nothing else. The Filament layer and the builder
(JS) are described in `v1-architecture.md`.

## The page value

A page is a list of sections. Keep it in a JSON column, in whatever model you like.

```php
use Vortechron\FilamentBlockEditor\Content\PageContent;

// On save: the only way content should reach your storage.
$page->sections = PageContent::normalize($request->input('sections', []));

// In a form request: guards the outer shape (a list, at most 30, type "rich", not too long).
$request->validate(PageContent::rules());              // key "sections"
$request->validate(PageContent::rules('page.content')); // another key
```

`normalize()` keeps known fields and drops anything else. A section looks like this:

```php
['id' => 'a1b2c3d4', 'type' => 'rich', 'hidden' => true /* only when true */, 'data' => [
    'document'         => [/* BlockNote blocks */],
    'layout'           => 'plain',   // plain hero cards ticks reviews faq highlight banner product
                                     // poster editorial bento steps stats compare marquee
    'background'       => 'none',    // none | color | image
    'background_color' => null,      // "#rrggbb"
    'image'            => null,      // background picture: https://... or /path (never data:, javascript:, //host)
    'tint'             => 40,        // 0..100, darkness over the picture
    'card'             => false,     // words on a white card over the picture
    'padding'          => 'md',      // md none sm lg xl
    'font'             => 'theme',   // theme grotesk condensed serif poster geometric mono
    'align'            => 'auto',    // auto left center
    'text_color'       => null,      // "#rrggbb"
    'corners'          => 'theme',   // theme square soft round
    'button'           => 'theme',   // theme solid outline pill shadow
    'width'            => 'normal',  // normal | full (no max width, no side space)
    'anchor'           => null,      // "tentang": the section gets id="tentang" for "#tentang" links
]]
```

- `anchor` is a slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, 40 characters at most). Capitals become lower case
  and spaces become dashes. Anything else is `null`.
- Images are URLs, not disk paths. The same rule covers every image, video, audio, file and card
  picture inside a document.
- `PageContent::visible($sections)` leaves out the hidden ones. `PageContent::MAX_SECTIONS` is 30.

## Draw a page

In Blade:

```blade
<head>
    <x-filament-block-editor::styles />
</head>
<body>
    <x-filament-block-editor::page :sections="$page->sections" />
</body>
```

The `page` component wraps the sections in `<div class="sf-page">`. Extra attributes go on that wrapper
(`class`, `id`, `style`). `:sections` takes an array, a JSON string, or the whole `{"sections": [...]}` value.

From PHP (the builder's preview endpoint does this):

```php
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

$html = app(PageRenderer::class)->render($sections, new RenderContext(forBuilder: true, isPreview: true));
```

`render()` normalizes the sections first, so stored data is safe to pass in. Put the result inside an
element with the class `sf-page`, because the stylesheet reads its colours and fonts from there.

| `RenderContext` | What it adds |
| --- | --- |
| `new RenderContext()` | A visitor. No markers. |
| `isPreview: true` | `data-empty-label` on each section wrapper, and `data-preview` on `.sf-page` (page component). |
| `forBuilder: true` | `data-item="3.0"` (the place in the document) on every item, `bn-media-empty` spots for empty photos and videos, a placeholder for a missing own block. |

Every section is wrapped in `<div data-block-id="{id}">`. The builder's canvas finds sections with it.
A section that draws nothing (no words, no media, no colour) keeps its empty wrapper and has no `<section>`.

**Hidden sections are left off for everyone, the builder's canvas included.** That is what NakJual does:
the builder shows a "this section is hidden" note when you pick one, and the preview does not draw it.

### Photo slideshows

The `gallery` block swipes with CSS scroll snapping. The page component adds about 30 lines of inline
script for its arrows and dots, once, and only when the page has a slideshow. Pass `:script="false"` to
leave it out (for a strict Content-Security-Policy) and include your own.

## The stylesheet

`<x-filament-block-editor::styles />` writes one `<link>`.

- With Filament installed, the stylesheet is a Filament asset (`block-editor-page`, loaded on request),
  and `php artisan filament:assets` publishes it.
- Always, `php artisan vendor:publish --tag=filament-block-editor-assets` copies it to
  `public/vendor/filament-block-editor/page.css`. Both end at the same file.

The file is built from `resources/css/page/index.css` (plain CSS, no Tailwind):

```bash
npx esbuild resources/css/page/index.css --bundle --minify --outfile=resources/dist/page.css
```

### Theme it with CSS variables

Every variable has a default. Set the ones you want in your own CSS after the link, on `:root`, on `.sf-page`
or in the `style` attribute of the page wrapper.

```css
.sf-page {
    --sf-accent: #16a34a;
    --sf-accent-ink: #ffffff;
    --sf-radius: 0.5rem;
    --sf-heading-font: 'Playfair Display', serif;
    --sf-body-font: inherit;
}
```

| Variable | Default | Used for |
| --- | --- | --- |
| `--sf-accent` | `#2563eb` | Buttons, numbers, links, the banner band |
| `--sf-accent-ink` | `#ffffff` | Text on the accent colour. Set it dark for a light accent. |
| `--sf-accent-tint`, `--sf-accent-soft` | 10% and 30% of the accent | Pale backgrounds and thin borders |
| `--sf-ink` | `#0f172a` | Headings and strong text |
| `--sf-text` | `#475569` | Body text |
| `--sf-surface`, `--sf-alt` | white, `#f8fafc` | Section background, and the band every second plain section takes |
| `--sf-card`, `--sf-card-line`, `--sf-card-shadow` | white, thin line, soft shadow | Cards, tiles, reviews |
| `--sf-radius`, `--sf-gutter` | `1.25rem`, `clamp(1.25rem, 4vw, 2.5rem)` | Corners, space beside the text |
| `--sf-body-font` | system sans | The body font |
| `--sf-heading-font`, `--sf-heading-weight`, `--sf-heading-tracking`, `--sf-heading-case` | `inherit`, 800, `-0.025em`, `none` | Headings |
| `--font-bricolage-grotesque`, `--font-barlow-condensed`, `--font-bodoni-moda`, `--font-anton`, `--font-jost`, `--font-geist-mono` | the font's name | The heading font a section can pick. Load the web font yourself; `Enums\SectionFont::fontsFor($sections)` lists the ones a page uses. |

Rules that win over a section's own look use `!important` only for alignment, so a section's `align` choice
beats a block's own alignment. The reset the page needs (margins, list padding, box sizing) is scoped to
`.sf-page` with zero specificity.

The stylesheet is not in a cascade layer. Link it before your own CSS so your rules win. Utility classes
(Tailwind and the like) inside your own blocks lose to rules such as `.sf-rich p`; raise their specificity
or use `!important` where that matters.

## Your own blocks

PHP is the single source of truth. Register a block once (a service provider's `boot()`):

```php
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;

app(BlockRegistry::class)->register(
    OwnBlock::make('stationery-board')
        ->label('Stationery board')
        ->icon('pencil')                         // a lucide icon name
        ->description('Categories and items from the Barang screen.')
        ->fields([
            Field::text('heading')->label('Heading')->default('Stationery'),
            Field::textarea('intro'),
            Field::select('style')->options(['plain' => 'Plain', 'boxed' => 'Boxed'])->default('plain'),
            Field::toggle('show_prices')->default(true),
            Field::image('photo'),
            Field::link('link'),
            Field::number('limit')->min(1)->max(12),
            Field::list('items')->fields([Field::text('name')])->maxItems(6),
        ])
        ->view('blocks.stationery-board'),
);
```

The view gets three variables:

```blade
{{-- resources/views/blocks/stationery-board.blade.php --}}
<h2>{{ $values['heading'] }}</h2>   {{-- $values: cleaned, defaults applied --}}
{{-- $block: the raw BlockNote block, $context: the RenderContext ($context->forBuilder) --}}
```

- `OwnBlock::clean($values)` enforces each field's type, applies defaults, sends `image` and `link` values
  through the address rules, cuts a list to `maxItems`, and drops keys it does not declare. The renderer
  calls it before every draw, and `PageContent::normalize()` calls it when a document is stored.
- Each block is drawn inside `<div class="bn-own-block" data-own-block="stationery-board">`. A view that
  draws nothing leaves no wrapper for visitors.
- An unknown `kind` draws nothing for visitors and a `bn-media-empty` placeholder in the builder. Its stored
  values are kept, so a block that is missing for now does not lose its data.
- For an edge-to-edge block, set the section to `padding: none` and `width: full`.
- The builder gets `app(BlockRegistry::class)->definitions()` (a list of `OwnBlock::toArray()`) as JSON.

Field types: `text`, `textarea`, `select` (`options`), `toggle`, `number` (`min`, `max`), `image`, `link`,
`list` (`fields`, `maxItems`, lists may nest).

## Section templates

```php
use Vortechron\FilamentBlockEditor\Templates\SectionTemplates;

SectionTemplates::all('ms');   // or 'en'; anything else is English
// [['key' => 'hero', 'label' => 'Hero', 'category' => 'Skrin pertama', 'description' => '...',
//   'section' => ['id' => '...', 'type' => 'rich', 'data' => [...]]], ...]
```

24 built-in templates, in Malay and English, with copy that fits any page (no selling words). Buttons start
without a link; they draw as a plain label until the author sets one. Add your own, with a section value or
a closure that gets the locale:

```php
SectionTemplates::register(
    key: 'menu-board',
    label: 'Menu board',
    category: 'Our sections',
    section: ['type' => 'rich', 'data' => [
        'document' => [Blocks::ownBlock('stationery-board', ['heading' => 'Menu'])],
        'padding' => 'none',
        'width' => 'full',
    ]],
    description: 'The menu from the Menu screen.',
);
```

A template with a built-in key replaces the built-in one. Every template is normalized, so it is always a valid
section. A value that is not a section throws an `InvalidArgumentException` when you register it.

## Build blocks in PHP

`BlockNote\Blocks` makes valid BlockNote blocks, for templates, seeders and data migrations:

```php
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;

[
    Blocks::heading(1, 'Selamat datang'),                 // heading(level, text, alignment = 'left')
    Blocks::paragraph('Kami buat kerja yang kemas.'),
    Blocks::image('https://cdn.example/a.jpg', 'Kapsyen'),
    Blocks::button('Hubungi kami', 'https://wa.me/60123456789', 'outline'), // 'solid' | 'outline'
    Blocks::ownBlock('stationery-board', ['heading' => 'Alat tulis']),
]
```

Also `bullet`, `numbered`, `quote`, `toggle(title, children)`, `video`, `gallery(urls)`.

The `button` block allows `http(s)://`, `mailto:`, `tel:`, `#anchor` and `/path` addresses. Any other address
draws as a `<span class="bn-button">` with no link.

## Translations

`filament-block-editor::page.*` (card Show/Hide, review stars, slideshow labels, "section too long") and
`filament-block-editor::preview.*` (empty section, empty photo and video, missing block), in `ms` and `en`.
The page language is the app locale. Publish with `--tag=filament-block-editor-translations`.

## Tests

```bash
vendor/bin/phpunit
vendor/bin/pint --test
vendor/bin/testbench serve --port=8765   # sample page at /, builder view at /?builder=1, ?locale=ms
```
