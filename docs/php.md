# PHP side of the page builder

This file covers the PHP content core: saving a page, drawing it, styles, the design kit, locks,
synced sections, dynamic values, forms, your own blocks, the core blocks, section templates and
theming. It needs Laravel and nothing else. The Filament layer and the builder (JS) are described in
`v1-architecture.md`; the format 2 contract is `v2-plan.md`.

## The page value

A page is a **page value**: a version number and a list of sections. Keep it in a JSON column, in
whatever model you like.

```php
use Vortechron\FilamentBlockEditor\Content\PageValue;

// On save: the only way content should reach your storage.
$request->validate(PageValue::rules('page'));            // the outer shape, under the key "page"
$page->content = PageValue::normalize($request->input('page'));
// ['version' => 2, 'sections' => [...]]
```

- `PageValue::VERSION` is 2. A value with no version is format 1: a bare list of sections, or
  `['sections' => [...]]`. `PageValue::upgrade()` turns any older value into format 2, and
  `normalize()` upgrades and then cleans. So old content never needs a data migration: read it
  through `normalize()`.
- A version below 1 counts as 1, and one above 2 counts as 2.
- Add an upgrade step for a later format with `PageValue::registerUpgrade(2, fn (array $value) => ...)`.

`PageContent` still cleans a plain list of sections (`PageContent::normalize($sections)`,
`PageContent::rules('sections')`). A section looks like this:

```php
['id' => 'a1b2c3d4', 'type' => 'rich',
 'hidden' => true,                                   // only when true
 'lock' => ['move' => true, 'remove' => true],       // only when set (see Locks)
 'data' => [
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
    'style'            => [...],     // optional, see "Styles as data"
    'advanced'         => [...],     // optional, see "Styles as data"
]]
```

A **synced section** points at a section kept somewhere else (see "Synced sections"). It has no data:

```php
['id' => 'k9x8', 'type' => 'ref', 'ref' => 12, 'hidden' => true /* only when true */]
```

- `normalize()` keeps known fields and drops anything else. An empty `style` or `advanced` is left
  out, so a section with no custom look is the same as in format 1.
- Block ids are unique on a page: a block's style, `hide_on`, a form's key and the guard find a block
  by its id. `normalize()` keeps the first block with an id (in page order, through columns and
  children) and gives any later block with the same id a new one (`Content\UniqueBlockIds`). The
  builder gives every block of a copied section a new id too.
- `anchor` is a slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, 40 characters at most). Capitals become lower case
  and spaces become dashes. Anything else is `null`.
- `ref` is a positive number, or an id of letters, digits, dashes and underscores (40 at most).
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
(`class`, `id`, `style`). `:sections` takes a page value of any format, a bare list of sections, or JSON.

From PHP (the builder's preview endpoint does this):

```php
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

$html = app(PageRenderer::class)->render($sections, new RenderContext(forBuilder: true, isPreview: true));
```

`render()` takes a page value or a bare list, and upgrades and normalizes it first, so stored data is
safe to pass in. Put the result inside an element with the class `sf-page`, because the stylesheet
reads its colours and fonts from there.

| `RenderContext` | What it adds |
| --- | --- |
| `new RenderContext()` | A visitor. No markers. |
| `isPreview: true` | `data-empty-label` on each section wrapper, and `data-preview` on `.sf-page` (page component). |
| `forBuilder: true` | `data-item="3.0"` (the place in the document) on every item, `bn-media-empty` spots for empty photos and videos, a placeholder for a missing own block, hidden sections. |
| `values: [...]` or `->withValues([...])` | Dynamic values for this draw, such as `['entry.title' => 'Kopi']` (see "Dynamic values"). |

Every section is wrapped in `<div data-block-id="{id}">`. The builder's canvas finds sections with it.
A section that draws nothing (no words, no media, no colour) keeps its empty wrapper and has no `<section>`.

**Hidden sections** are left off the page for visitors and previews. The builder's canvas
(`forBuilder`) draws them with `data-hidden` on the wrapper, so the builder can show them dimmed.

### Marks the builder can rely on

| Mark | Where | When |
| --- | --- | --- |
| `data-block-id="{id}"` | every section wrapper | always |
| `data-empty-label="..."` | section wrapper | `isPreview` |
| `data-hidden` | section wrapper of a hidden section | `forBuilder` (visitors never get hidden sections) |
| `data-ref="{ref}"` | wrapper of a synced section | `isPreview` |
| `<figure class="bn-media-empty" data-empty-media="section">` | a synced section that cannot be found | `forBuilder` |
| `data-item="{path}"` | every item | `forBuilder` |
| `<span class="bn-dynamic" data-dynamic="{key}">` | a dynamic value in text | `forBuilder` |
| `<p class="fbe-form-note">` | a form with no endpoint ("Borang belum disambung") | `forBuilder` |
| `class="fbe-s-{id}"` / `class="fbe-b fbe-b-{id}"` | a styled section's `<section>` / a styled block's own element | when it has a style or advanced settings |
| `<style data-fbe-style>` | first child of the page, before the sections | when any section or block has a style |

### Photo slideshows

The `gallery` block swipes with CSS scroll snapping. The page component adds about 30 lines of inline
script for its arrows and dots, once, and only when the page has a slideshow. Pass `:script="false"` to
leave it out (for a strict Content-Security-Policy) and include your own.

## The stylesheet

`<x-filament-block-editor::styles />` writes the stylesheet `<link>`, then the site's design kit as
`<style data-fbe-kit>` (see "Design kit"). Pass `:kit="$kit"` to draw with a kit of your own.

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

## Styles as data

Every section and every block can carry an open-ended look per device, as data, never raw CSS.

```php
'style' => [
    'desktop' => ['padding_top' => '24px', 'color' => 'kit:text'],   // the base
    'tablet'  => ['padding_top' => '16px'],                          // max-width 1024px
    'phone'   => ['padding_top' => '12px', 'font_size' => '1rem'],   // max-width 767px
    'hover'   => ['background_color' => 'kit:primary'],              // color, background_color, border_color, shadow, opacity only
],
'advanced' => ['class' => 'price-card wide', 'css' => 'selector .bn-button { letter-spacing: .1em; }', 'hide_on' => ['phone']],
```

- Keys: `padding_top|right|bottom|left`, `margin_top|bottom`, `width`, `max_width`, `min_height`, `gap`,
  `color`, `background_color`, `border_color`, `font_family`, `font_size`, `letter_spacing`, `font_weight`,
  `line_height`, `text_transform`, `text_align`, `border_width`, `border_style`, `radius`, `shadow`, `opacity`.
  The full value grammar is in `v2-plan.md` section 2.
- A length is `0` or a number with a unit `px rem em % vw vh` (at most 2000px, 200rem/em, 100%/vw/vh).
  It is stored in lower case with a leading zero: `.5REM` is `0.5rem`, an opacity of `.5` is `0.5`.
  Only margins and letter spacing may be below zero (`StyleBag::NON_NEGATIVE`). A colour is `#rgb`,
  `#rrggbb`, `#rrggbbaa`, `transparent` or `kit:<key>`, stored in lower case. A font is `kit:heading`,
  `kit:body`, a section font or one of your fonts. Anything else is dropped.
- `Styling\StyleBag::clean()`, `Styling\Advanced::clean()` and `Styling\CustomCss::clean()` do the
  cleaning; `PageContent::normalize()` and `BlockNoteDocument::clean()` call them.
- `advanced.class`: up to 5 class names (not starting with `fbe-`). `advanced.hide_on`: `desktop`,
  `tablet`, `phone`. `advanced.css` is developer only (see "Locks"). In it the word `selector` is the
  element itself. It must stay on the element: every rule starts with `selector`, the only at-rules
  are `@media` and `@supports`, `url()` takes only a `/path` on this site, and there is no `<`, no
  backslash, no `+` or `~`, no `:root`, `:host` or `:has(`, and no `[value` selector. A value that
  breaks a rule is dropped whole.
- A styled section gets the class `fbe-s-{id}`; when `style` and a simple field (background colour,
  `align`) set the same thing, `style` wins.
- **Blocks** keep their look in the `look` prop, a JSON string `{"style": {...}, "advanced": {...}}`
  (`Styling\Look`). A styled block gets `fbe-b fbe-b-{id}` on its own element and keeps a stable id.
- `PageRenderer::render()` writes all the rules of one page into one `<style data-fbe-style>` before
  the sections (`Styling\StyleSheet`). Selectors are `.sf-page .fbe-s-{id}`, so they beat the layout CSS.

## Design kit

The site's design values: colours, fonts, text, corners, buttons and forms. The CMS stores one kit;
the package reads it through a `Design\KitSource`.

```php
use Vortechron\FilamentBlockEditor\Design\Kit;

Kit::defaults();             // today's look, with config('filament-block-editor.kit') merged over it
Kit::normalize($stored);     // a clean kit: bad values become the defaults
Kit::css($kit);              // the ".sf-page{...}" CSS the styles component prints
Kit::fonts();                // ['serif' => ['label' => 'Luxury', 'stack' => '...', 'href' => null], ...]
Kit::rules('kit');           // request rules for the outer shape
```

```php
// config/filament-block-editor.php
'kit' => ['colors' => ['primary' => '#c59d6e'], 'radius' => '8px'],
'fonts' => ['inter' => ['label' => 'Inter', 'stack' => "'Inter', sans-serif", 'href' => 'https://fonts.bunny.net/css?family=inter:400,700']],
```

- `Kit::css()` always writes `--kit-color-<key>` (8 fixed colours and up to 12 custom ones),
  `--kit-font-heading|body`, `--kit-radius`, `--kit-shadow-sm|md|lg|xl`, and the button and form
  variables. For each value that is not the package default it also points the old tokens at the kit
  (`--sf-accent: var(--kit-color-primary)`, `--sf-text`, `--sf-ink`, `--sf-heading-font`, `--sf-radius`, ...)
  and writes the button and form rules. So the default kit changes nothing, and a changed kit reaches
  every layout.
- Store a kit of your own with a source. The `OverridesKit` trait does the rest:

```php
use Vortechron\FilamentBlockEditor\Design\KitSource;
use Vortechron\FilamentBlockEditor\Design\OverridesKit;

final class MyKitSource implements KitSource
{
    use OverridesKit;

    protected function storedKit(): array
    {
        return Setting::get('kit', []);   // any shape: it is cleaned over Kit::defaults()
    }
}

$this->app->scoped(KitSource::class, MyKitSource::class);
```

- `app(KitSource::class)->override($kit)` draws with an unsaved kit until `override(null)`. The
  builder's preview uses it.
- The Filament builder always sends the current kit (`kit`) and `Kit::defaults()` (`kitDefaults`): the
  builder's colour and font pickers use them, and a saved kit's gaps are filled from `kitDefaults`.
  The design panel shows only when the page overrides `savePageBuilderKit()`.

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
        ->usesSiteInfo('contact')                // optional: the shop info groups the view reads
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
- `usesSiteInfo('contact', 'hours')` names the shop info groups (the keys of `getPageBuilderSiteInfo()`'s
  groups) that the view reads. `toArray()` sends them as `siteInfo` (left out when there are none), and the
  builder shows those groups of the shop info form in the block's panel. See "Shop info in the builder".

Field types: `text`, `textarea`, `select` (`options`), `toggle`, `number` (`min`, `max`), `image`, `link`,
`list` (`fields`, `maxItems`, lists may nest).

A `link` or `image` field also keeps a dynamic value such as `@site.whatsapp`; your view gets the
resolved address (see "Dynamic values").

## Locks and developer-only data

A developer can lock a section and keep some data to developers only. Everyone else's save goes
through `PageValue::guard()`, which puts the stored data back:

```php
$value = PageValue::normalize($request->input('page'));

if (! $user->isDeveloper()) {
    $value = PageValue::guard($value, PageValue::normalize($page->content));
}
```

- Section locks: `move` (stays at its place), `remove` (cannot be deleted or hidden: a missing one
  comes back with its stored hidden state, and a non-developer can not hide or show it), `content`
  (its document stays), `style` (its look fields, `style` and `advanced` stay, and so does the stored
  `look` of every block in it; a new block there gets no look). A section with any lock also keeps
  its type.
- Developer-only data: every `lock`, every `advanced.css` (of sections and of blocks, through columns,
  cards and indents), own block fields marked `->developerOnly()`, and a form's `webhook` action. A
  new element loses it; an element that was stored gets its stored value back.
- `Field::text('code')->developerOnly()` adds `developerOnly: true` to the builder's JSON. Only a
  top-level field may be developer only (a whole list may); one inside a list is refused.
- Running `guard()` twice changes nothing. The Filament page guards every save by default.

## Synced sections

A `ref` section draws a section kept somewhere else. Bind a resolver (the default finds nothing):

```php
use Vortechron\FilamentBlockEditor\Content\SectionResolver;

$this->app->bind(SectionResolver::class, fn () => new class implements SectionResolver {
    public function resolve(int|string $ref): ?array
    {
        return Document::find($ref)?->content['sections'][0];   // one rich section, or null
    }
});
```

The renderer cleans what it gets, draws it with the ref section's id, and marks the wrapper
`data-ref` in a preview. Refs inside a synced section are not followed. A missing one draws nothing
for visitors and "Seksyen segerak tiada" in the builder.

## Dynamic values

Values that come from the site, the page or an entry when a page is drawn:

```php
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

app(DynamicValues::class)
    ->register('site.phone', 'Telefon', fn (RenderContext $context) => $settings->phone)
    ->register('site.whatsapp', 'WhatsApp', fn () => 'https://wa.me/60123456789', type: 'link', group: 'Hubungan', settings: 'contact');

app(DynamicValues::class)->definitions();   // for the builder: key, label, type, group, preview (and settings)
app(DynamicValues::class)->resolve('site.phone', new RenderContext);
```

- A key is a lowercase name and one to three dotted parts (`site.phone`, `entry.photo`).
- In text: the inline content `{"type": "dynamic", "props": {"key": "site.phone"}}`, drawn as the
  escaped value (`Blocks::dynamic('site.phone')`).
- In links (button `url`, inline link `href`, own block `link` fields): `@site.whatsapp`, resolved,
  then checked by `Urls::link()`. In pictures (image and video `url`, own block `image` fields):
  `@entry.photo`, resolved, then checked by `Urls::media()`.
- Values in the RenderContext win: `(new RenderContext)->withValues(['entry.title' => 'Kopi'])`.
- `definitions(?RenderContext $context)` reads each `preview` with that context's values.
- `settings` (optional) is the shop info group the value comes from, such as `contact`. `definitions()`
  includes it only when it is set. The builder uses it to show that group of the shop info form wherever the
  value is used (a chip, a button link, a form action). Host definitions from `getPageBuilderDynamicValues()`
  may carry it too.
  `drawWith(array $values, Closure $draw)` adds values for one draw only, under the context's own.

In the Filament builder (`InteractsWithPageBuilder`), two hooks add values for one builder:

```php
// More definitions for this builder only, after the registered ones. Same key: this one wins.
// With no `preview`, the builder shows the render value below.
protected function getPageBuilderDynamicValues(): array
{
    return [['key' => 'page.title', 'label' => 'Tajuk halaman', 'type' => 'text', 'group' => 'Halaman']];
}

// The values of the page being built, by key. They are in the preview's context, so the preview
// and the chips in the builder show real values.
protected function getPageBuilderRenderValues(): array
{
    return ['page.title' => $this->record->title, 'page.url' => $this->record->url()];
}
```

Draw `renderPageBuilderPreview()` with `$this->getPageBuilderPreviewContext()`: a
`RenderContext(forBuilder: true, isPreview: true)` with the render values in it. A host that makes its own
context still gets them in the preview (`previewPageBuilder()` draws inside `DynamicValues::drawWith()`).

## Shop info in the builder

The shop info form (`getPageBuilderSiteInfo()`, saved by `savePageBuilderSiteInfo()`) shows in four places:

- the top bar's "Shop info" ("Maklumat kedai") button opens the whole form;
- the header and footer panel shows the whole form;
- a picked item's panel shows the groups it uses: an own block's `usesSiteInfo()`, and the `settings` group of
  each dynamic value in its words, links, pictures and form actions (`@site.email`, `@site.whatsapp_number`);
  a form shows them in its "After sending" part;
- the section panel shows every group used anywhere in the section.

While the owner types, the builder previews with the unsaved values: `previewPageBuilder($value, $kit,
$siteInfo)`, where `$siteInfo` is `['contact' => ['phone' => ...], ...]`. After the access check, the trait
draws through this hook, whose default ignores the values:

```php
use Closure;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;

protected function withPageBuilderSiteInfo(array $values, Closure $draw): string
{
    // The values come straight from the builder: clean them, and never save them here.
    $phone = is_string($values['contact']['phone'] ?? null) ? trim($values['contact']['phone']) : null;

    return app(DynamicValues::class)->drawWith(['site.phone' => $phone], $draw);
}
```

`$draw()` adds your render values (`getPageBuilderRenderValues()`) inside this hook, so a key there wins over
the same key here: keep `site.*` out of the render values. Override your settings source for the draw instead,
when your header and footer read the settings directly (set it, call `$draw()`, put it back in a `finally`).

## Forms

A `form` block is a form anyone can build in the editor. The package draws it; your app saves what
visitors send. Its props are `form` (a JSON string) and `look`:

```php
use Vortechron\FilamentBlockEditor\Forms\FormDefinition;

$form = FormDefinition::fromProps($block['props']);   // the stored form, cleaned
$form->fields();   $form->actions();   $form->action('email');
$request->validate($form->rules());                    // what the visitor sent
```

- Field types: `text email tel number date textarea select radio checkboxes consent`, at most 30,
  each with a unique `id` and `name`. A field of another type is dropped. Actions, at most one each:
  `email` (an address or `@site.email`), `whatsapp`, `redirect` (a link or an `@key`), `webhook`
  (developer only, `https://` only). Limits (`FormDefinition` constants): form name 200, label and
  placeholder 200, button text 80, success 500, textarea rows 2 to 10. The shape is in `v2-plan.md`
  section 7.
- Bind a `Forms\FormEndpoint` (`action(RenderContext): ?string`, `hiddenFields(RenderContext): array`).
  With the default (none) the button is disabled and the builder says "Borang belum disambung".
- The form posts `_form` (`{sectionId}.{blockId}`), `_token` (CSRF), `_t` (a signed time:
  `Forms\FormTimestamp::age($request->input('_t'))` is the seconds since the page was drawn, or null
  when forged) and `_website` (a honeypot that must stay empty). Load the stored form by `_form`,
  never from the request.
- After a send, `?form_sent={blockId}` or the session flash `filament-cms.form_sent` (the block id)
  shows the success message. Errors keyed `form.{blockId}.{name}` show under their fields, and the
  sent values come back when the old input's `_form` matches.

## Core blocks

Five own blocks every site gets (turn them off with `'core_blocks' => false` in the config):

| Kind | What |
| --- | --- |
| `fbe-faq` | A heading and questions that open one by one |
| `fbe-map` | An address and a Google Maps embed (only `https://www.google.com/maps...` is drawn). With no address of its own it shows `site.address`; its panel shows the shop's `contact` group |
| `fbe-icon-list` | Items with an icon, a title and words, in 1 to 4 columns, plain or boxed |
| `fbe-pricing` | Up to 6 plans with a price, features (one per line), a button, and a highlight |
| `fbe-testimonials` | Quotes with stars, a name, a role and a photo |

They are drawn by the `filament-block-editor::core.*` views and styled with the kit's variables.
`Support\Icons::svg('truck')` draws one of their 30 lucide icons (`Icons::names()`).

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

Also `bullet`, `numbered`, `quote`, `toggle(title, children)`, `video`, `gallery(urls)`, `form($form)`, and
`dynamic('site.phone')` for a dynamic value inside a block's content.

The `button` block allows `http(s)://`, `mailto:`, `tel:`, `#anchor` and `/path` addresses. Any other address
draws as a `<span class="bn-button">` with no link.

## The rules the builder checks

The builder checks every value before it sends it, so it never sends what the server would drop.
PHP stays the authority: `Support\BuilderRules::all()` collects every limit and word list (style keys
and their kinds, units and their maximums, hover keys, `NON_NEGATIVE`, the class name rule, form limits,
lock keys, kit lists and package defaults, `Enums\DocumentKind`, the dynamic key rule) from the classes
that clean them. After changing one, run:

```bash
php84 bin/export-rules.php   # writes builder/src/generated/rules.json and rules.d.json.ts
```

The builder imports `rules.json`; `rules.d.json.ts` gives TypeScript every word as a literal type.
`BuilderRulesTest` fails when the committed files differ from `all()`.

Rules a table can not hold (custom CSS, the length grammar, `@key` links, form cleaning) have shared
cases in `tests/fixtures/shared/*.json` (input and expected output). PHPUnit
(`SharedFixturesTest`) and Vitest (`builder/tests/shared-fixtures.test.ts`) both run them. Add a case
there when you change one of these rules.

- `Urls::linkOrReference($url)`: an address `Urls::link()` allows, or an `@key` (resolved when the
  page is drawn). `Urls::mediaOrReference($url)` is the same for pictures.

## Translations

`filament-block-editor::page.*` (card Show/Hide, review stars, slideshow labels, "section too long", form
words), `filament-block-editor::preview.*` (empty section, empty photo and video, missing block, missing
synced section, form not connected) and `filament-block-editor::core.*` (the core blocks), in `ms` and `en`.
The page language is the app locale. Publish with `--tag=filament-block-editor-translations`.

## Tests

```bash
vendor/bin/phpunit
vendor/bin/pint --test
vendor/bin/testbench serve --port=8765   # sample page at /, builder view at /?builder=1, ?locale=ms
```
