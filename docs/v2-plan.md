# Page format 2: the full platform plan and contract

Agreed with Amirul on 3 November 2026. This file is the contract for the build: every track codes against the
names and shapes below. If a track must change the contract, it writes the change in "Deviations" at the end
and says why.

Research behind it: `docs/research/elementor-architecture.md` (Elementor, Puck, GrapesJS) and the Shopify theme
editor (sections and blocks with a settings schema, header/footer section groups, nested theme blocks, the real
page drawn on the server and shown in a frame).

## Rules every track keeps

1. **Draw once, on the server.** Every block is drawn by PHP (Blade). The builder shows the server's HTML in its
   frame. Never add a second (React) drawing of a block for the public page.
2. **Code adds kinds, data changes everything else.** New block types, new form actions and new entry types are
   code. Styles, form fields, layout, header and footer, design values, content and locks are data.
3. **Every stored value has a version** and is upgraded on read by upgrade steps. Never require a data migration
   to read old content.
4. **One save path.** The builder, the Filament screens, the API and MCP all save through the same store, which
   checks, cleans, upgrades, guards locks and keeps versions.
5. **Clean on the way in, escape on the way out.** Every value from a client, a visitor or an AI goes through a
   whitelist. CSS values are typed, never raw (except developer-only custom CSS, cleaned by `CustomCss`).
6. Unknown data is kept, not dropped, when it belongs to a block kind that is only missing for now (same rule as
   own blocks today).

## Repos and tracks

| Track | Repo | What |
| --- | --- | --- |
| A — PHP core | `~/Projects/filament-block-editor` | format 2, styles, advanced, locks, synced sections, dynamic values, design kit, form block, core block pack, builder-render fixes |
| B1 — builder: design | same repo, `builder/` | format 2 in the builder, style panel, advanced panel, locks, design kit panel |
| B2 — builder: content | same repo, `builder/` | form editor, dynamic values, synced and saved sections, header/footer panel with shop info, polish |
| C1 — CMS core | `~/Projects/filament-cms` | documents table, store, kit storage, header/footer parts, synced sections, shop info in the builder, dynamic site values |
| C2 — CMS forms | same repo | form submit endpoint, actions, submissions table, "Borang" inbox |
| C3 — CMS entries | same repo | entry types, entry screens, list block, card and entry-page templates, entry pages |
| C4 — CMS MCP | same repo | the site's `/mcp` server on `laravel/mcp` |
| D — Adam | `~/Projects/adamshop` | upgrade, header/footer as parts, kit values, MCP route, deploy |

Order: A and B1 together → B2 and C1 together → C2, C3, C4 together → D.

## 1. The page value, format 2

```json
{
  "version": 2,
  "sections": [
    {
      "id": "a1b2c3d4",
      "type": "rich",
      "hidden": true,
      "lock": { "move": true, "remove": true, "content": true, "style": true },
      "data": {
        "document": [],
        "layout": "plain", "background": "none", "background_color": null, "image": null, "tint": 40,
        "card": false, "padding": "md", "font": "theme", "align": "auto", "text_color": null,
        "corners": "theme", "button": "theme", "anchor": null, "width": "normal",
        "style": { "desktop": {}, "tablet": {}, "phone": {}, "hover": {} },
        "advanced": { "class": null, "css": null, "hide_on": [] }
      }
    },
    { "id": "k9x8", "type": "ref", "ref": 12, "hidden": true }
  ]
}
```

- `version` is `PageValue::VERSION = 2`. A value with no version is format 1: either a bare list of sections or
  `{ "sections": [...] }`. Both upgrade to format 2 with no other change.
- `hidden` and each `lock` key are present only when true. `lock` is left out when empty.
- `data.style` and `data.advanced` are new and optional. After cleaning, empty style variants and empty advanced
  keys are left out, so a section with no custom style looks the same as in format 1 plus `version`.
- The existing section fields stay as they are (they are the simple presets the client uses). `style` adds the
  open-ended part on top. When both set the same thing, `style` wins.
- `type: "ref"` is a synced section (see 5). It has `ref` (a positive integer or an id string up to 40
  characters) and no `data`.
- At most 30 sections, as before.

### PHP (track A)

- New `Content\PageValue`:
  - `const VERSION = 2`;
  - `upgrade(mixed $raw): array` returns a format 2 value from any older value, running upgrade steps in order;
  - `normalize(mixed $raw): array` = upgrade, then clean everything (calls `PageContent::normalize` for
    sections) and returns `['version' => 2, 'sections' => [...]]`;
  - `rules(string $attribute = 'value'): array` request rules for the outer shape;
  - `guard(array $new, array $stored): array` for a save by a non-developer (see 4);
  - `registerUpgrade(int $from, Closure $step)` so hosts or later releases add steps.
- `PageContent::normalize()` keeps working on a list of sections and now also accepts `ref` sections, `lock`,
  `data.style` and `data.advanced`. `PageContent::rules()` accepts `type` `rich` or `ref`.
- `PageRenderer::render()` accepts a page value or a bare list (it upgrades first).

## 2. Styles as data

One style bag shape for sections, blocks and own blocks:

```json
{ "desktop": { "padding_top": "24px", "color": "kit:text" },
  "tablet":  { "padding_top": "16px" },
  "phone":   { "padding_top": "12px", "font_size": "1rem" },
  "hover":   { "background_color": "kit:primary" } }
```

`desktop` is the base. `tablet` applies at `max-width: 1024px`, `phone` at `max-width: 767px`. `hover` allows only
`color`, `background_color`, `border_color`, `shadow` and `opacity`.

| Key | CSS | Value |
| --- | --- | --- |
| `padding_top`, `padding_right`, `padding_bottom`, `padding_left` | padding-* | length ≥ 0 |
| `margin_top`, `margin_bottom` | margin-* | length |
| `width`, `max_width`, `min_height` | width, max-width, min-height | length ≥ 0 |
| `gap` | gap | length ≥ 0 |
| `color`, `background_color`, `border_color` | color, background-color, border-color | color |
| `font_family` | font-family | font |
| `font_size`, `letter_spacing` | font-size, letter-spacing | length |
| `font_weight` | font-weight | `300` … `900` in steps of 100 |
| `line_height` | line-height | unitless number 0.8 to 3, or a length |
| `text_transform` | text-transform | `none` `uppercase` `lowercase` `capitalize` |
| `text_align` | text-align | `left` `center` `right` `justify` |
| `border_width` | border-width | length ≥ 0 |
| `border_style` | border-style | `none` `solid` `dashed` `dotted` |
| `radius` | border-radius | length ≥ 0, or `kit:radius` |
| `shadow` | box-shadow | `none` `sm` `md` `lg` `xl` → `var(--kit-shadow-sm)` … |
| `opacity` | opacity | number 0 to 1 |

Value grammar:

- **length**: `0`, or a number with at most 3 decimals and a unit `px` `rem` `em` `%` `vw` `vh`. Absolute value at
  most 2000 for px, 200 for rem/em, 100 for % / vw / vh.
- **color**: `#rgb`, `#rrggbb` or `#rrggbbaa` (stored lowercase), `transparent`, or `kit:<key>` (a design kit
  colour, `[a-z0-9-]{1,30}`) → `var(--kit-color-<key>)`.
- **font**: `kit:heading`, `kit:body`, an `Enums\SectionFont` value other than `theme`, or a host font key from
  `config('filament-block-editor.fonts')`.
- Anything else is dropped by cleaning. Unknown keys are dropped.

### Advanced

```json
{ "class": "price-card wide", "css": "selector .bn-button { letter-spacing: .1em; }", "hide_on": ["phone"] }
```

- `class`: up to 5 class names `[A-Za-z][A-Za-z0-9_-]{0,40}`, added to the element.
- `css`: **developer only** (see 4), at most 5000 characters. The word `selector` is replaced by the element's own
  selector (Elementor's rule). Cleaned by `Styling\CustomCss::clean()`: no `<` at all, no `@import`, no
  `expression(`, no `javascript:`, no `behavior:`, `url()` only with `https://` or a `/path`. A value that fails is
  dropped whole.
- `hide_on`: any of `desktop` (≥ 1025px), `tablet`, `phone`. Drawn as `display: none` in that width.

### Drawing styles (track A)

- New `Styling\StyleBag::clean(mixed $bag): array` and `Styling\Advanced::clean(mixed $advanced): array`.
- New `Styling\StyleSheet`: collects rules while a page is drawn. `PageRenderer::render()` starts a sheet, draws,
  and puts one `<style data-fbe-style>…</style>` before the sections when any rule exists.
- A section with style or advanced gets the class `fbe-s-{sectionId}` on its `<section>`. A block gets
  `fbe-b-{blockId}` on its outer wrapper (wrap it in `<div class="fbe-b fbe-b-{id}">` when it has no single
  outer element). Selectors are `.sf-page .fbe-s-{id}` (and `:hover`), so they beat the layout CSS.
- Section padding keys set the section's own padding (not its body), so they override the `padding` preset.

### Style on blocks inside a section

BlockNote props are plain values, so every block (the kit's, ours and own blocks) gets one more prop:
`look`, a JSON string of `{ "style": {…}, "advanced": {…} }`, default `""`. `BlockNoteDocument::clean()` cleans
it with `StyleBag` and `Advanced` and stores it again as compact JSON, or `""` when empty. Block ids are kept, so
`fbe-b-{id}` is stable.

## 3. Design kit (site design values)

Stored by the CMS as one document (see C1). Shape:

```json
{
  "version": 1,
  "colors": { "primary": "#2563eb", "secondary": "#0f172a", "accent": "#f59e0b", "text": "#0f172a",
              "muted": "#64748b", "background": "#ffffff", "surface": "#f8fafc", "border": "#e2e8f0" },
  "custom_colors": [ { "key": "gold", "label": "Emas", "value": "#c59d6e" } ],
  "fonts": { "heading": "theme", "body": "theme" },
  "text": { "base_size": "16px", "heading_weight": "700" },
  "radius": "8px",
  "buttons": { "style": "solid", "radius": "8px", "size": "md", "text_transform": "none", "font_weight": "600" },
  "forms": { "style": "outline", "radius": "8px", "labels": "above" }
}
```

- At most 12 custom colours. Their keys must not reuse the 8 fixed keys.
- `fonts.*`: `theme`, an `Enums\SectionFont` value or a host font key.
- `buttons.style`: `solid` `outline` `pill` `shadow`. `buttons.size`: `sm` `md` `lg`. `forms.style`: `outline`
  `filled` `underline`. `forms.labels`: `above` `hidden`.
- Track A: `Design\Kit` with `defaults()` (package defaults, then `config('filament-block-editor.kit')` merged
  over them), `normalize(mixed $raw): array`, `css(array $kit): string`, and `fonts(): array` (fixed fonts plus
  `config('filament-block-editor.fonts')`, each `['label' => …, 'stack' => …, 'href' => ?url]`).
- `Kit::css()` writes `.sf-page{…}` with `--kit-color-<key>` for every colour, `--kit-font-heading`,
  `--kit-font-body`, `--kit-radius`, `--kit-shadow-sm|md|lg|xl`, button and form variables, **and** maps the old
  names to them (`--sf-accent: var(--kit-color-primary)`, `--sf-text`, `--sf-heading-font`, `--sf-body-font`,
  `--sf-radius`, …), so every existing layout follows the kit. It also writes the button and form rules that read
  these variables.
- `Design\KitSource` (interface): `current(): array`. Default binding returns `Kit::defaults()`. The CMS binds a
  source that reads the stored kit. `KitSource` also has `override(array $kit)` for the current request, used by
  the builder preview so unsaved kit changes show.
- `<x-filament-block-editor::styles />` prints the page stylesheet link and then `<style data-fbe-kit>` with
  `Kit::css(app(KitSource::class)->current())`. A `:kit` attribute overrides it.

## 4. Locks and developer-only data

- Section `lock` keys: `move` (can't be moved), `remove` (can't be deleted or hidden), `content` (its document
  can't change), `style` (its look fields, `style` and `advanced` can't change).
- Own block fields can be marked `Field::…->developerOnly()`. The builder hides them from non-developers.
- Developer-only data: every `lock`, `advanced.css`, developer-only own block fields, and the form `webhook`
  action.
- `PageValue::guard(array $new, array $stored): array` runs on every save by a non-developer (the store decides
  who is a developer). By section and block id it:
  1. copies the stored developer-only data back over the new value, and drops it from elements that are new;
  2. for a section locked `remove`: puts it back if it is missing (at its stored position, clamped), and unhides it;
  3. for a section locked `move`: puts it back at its stored position among the sections;
  4. for `content`: keeps the stored `document`; for `style`: keeps the stored look fields, `style` and `advanced`.
- The builder gets `developer: boolean`. Developers see a "Kunci" (lock) control on each section and the
  developer-only fields. Non-developers don't see the buttons a lock blocks.

## 5. Synced sections and saved sections

- A synced section is a document of kind `section` (C1) that holds one rich section. A page uses it with
  `{ "id", "type": "ref", "ref": <document id> }`.
- Track A: `Content\SectionResolver` interface: `resolve(int|string $ref): ?array` returns one cleaned rich
  section or null. Default binding resolves nothing. The renderer draws the resolved section with the ref
  section's `id` as its wrapper id and `data-ref="{ref}"` on the wrapper in a preview. Only one level: a `ref`
  inside a synced section is not followed. A missing one draws nothing for visitors and a placeholder in the
  builder ("Seksyen segerak tiada").
- Saved sections are copies: the CMS stores them as documents of kind `template` and sends them in the builder's
  `templates` with category `saved`.

## 6. Dynamic values

A value that comes from the site, the page or an entry at draw time.

- **In text:** a BlockNote inline content item `{ "type": "dynamic", "props": { "key": "site.phone" } }`.
  `BlockNoteDocument` keeps it when the key matches `^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,3}$`. Drawn as the escaped
  value; in the builder wrapped in `<span class="bn-dynamic" data-dynamic="{key}">`. An empty value draws nothing
  for visitors and the value's label in the builder.
- **In links** (button `url`, inline link `href`, own block `link` fields): a value `@site.whatsapp` (same key
  rule with a leading `@`) is kept, resolved at draw time, then checked by `Urls::link()`.
- **In pictures** (image/video block `url`, own block `image` fields): `@entry.photo` is kept, resolved, then
  checked by `Urls::media()`.
- Track A: `Content\DynamicValues` singleton:
  `register(string $key, string $label, Closure $resolve, string $type = 'text', string $group = 'Site')` where
  type is `text`, `link` or `image` and `$resolve` gets the `RenderContext`; `definitions(): array` for the
  builder (`key`, `label`, `type`, `group`, `preview`); `resolve(string $key, RenderContext $context): ?string`.
- `RenderContext` gets `public array $values = []` and `withValues(array $values): self`. Values in the context
  win over the registry (entries put `entry.*` there). Keep the constructor's two first arguments as they are.
- Own blocks keep reading `$values`. A host view can call `app(DynamicValues::class)->resolve(...)` too.

## 7. Form block

A block anyone can build in the editor. It is drawn by the package; submissions are handled by the host (the CMS).

BlockNote type `form`, `content: "none"`, props `{ "form": "<JSON>", "look": "" }`. The JSON:

```json
{
  "name": "Borang pertanyaan",
  "fields": [
    { "id": "f1", "type": "text", "name": "nama", "label": "Nama", "placeholder": "", "required": true, "width": "half" },
    { "id": "f2", "type": "tel", "name": "telefon", "label": "Telefon", "required": true, "width": "half" },
    { "id": "f3", "type": "select", "name": "servis", "label": "Servis", "options": ["Fotostat", "Parcel"] },
    { "id": "f4", "type": "textarea", "name": "mesej", "label": "Mesej", "rows": 4 },
    { "id": "f5", "type": "consent", "name": "setuju", "label": "Saya setuju dihubungi.", "required": true }
  ],
  "submit": { "text": "Hantar", "align": "left" },
  "success": "Terima kasih. Kami akan hubungi anda.",
  "actions": [
    { "type": "email", "to": "@site.email", "subject": "Pertanyaan baru dari website" },
    { "type": "whatsapp", "to": "@site.whatsapp_number", "message": "Hai, saya {nama}. {mesej}" },
    { "type": "redirect", "url": "/terima-kasih" },
    { "type": "webhook", "url": "https://hooks.example.com/x" }
  ]
}
```

- Field types: `text` `email` `tel` `number` `date` `textarea` `select` `radio` `checkboxes` `consent`. At most 30
  fields. `name` is `[a-z][a-z0-9_]{0,39}`, unique in the form (made unique by cleaning). `width`: `full` `half`.
  `options` up to 30 strings for `select`, `radio`, `checkboxes`. Labels up to 200 characters.
- Every submission is saved; there is no "save" action to switch off.
- Actions: `email` (`to` is an email or `@site.email`; at most one), `whatsapp` (after saving, the visitor is sent
  to a wa.me link with the message, `{name}` placeholders filled), `redirect` (a link the `Urls::link` rules
  allow), `webhook` (developer only, `https://` only). At most one each.
- Track A: `Forms\FormDefinition` (`fromProps(array $props): self`, `normalize(mixed $raw): array`,
  `rules(): array` for the visitor's input, `fields()`, `actions()`), `Forms\FormRenderer` (draws `<form>` with
  labels, inputs, a honeypot field `_website`, a time field `_t`, the CSRF token, and `_form` =
  `{sectionId}.{blockId}`), and the `Forms\FormEndpoint` interface:
  `action(RenderContext $context): ?string` and `hiddenFields(RenderContext $context): array`. The default binding
  returns null: the form draws with its button disabled, and in the builder a note "Borang belum disambung".
- The form reads `?form_sent={blockId}` or the session flash `filament-cms.form_sent` to show its success message
  instead of the fields, and session errors keyed `form.{blockId}.{name}` under each field.
- The builder never needs another call for forms: the form is part of the page value.

## 8. Core block pack

Ready-made blocks for every site, registered by the package as own blocks (so the builder needs no new code).
Turn off with `config('filament-block-editor.core_blocks') = false`. Drawn by `filament-block-editor::core.*` views,
styled in `resources/css/page/core.css` with kit variables.

| Kind | Fields |
| --- | --- |
| `fbe-faq` | `heading` text; `items` list (max 20) of `question` text, `answer` textarea; `open_first` toggle |
| `fbe-map` | `address` text; `embed_url` link (only `https://www.google.com/maps…` is drawn); `height` select sm/md/lg |
| `fbe-icon-list` | `items` list (max 12) of `icon` select (about 30 lucide names), `title` text, `text` textarea; `columns` select 1–4; `style` select plain/boxed |
| `fbe-pricing` | `plans` list (max 6) of `name`, `price`, `period` text, `features` textarea (one per line), `button_text` text, `button_link` link, `highlight` toggle; `note` textarea |
| `fbe-testimonials` | `items` list (max 12) of `quote` textarea, `name` text, `role` text, `photo` image, `rating` select 0–5 |

Icons are inline SVG from `Support\Icons::svg(string $name)` (the same lucide names the builder lists).

## 9. Builder fixes (tracks A and B2)

- Hidden sections are drawn in the builder's canvas (forBuilder) with `data-hidden` on the wrapper; the builder
  shows them dimmed with a "Tersembunyi" label. Visitors still never get them.
- A section made only of own blocks no longer shows "Seksyen kosong" in the breadcrumb: the label is the own
  block's label.
- Malay strings for BlockNote's own menus and placeholders when `locale` is `ms`.
- The bundle: minify, drop dead code; report the size before and after. Do not split into chunks (Filament
  publishes one file).

## 10. Builder options and adapter, format 2 (tracks B1, B2)

```ts
type PageValue = { version: 2; sections: Section[] };
type Section = RichSection | RefSection;
type RichSection = { id: string; type: 'rich'; hidden?: true; lock?: SectionLock; data: SectionData };
type RefSection = { id: string; type: 'ref'; ref: number | string; hidden?: true };
type SectionLock = { move?: true; remove?: true; content?: true; style?: true };
type StyleValues = Record<string, string>;
type StyleBag = Partial<Record<'desktop' | 'tablet' | 'phone' | 'hover', StyleValues>>;
type Advanced = { class?: string | null; css?: string | null; hide_on?: ('desktop' | 'tablet' | 'phone')[] };
// SectionData gains: style?: StyleBag; advanced?: Advanced
// Every block gains the prop look: string (JSON of { style?: StyleBag; advanced?: Advanced })

type Kit = { version: 1; colors: Record<string, string>; custom_colors: { key: string; label: string; value: string }[];
  fonts: { heading: string; body: string }; text: { base_size: string; heading_weight: string }; radius: string;
  buttons: { style: string; radius: string; size: string; text_transform: string; font_weight: string };
  forms: { style: string; radius: string; labels: string } };

type DynamicValueDefinition = { key: string; label: string; type: 'text' | 'link' | 'image'; group?: string; preview?: string | null };

type PageBuilderOptions = {
  // … everything in format 1, plus:
  developer?: boolean;
  kit?: Kit | null;                        // shows the "Reka bentuk" (design) panel when saveKit exists
  fonts?: { value: string; label: string }[];
  dynamicValues?: DynamicValueDefinition[];
  syncedSections?: { id: number | string; title: string; editUrl?: string | null; section: RichSection }[];
  parts?: { key: 'header' | 'footer'; title: string; editUrl: string }[];
  siteInfo?: { groups: { key: string; label: string; fields: OwnBlockField[] }[]; values: Record<string, Record<string, unknown>> } | null;
  kind?: 'page' | 'header' | 'footer' | 'section' | 'card' | 'single';
};

type PageBuilderAdapter = {
  save(value: PageValue): Promise<SaveResult>;
  preview(value: PageValue, extra?: { kit?: Kit }): Promise<string>;
  upload(file: File, kind: UploadKind): Promise<{ url: string; name?: string }>;
  saveKit?(kit: Kit): Promise<SaveResult>;
  saveSection?(section: RichSection, meta: { title: string; synced: boolean }):
    Promise<{ ok: true; id: number | string; template?: SectionTemplateInput } | { ok: false; errors: Record<string, string> }>;
  saveSiteInfo?(values: Record<string, Record<string, unknown>>): Promise<SaveResult>;
};
```

- The builder emits `version: 2` always and passes `ref` sections through untouched.
- **Style panel (B1):** a "Gaya" tab for a section and for a picked item, grouped: Ruang (spacing), Saiz (size),
  Warna (colour), Tulisan (text), Bingkai (border, corners, shadow), with a device switch (desktop, tablet,
  phone) that follows the canvas device, and "Hover" for the allowed keys. Colour pickers list the kit colours
  first. Each control shows when its value differs from the base and has a reset.
- **Advanced panel (B1):** class names, hide on devices, custom CSS (developers only).
- **Locks (B1):** developers get a "Kunci" menu on a section; non-developers don't see the controls a lock blocks.
- **Design panel (B1):** a top bar button "Reka bentuk": colours (8 fixed and custom), fonts, text size, corners,
  buttons and forms, with live preview through `preview(value, { kit })`, saved by `saveKit`.
- **Form editor (B2):** the item panel for a `form` block: fields list (add, reorder, remove, type, label, name,
  placeholder, required, width, options), submit text and alignment, success message, actions (webhook only for
  developers). A slash menu item "Borang" and an add-panel tile insert a starter form (name, phone, message).
- **Dynamic values (B2):** an inline content type `dynamic` drawn as a chip; a slash menu group "Maklumat kedai"
  (from `dynamicValues` of type text) inserts one; link fields offer the link values; image fields offer the image
  values when there are any.
- **Synced and saved sections (B2):** "Simpan sebagai templat" and "Jadikan segerak" on a section (when
  `saveSection` exists); a `ref` section shows as "Segerak: {title}" with "Edit seksyen segerak" (its `editUrl`)
  and "Putuskan" (replace it with a copy of its `section`).
- **Header and footer (B2):** the canvas marks elements with `data-part="header|footer"` as clickable. The panel
  says "Bahagian ini sama di semua halaman", links to its `editUrl`, and shows the shop info form from `siteInfo`
  (generated with the own block form), saved by `saveSiteInfo`, then the preview reloads. The note
  "Berubah di semua halaman" sits above the save button.

## 11. The CMS (tracks C1 to C4)

### C1 — documents, store, kit, parts, synced sections, shop info

- Migration: rename `cms_pages` to `cms_documents`; add `kind` (string 20, default `page`, indexed),
  `entry_type` (string 60, nullable, indexed), `sort` (unsigned int, default 0), `settings` (json, nullable);
  rename `sections` to `content` and rewrite each row's content to a format 2 page value; make `path` nullable
  (stays unique). Revision keys `page:{id}` keep working (ids are kept). Down migration reverses it.
- Kinds: `page`, `header`, `footer`, `section` (synced), `template` (saved section), `kit`, `card` and `single`
  (entry templates, with `entry_type`), `entry` (C3).
- `Models\Document` (table `cms_documents`) with `kind`, `content` (array), `settings` (array), `revisionKey()`
  = `doc:{id}` except kind page keeps `page:{id}`. `Models\SitePage` extends it with a global scope `kind = page`
  and keeps its current API (`sections` reads and writes `content.sections`).
- `DocumentStore::save(Document $doc, array $value, ?Authenticatable $user): array` returning
  `['ok' => true]` or `['ok' => false, 'errors' => [...]]`. Steps: validate (`PageValue::rules`, or the kit's rules
  for kind `kit`), upgrade and clean, `PageValue::guard()` when the user is not a developer
  (`FilamentCmsPlugin::isDeveloper` or a `developers` closure in config for non-panel callers), save, keep the
  newest 20 versions (skip identical ones). `SitePageStore` becomes a thin wrapper. `restore()` as today.
- Kit: one document of kind `kit`. `CmsKitSource` implements `KitSource` (stored kit merged over `Kit::defaults()`).
- Parts: documents of kind `header` and `footer` (created on first use). `SitePageRenderer` passes `$header` and
  `$footer` (their HTML, each wrapped in `<div data-part="header|footer">`, empty string when there is none) to
  the page view, next to the existing variables. A "Header & footer" area: rows on the Halaman screen (or its own
  screen) with "Bina".
- The builder screen works for every kind: page, header, footer, section, card, single. It passes `developer`,
  `kit`, `fonts`, `dynamicValues`, `syncedSections`, `parts`, `siteInfo`, `kind`, and wires `saveKit`,
  `saveSection`, `saveSiteInfo`, `preview(value, {kit})` to Livewire methods. Each method checks access first.
- Synced sections: `CmsSectionResolver` implements `SectionResolver` for kind `section`. Saved sections are kind
  `template`, listed in `templates` with category `saved`. A "Seksyen" screen lists both, with rename, delete and
  "Bina".
- Shop info in the builder: each settings section may declare `builderFields(): array` of block editor `Field`s
  (`BusinessSettings`, `ContactSettings`, `HoursSettings`, `SocialSettings` do; `SeoSettings` does not).
  `saveSiteInfo` validates through those fields and saves through the same `ContentStore` as the Tetapan screen.
- Dynamic site values registered by the CMS from settings: `site.name`, `site.legal_name`, `site.registration`,
  `site.phone` (first), `site.phones` (all, joined with " / "), `site.email`, `site.address`, `site.hours` (lines
  "days: time"), `site.hours_note`; links `site.whatsapp` (wa.me of the first phone), `site.whatsapp_number`,
  `site.phone_link` (tel:), `site.email_link` (mailto:), `site.map`, one per social platform
  (`site.facebook`, …); image `site.logo`; and `page.title`, `page.url`.

### C2 — forms

- Table `cms_form_submissions`: id, `document_id` (nullable, index), `form_key` (string 100, index),
  `form_name`, `data` (json), `meta` (json: page path, user agent, a hash of the IP), `status` (`new` `read`
  `spam`, default `new`), timestamps.
- `CmsFormEndpoint` implements `FormEndpoint`: action `route('filament-cms.forms.submit', $document)`, hidden
  fields as needed. The route is registered by `FilamentCms::routes()` before the catch-all:
  `POST /_cms/forms/{document}`.
- The handler loads the **stored** form by `_form` from the document (or from a header/footer/synced section it
  shows), never from the request. It rejects: honeypot filled, `_t` under 2 seconds old or not signed, more than
  5 submissions per minute per IP per form (RateLimiter). It validates with `FormDefinition::rules()`, saves, then
  runs actions: email (a Mailable, sync, to the stored address; skip if mail is not configured), webhook (POST JSON,
  5 second timeout, `https` only, refuse hosts that resolve to private or loopback IPs), then whatsapp or redirect,
  else back to the page with the success flash and `#form-{blockId}`.
- Filament: a "Borang" resource: list (newest first, filters by form and status, badge with the count of `new`),
  view (marks read), mark spam, delete, export CSV. Labels in Malay and English.

### C3 — entries

- `EntryType::make('product')->label('Produk')->pluralLabel('Produk')->icon('heroicon-o-cube')
  ->fields([...Field])->path('/produk')->body(true)->sort('newest'|'title'|'manual')`, registered with
  `app(EntryTypes::class)->register(...)` in the host. `path(null)` means entries have no page of their own.
- Entries are documents of kind `entry` with `entry_type`, `title`, `path` (`{type path}/{slug}`),
  `is_published`, `sort`, `content = { "version": 2, "fields": {…}, "sections": [...] }` (fields cleaned by
  `Field::cleanFields`; sections only when `body(true)`).
- Filament: one screen per entry type under "Kandungan" (list, create, edit with a form generated from the
  fields, delete, publish, reorder for `manual`), "Bina" for the body, and "Reka kad" / "Reka halaman entri" that
  open the builder for the type's `card` and `single` documents.
- Dynamic values for entries: `entry.title`, `entry.url`, `entry.<field>` (text fields as text, link fields as
  link, image fields as image), put into the `RenderContext` values.
- The list block: an own block `cms-entries` registered by the CMS: `type` select (the registered types),
  `limit` number, `columns` select 1–4, `order` select, `empty_text` text. Each entry is drawn with the type's
  `card` document (rendered with the entry's values), or a plain built-in card (first image, title, first
  textarea, link) when no card is designed.
- Entry pages: `ShowSitePage` serves any published `page` or `entry` by path. An entry page draws the type's
  `single` document with the entry's values, then the entry's own sections; with no `single` document, a plain
  built-in layout of its fields, then its sections. Same `page_view` layout.

### C4 — MCP

- Require `laravel/mcp` ^1.1. `FilamentCms::mcp(string $path = '/mcp')` registers the server with the
  `CmsMcpToken` middleware: `Authorization: Bearer <token>` compared with `hash_equals` against
  `config('filament-cms.mcp.token')` (env `CMS_MCP_TOKEN`). No token configured → 404. Rate limit 60 per minute.
- The MCP acts as a developer. Versions are saved with `config('filament-cms.mcp.user')` (an email) or null.
- Tools (all through `DocumentStore` / `ContentStore`, never raw writes):
  `site_overview`, `page_format` (returns this format as text: page value, style bag, look prop, form JSON,
  dynamic keys), `list_documents`, `get_document`, `create_document`, `save_document`, `delete_document` (not the
  home page), `update_section`, `insert_section`, `move_section`, `remove_section`, `get_kit`, `save_kit`,
  `get_settings`, `save_settings`, `list_entries`, `save_entry`, `delete_entry`, `list_form_submissions`,
  `update_form_submission`, `list_versions`, `restore_version`, `render_document` (the page HTML as text).
- Every write tool returns the validation errors in plain words when the value is refused.

## 12. Adam (track D)

- Update the three packages. The CMS migration moves `cms_pages` into `cms_documents` on deploy.
- New own blocks `adam-header` and `adam-footer` that draw today's header and footer markup (nav, WhatsApp button;
  copyright, social links, credit). A migration creates the header and footer documents with them. The layout
  prints `$header` / `$footer`, and falls back to today's markup when they are empty.
- Kit defaults in `config/filament-block-editor.php` from `site.css` (kraft `#c59d6e` as primary, ink `#1f2328` as
  text, paper, sheet, rule, WhatsApp green as a custom colour). `site.css` reads the kit variables with today's
  values as fallbacks, so nothing changes visually until the owner changes the kit.
- `FilamentCms::mcp()` in `routes/web.php`; `CMS_MCP_TOKEN` set on Cloud; the server added to the v-gateway.
- Publish and commit the new builder assets. Tests updated. Nothing new appears on the live page.

## 13. Done when

- Every track: tests first (`tdd`), PHPUnit / Vitest green, `vendor/bin/pint --test`, `npm run typecheck`,
  `npm run build` with the built files committed.
- A format 1 page from Adam's database opens, saves and draws the same after the upgrade.
- In a real browser: a section and an item restyled per device; the kit changed and every section follows; a form
  added, a field added, submitted from the public page, seen in Borang; a shop phone chip in text; header tapped
  and the shop phone changed; a section made synced and edited once for two pages; an entry type listed with a
  designed card; MCP `site_overview` and `save_document` work through the gateway.

## Deviations

(Tracks write changes to this contract here, with the reason.)

### Track A (PHP core)

- **Custom CSS is stricter than section 2 says** (security review, 3 November 2026). `url()` allows only a path on
  this site (`/path`), not `https://`. The only at-rules allowed are `@media` and `@supports`. Every selector of
  every rule, inside those at-rules too, must start with `selector`, so custom CSS can only reach its own element
  and what is inside it. Braces hidden in a quote or behind a backslash, nested rules, `image-set()` and `src()`
  are refused too. Plain declarations with no rule (`color: red`) apply to the element. A `url()` path holds only
  plain URL characters (`A-Z a-z 0-9 . _ ~ ! $ & ( ) * + , ; = : @ % / -`, so no query string), and never starts
  with `//` or `/\`. Selectors may not use the `+` or `~` combinators, `:root`, `:host`, `:has(`, or an attribute
  selector on `value`. Reason: custom CSS with an attribute selector and a `url()` to another site can leak data
  from the page, such as a form's token.
- **A page value's `version` is clamped** to 1 … `VERSION` before the upgrade steps run (security review). A
  version below 1 or not a whole number counts as 1, one above `VERSION` counts as `VERSION`. So
  `registerUpgrade()` takes `$from` from 1 to `VERSION - 1`; other steps never run. Reason: a huge negative
  version made the upgrade loop run almost forever.
