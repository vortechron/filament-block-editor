# Filament Block Editor

A Notion-style block editor and page builder for **Filament 5**.

Build web pages out of full-width sections. Each section is a [BlockNote](https://www.blocknotejs.org) document that already wears its background, padding and width while you edit it, so the form looks like the finished page.

- **Block editor field** – headings, lists, quotes, code, tables, images, video (YouTube, Vimeo, Loom or a file), audio, files, two and three columns, fold-out cards, spacers, per-item width and spacing, and a font picker.
- **Page builder field** – a list of sections with a "+" menu above and below: blank block, ready-made designs, saved blocks, media, or one of your page's own sections (a contact form, a pricing table).
- **Style sheet** – per section: colour, image or looping video background, tint, blur, position, background card, content width, full screen height, padding and spacing. Every change shows in the editor straight away.
- **Block styles** – save a look once and let many blocks follow it. Change one setting on a block and only that setting stops following.
- **Saved blocks** – save any section to the library and reuse it on any page.
- **Media library** – upload once, reuse everywhere. A file still in use cannot be deleted.
- **Public rendering** – safe, sanitised HTML from PHP. No JavaScript needed on the public page.
- **Teams** – in a panel with tenancy, every tenant gets its own library. Without tenancy, the app shares one.

## Requirements

- PHP 8.2+
- Laravel 11.28+
- Filament 5

## Installation

```bash
composer require vortechron/filament-block-editor
php artisan migrate
php artisan filament:assets
php artisan storage:link
```

The package runs its own migrations. It creates four tables: `block_editor_blocks`, `block_editor_saved_blocks`, `block_editor_styles` and `block_editor_media`.

Add the plugin to every panel that uses the editor:

```php
use Vortechron\FilamentBlockEditor\FilamentBlockEditorPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        // ...
        ->plugin(FilamentBlockEditorPlugin::make());
}
```

The plugin adds three screens under a **Content** navigation group (Saved Blocks, Block Styles, Media), and the upload routes the editor uses. Those routes sit behind the panel's own sign-in and tenant checks.

## A page made of sections

Add the trait to the model that owns the page:

```php
use Vortechron\FilamentBlockEditor\Models\Concerns\HasContentBlocks;

class Page extends Model
{
    use HasContentBlocks;
}
```

Add the field to its form:

```php
use Vortechron\FilamentBlockEditor\Forms\Components\BlockSections;

public static function form(Schema $schema): Schema
{
    return $schema->components([
        TextInput::make('title'),
        BlockSections::make(), // edits $page->contentBlocks
    ]);
}
```

Tip: give the create and edit pages a full width, so a section is edited at the width your visitors see:

```php
protected Width|string|null $maxContentWidth = Width::Full;
```

Show it on your site:

```blade
<head>
    <x-filament-block-editor::styles :blocks="$page->contentBlocks" />
</head>
<body>
    <x-filament-block-editor::blocks :blocks="$page->contentBlocks" :page="$page" />
</body>
```

Eager load the styles when you query many pages: `->with('contentBlocks.blockStyle')`.

### More than one list of sections

```php
public function footerBlocks(): MorphMany
{
    return $this->contentBlocksIn('footer');
}
```

```php
BlockSections::make('footerBlocks')->collection('footer'),
```

### Copy a page

```php
$template->copyContentBlocksTo($newPage);
```

## Just the editor

For a single rich text field, use the editor on its own. Store it in a JSON column cast to `array`:

```php
use Vortechron\FilamentBlockEditor\Forms\Components\BlockNoteEditor;

BlockNoteEditor::make('body'),
```

```blade
<x-filament-block-editor::styles :content="$post->body" />
<x-filament-block-editor::content :content="$post->body" />
```

## Your own page sections

Let editors place sections that your site draws itself:

```php
use Vortechron\FilamentBlockEditor\PageSections;

// In a service provider's boot()
PageSections::register(
    kind: 'contact',
    label: 'Contact form',
    view: 'sections.contact',      // receives $block and $page
    icon: Heroicon::OutlinedEnvelope,
    description: 'The contact form.',
    repeatable: false,             // only once per page
);
```

Limit what one field offers with `BlockSections::make()->sections(['contact'])`.

## Your own ready-made designs

```php
use Vortechron\FilamentBlockEditor\Support\BlockPresetLibrary;

BlockPresetLibrary::register('pricing', 'Pricing', 'Content sections', [
    'content' => [
        BlockPresetLibrary::heading(2, 'Simple pricing', 'center'),
        BlockPresetLibrary::paragraph('One plan. Everything included.', 'center'),
    ],
    'padding_size' => 'lg',
    'content_width' => 'narrow',
]);
```

## Plugin options

```php
FilamentBlockEditorPlugin::make()
    ->navigationGroup('Website')
    ->savedBlocks()          // show the Saved Blocks screen (default)
    ->blockStyles()          // show the Block Styles screen (default)
    ->mediaLibrary()         // show the Media screen (default)
    ->canManageLibraryUsing(fn (): bool => auth()->user()->isAdmin());
```

People who cannot manage the library can still use it from the page builder.

## Configuration

```bash
php artisan vendor:publish --tag=filament-block-editor-config
```

| Key | Default | What it does |
|---|---|---|
| `disk` | `public` | Where uploads are stored. Must be publicly readable. |
| `directory` | `block-editor` | Folder on that disk. |
| `max_upload_size` | `20480` | Largest upload, in KB. |
| `fonts.enabled` | `true` | Show the font picker. |
| `fonts.web_fonts_url` | Bunny Fonts | Where web fonts load from. `null` to load them yourself. |
| `run_migrations` | `true` | Set to `false` if you publish the migrations. |

## Styling the public page

The public stylesheet uses CSS custom properties you can override on any parent element:

```css
main {
    --fbe-heading-font: 'Inter', sans-serif;
    --fbe-text-size: 1rem;
    --fbe-line-height: 1.75rem;
    --fbe-accent: #4f46e5;
}
```

## Development

```bash
composer install
npm install
npm run build              # builds resources/dist
vendor/bin/phpunit
composer serve             # demo app at http://127.0.0.1:8000/admin (admin@example.com / password)
```

`resources/dist` is committed, so apps never need Node.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE).

Why GPL: the two and three column layout comes from [`@blocknote/xl-multi-column`](https://www.blocknotejs.org/docs/features/blocks/layout), which is licensed GPL-3.0 or commercial, and its code is bundled in `resources/dist`. The rest of BlockNote is MPL-2.0, Mantine and React are MIT.
