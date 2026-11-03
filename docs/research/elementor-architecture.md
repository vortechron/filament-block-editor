# How Elementor is built (research for our page builder)

Date: 2026-11-03. Report only. No product code was changed.

## Why this file exists

We must choose the long-term base of our page builder (React editor, Laravel/PHP renderer, JSON page data).
The owner wants it to be as extendable as Elementor: restyle any block, add fields to a form block, build headers
and footers, reuse content. Ideally all of it is DATA (no code deploy) and editable by an API or MCP.

## How the facts were gathered

- Elementor core is open source. I read the real code: `elementor/elementor` on GitHub, `main` branch,
  commit `904eada` (2 Nov 2026), plugin header `Version: 4.5.0`. (`readme.txt` still says stable tag 3.34.2, so `main`
  is ahead of the WordPress.org release. Some V4 items below may not be in every site yet.)
  Base URL for code links: `https://github.com/elementor/elementor/blob/main/`.
- Official developer docs: `https://developers.elementor.com/docs/`. Official help: `https://elementor.com/help/`.
- Elementor Pro is closed source. Pro facts (Form widget, Theme Builder, Loop Grid, Custom CSS) come from
  official docs only, not from code.
- Page text was read by a fetch tool that summarises pages. I re-checked every code claim in the source files.
  Items I could not confirm are marked **UNCONFIRMED**.

Labels: **[code]** read in the source, **[doc]** read in official docs, **[inferred]** my reading of the code.

---

## 1. Page data model

**What is stored.** One JSON string per page, in the WordPress post meta key `_elementor_data`.
- Docs: "Elementor data is saved as a private custom field" in `wp_postmeta`. [doc] https://developers.elementor.com/docs/data-structure/
- Save code: `save_elements()` does `wp_slash( wp_json_encode( $editor_data ) )` then `update_metadata( 'post', ID, '_elementor_data', ... )`. [code] `core/base/document.php` (constants at lines 42-48, save at ~1370-1420)
- Other meta keys on the same post [code, `core/base/document.php`]:

| Meta key | Meaning |
|---|---|
| `_elementor_data` | the element tree (JSON string) |
| `_elementor_page_settings` | page-level settings (background, margin, scroll snap...) |
| `_elementor_edit_mode` | value `builder` means "built with Elementor" |
| `_elementor_template_type` | document type: page, section, container, header, footer, kit... |
| `_elementor_version` | Elementor version that last saved the post |
| `_elementor_element_cache` | cache of rendered elements |
| `_elementor_css` | (separate class) status and CSS cache, see below |

**Tree shape.** Each element is an object. [doc] https://developers.elementor.com/docs/data-structure/general-elements
`id` (string), `elType` (`container`, `section`, `column`, `widget`), `widgetType` (only when `elType` is `widget`,
for example `heading`), `isInner` (bool), `settings` (object, or empty array when empty), `elements` (child list).
The doc says the structure is recursive: containers hold containers and widgets.
Whole-page export shape: `title`, `type`, `version` (`"0.4"` for the export format), `page_settings`, `content`.
[doc] https://developers.elementor.com/docs/data-structure/general-structure and https://developers.elementor.com/docs/data-structure/page-content

Example (V3, short, shaped like the official examples):
```json
{ "id": "abc12345", "elType": "container", "isInner": false, "settings": {"content_position": "middle"},
  "elements": [ { "id": "def67890", "elType": "widget", "widgetType": "heading", "isInner": false,
                  "settings": { "title": "Hello", "align": "center", "align_mobile": "left" }, "elements": [] } ] }
```

**Containers replaced sections and columns.**
- Legacy tree: page > section > column > widget. Modern tree: nested containers. [doc] https://developers.elementor.com/docs/data-structure/page-content
- A container has the setting `container_type` with values `flex` (default) or `grid`. [code] `includes/elements/container.php` (~lines 373-381)
- Help: "Containers are the default layout element of all new Elementor sites." Sections still work. Conversion
  "is a one-way process". Sections and containers can sit on the same page. [doc]
  https://elementor.com/help/convert-existing-sections-to-containers/ and https://elementor.com/help/using-sections-and-containers-on-the-same-site/
- The old Flexbox Container page said the feature "will replace the current section, column, and inner section
  functionality". [doc] https://elementor.com/help/container-element/

**How old data is migrated (versioning).**
- Plugin-level: option `elementor_version` + a class of static upgrade methods named by version, such as
  `_v_3_2_0_migrate_breakpoints_to_new_system`, `_v_3_16_0_container_updates`. They loop over posts, read the
  elements, rewrite them and save. [code] `core/upgrade/manager.php` (`VERSION_OPTION_NAME = 'elementor_version'`) and `core/upgrade/upgrades.php`
- Per post: `_elementor_version` is written on every save. At render time the code compares it, for example
  "if version < 2.5.0 add the class `elementor-bc-flex-widget`". [code] `core/base/document.php` (~line 422 and ~1446)
  So old posts are migrated by upgrade jobs, and some old behaviour is kept at render time by checking this version.
- Section to container conversion is a user action in the editor ("Convert"), not an automatic job. [doc] link above.
- V4 (atomic) adds a `version` field on every element: "the widget schema version, used for data migrations".
  [doc] https://developers.elementor.com/docs/data-structure/atomic-widgets
  Value-level migrations are JSON recipes (`up` / `down` operations such as `set`, `move`, with conditions on `$$type`),
  listed in a `manifest.json`. They run "when it finds a mismatch between data prop type, and actual schema (code)".
  [code] https://github.com/elementor/elementor/blob/main/migrations/README.md

**Per-post CSS.**
- The class `Post_CSS` (`FILE_PREFIX = 'post-'`) writes `post-{ID}.css` into `wp-content/uploads/elementor/css/`
  (`UPLOADS_DIR = 'elementor/'`, `DEFAULT_FILES_DIR = 'css/'`). [code] `core/files/css/post.php`, `core/files/base.php`
- Meta `_elementor_css` holds `status` (`file`, `inline` or `empty`), `time`, `css` (when inline) and
  `dynamic_elements_ids`. If the option `elementor_css_print_method` is `internal`, CSS is printed inline
  instead of a file. [code] `core/files/css/base.php` (`update()` ~lines 133-160), `core/files/css/post.php`
- CSS is built from each element's `settings` using the `selectors` of each control (section 2).
  [code] `core/files/css/post.php` (`render_styles`, `add_controls_stack_style_rules`)
- The file is rebuilt when the meta status is empty (`'' === $meta['status'] || is_update_required()`, and the base
  `is_update_required()` returns false). [code] `core/files/css/base.php` (~lines 225-240 and 711). See section 8.

---

## 2. Controls and styles

**A widget declares its controls in PHP** inside `register_controls()`: `start_controls_section`, then
`add_control( 'name', [ 'type' => Controls_Manager::TEXT, 'label' => ..., 'default' => ..., 'selectors' => [...] ] )`,
then `end_controls_section()`. Tabs: content, style, advanced.
[doc] https://developers.elementor.com/docs/widgets/widget-controls and https://developers.elementor.com/docs/editor-controls/regular-control

**Control types.** Text, Number, Select, Choose, Slider, Color, Media (and more: Dimensions, Repeater...). [doc]
https://developers.elementor.com/docs/editor-controls/regular-control

**Group controls** bundle several controls: `add_group_control( Group_Control_Typography::get_type(), [ 'name' => ..., 'selector' => '{{WRAPPER}} .title' ] )`.
[doc] https://developers.elementor.com/docs/editor-controls/group-control
Classes present in core: background, border, box-shadow, css-filter, flex-container, flex-item, grid-container,
image-size, text-shadow, text-stroke, typography. [code] https://github.com/elementor/elementor/tree/main/includes/controls/groups

**Responsive controls.** `add_responsive_control()` makes one control per device. Stored in the same `settings`
object with a suffix: base key = desktop, `_tablet`, `_mobile`, and custom breakpoint names such as `_laptop`,
`_widescreen`, `_tablet_extra`, `_mobile_extra`. A device with no key inherits desktop at runtime.
[doc] https://developers.elementor.com/docs/data-structure/responsive-data and https://developers.elementor.com/docs/editor-controls/responsive-control
Default widths: mobile 767, tablet 1024. [code] `core/breakpoints/manager.php` (~lines 315-325)

**`selectors` map a value to CSS.** The widget developer writes them in PHP:
`'selectors' => [ '{{WRAPPER}} .custom-container' => 'color: {{VALUE}};' ]`.
Placeholders: `{{WRAPPER}}`, `{{VALUE}}`, `{{SIZE}}{{UNIT}}`, `{{TOP}}...{{LEFT}}`, `{{URL}}`, `{{ID}}`. Elementor reads these
and writes a scoped rule such as `.elementor-123 .elementor-element.elementor-element-1a2b3c4 .widget-container { color: red; }`.
[doc] https://developers.elementor.com/docs/editor-controls/selectors

**Advanced tab (every widget).** Margin, padding, custom width, position, z-index, CSS ID, CSS classes, entrance
animation, background, responsive hide. [code] `includes/widgets/common-base.php` (`_margin`, `_padding`, `_element_custom_width`,
`_position`, `_z_index`, `_element_id`, `_css_classes`, `_animation`, `_background`).
- **Motion Effects** (scroll effects) and **Custom CSS** per element are Pro. In free core they are only teaser
  controls (`add_motion_effects_promotion_control`, `add_custom_css_controls` showing "Meet Our Custom CSS").
  [code] `includes/widgets/common-base.php` (~line 849), `includes/managers/controls.php` (~lines 1071-1100)

**What is code and what is data (V3 model):**

| Thing | Code or data |
|---|---|
| Value a user picks in any control (color, size, text, per-device values) | **Data** (`settings`) |
| Which controls a widget has, their `selectors`, defaults | **Code** (PHP class of the widget) |
| Adding a new widget, group control or control type | **Code** |
| Advanced tab values (margin, z-index, CSS ID, classes) | **Data**, but the control set is fixed in core |
| Custom CSS per element | **Data** (Pro) |

[inferred] In V3, "restyle any block" only works for properties the widget author exposed, plus the generic
Advanced tab and Pro Custom CSS. The style rules are generated in PHP from control definitions.

**V4 (atomic) changes this.** Styles become plain data keyed by CSS property, stored in a `styles` map on the
element. A style is `{ id, label, type: "class", variants: [ { meta: { breakpoint, state }, props: { "font-size": {"$$type":"size","value":{"unit":"px","size":16}}, ... } } ] }`.
Elements list the style ids in a `classes` setting: `{"$$type":"classes","value":["e-132b96e-91b05d4"]}`.
[doc] https://developers.elementor.com/docs/data-structure/atomic-styles and https://developers.elementor.com/docs/data-structure/atomic-prop-values
The PHP classes `Style_Definition::build()` and `Style_Variant::build()` return exactly this shape. [code] `modules/atomic-widgets/styles/`
Every value is a typed object `{ "$$type": ..., "value": ... }`; PHP prop types in `modules/atomic-widgets/prop-types/`
(size, color, dimensions, box-shadow, background, link, classes, ...). Each atomic widget has a separate
`define_props_schema()` (data schema) and `define_atomic_controls()` (UI), and renders with a Twig template.
[code] `modules/atomic-widgets/elements/atomic-heading/atomic-heading.php`

---

## 3. Global design system (Kit / Site Settings)

- The Kit is a normal post of type `elementor_library` with meta `_elementor_template_type = kit` and
  `_elementor_edit_mode = builder`. The active Kit id is in the option `elementor_active_kit`.
  [code] `core/kits/manager.php` (`OPTION_ACTIVE`, default Kit creation ~lines 195-210)
  The docs call it "a special WordPress post that holds the site's design system".
  [doc] https://developers.elementor.com/docs/data-structure/global-styles
- Kit tabs in core: global-colors, global-typography, theme-style-typography, theme-style-buttons,
  theme-style-form-fields, theme-style-images, settings-layout, settings-background, settings-site-identity,
  settings-lightbox, settings-page-transitions, settings-custom-css. [code] https://github.com/elementor/elementor/tree/main/core/kits/documents/tabs
  Colors live in controls `system_colors` (primary, secondary, text, accent) and `custom_colors`. [code] `core/kits/documents/tabs/global-colors.php`
  [inferred] Kit values are saved like page settings in the Kit post (class `Kit extends PageBase`).
- **Widgets reference globals** with `__globals__` inside `settings`. Format `globals/<type>?id=<id>`:
  `"__globals__": { "title_color": "globals/colors?id=secondary", "typography_typography": "globals/typography?id=primary" }`.
  Built-in ids: primary, secondary, text, accent; custom ones get generated ids.
  [doc] https://developers.elementor.com/docs/data-structure/global-styles
- A control opts in with `'global' => [ 'default' => Global_Colors::COLOR_PRIMARY ]`.
  [doc] https://developers.elementor.com/docs/editor-controls/global-style
- **How it becomes CSS:** the Kit writes CSS custom properties (selector `'{{WRAPPER}}' => '--e-global-color-{{_id.VALUE}}: {{VALUE}}'`),
  and a widget that has a global gets `var( --e-global-color-<id> )` in its CSS. Typography uses
  `var( --e-global-typography-<id>-<property> )`. [code] `core/kits/documents/tabs/global-colors.php` (~line 66), `core/files/css/base.php` (~lines 925-965)
  So changing a global recolors the site without touching page data.
- V4 adds: global **classes** (custom post type `e_global_class`, `modules/global-classes/global-class-post-type.php`)
  and global **variables** (stored in Kit meta, `modules/variables/storage/variables-repository.php`). [code]

---

## 4. Forms (Elementor Pro Form widget)

Pro is closed source. Everything here is from official docs.

- **Fields are a Repeater control.** "Elementor uses the 'Repeater' control to allow the user to add multiple fields to the form."
  Field types: Text, Email, Textarea, URL, Tel, Radio, Select, Checkbox, Acceptance, Number, Date, Time, File Upload,
  Password, HTML, Hidden, Step, reCAPTCHA, reCAPTCHA V3, Honeypot. [doc] https://developers.elementor.com/docs/form-fields/
- Per field the editor shows: Type, Label, Placeholder, Required, Column width (and an Advanced tab). [doc] https://elementor.com/help/form-lite/
  Repeater items are stored in `settings` as an array of objects with an auto `_id` (used in the CSS selector
  `elementor-repeater-item-{{_id}}`). [doc] https://developers.elementor.com/docs/data-structure/repeaters
- **Actions after submit:** Collect Submission, Email, Email 2, Redirect, Webhook, Popup, plus integrations
  (ActiveCampaign, ConvertKit, Discord, Drip, GetResponse, MailChimp, MailerLite, Slack, AWeber). [doc] https://elementor.com/help/actions-after-submit/
- **Submissions:** viewed in WP Admin > Elementor > Submissions, exported to CSV, can be turned off in Elementor >
  Settings > Advanced. "Collect Submissions is active by default." [doc] https://elementor.com/help/form-submissions/
  Blog says submissions are saved "to the site's database". [doc] https://elementor.com/blog/introducing-pro-3-2/
  **UNCONFIRMED:** table names `e_submissions`, `e_submissions_values`, `e_submissions_action_log`. I saw them only in
  third-party search summaries and the official Pro doc file could not be read (blocked by a Cloudflare check;
  I did not try to get around it). Do not rely on column names.
- **Code or data?** Adding a field, changing label, required, width, picking actions, restyling the form: all editor
  data, no code. New field types and new actions need PHP: custom action = class extending
  `\ElementorPro\Modules\Forms\Classes\Action_Base` (`get_name`, `get_label`, `register_settings_section`, `run`,
  `on_export`), registered on `elementor_pro/forms/actions/register`. [doc] https://developers.elementor.com/docs/form-actions/action-structure and https://developers.elementor.com/docs/form-actions/add-new-action
- **V4 free "Atomic Form" (`e-form`) uses a different model.** The form is a wrapper element whose fields are
  child elements (Label, Input, Textarea, Checkbox, Radio, Date picker, Time picker, Select, File Upload, Submit
  button); settings include form name, actions after submit, success and error messages. [doc] https://elementor.com/help/atomic-form-element/
  The core code has `modules/atomic-widgets/elements/atomic-form/` and field element types such as `e-form-input`,
  `e-form-textarea`. [code] https://github.com/elementor/elementor/blob/main/modules/mcp/abilities/build-composition/form-structure-validator.php
  So in V4 "add a field" means "add a child element", which is pure tree data.

---

## 5. Templates and Theme Builder

- **Saved templates** are posts of type `elementor_library`, with taxonomy `elementor_library_type`. [code] `includes/template-library/sources/local.php` (`CPT = 'elementor_library'`, `TAXONOMY_TYPE_SLUG = 'elementor_library_type'`)
  Document types registered in core: page, section, container (when containers are active), kit (and V4 types e-div-block, e-flexbox, e-grid, e-form). [code] `modules/library/module.php`, `modules/atomic-widgets/library/atomic-widgets-library.php`
- **Theme Builder (Pro):** parts are header, footer, single, archive (plus popups and others). A header "replaces the
  theme's header.php". The theme must support "theme locations". [doc] https://developers.elementor.com/docs/themes/
- **Display conditions** decide where a part shows. They are include/exclude rules and are also used for Popups and
  Custom Code. [doc] https://developers.elementor.com/docs/theme-conditions/ and https://elementor.com/help/header-site-part/
  Stored in post meta `_elementor_conditions` (registered for REST when Pro is active). [code] `modules/wp-rest/classes/elementor-post-meta.php` (~lines 140-165)
  Rules to know: a part with no conditions is not rendered; it must be published; the "Canvas" page layout hides
  header and footer. [doc] https://elementor.com/help/how-to-fix-a-missing-header-or-footer-in-elementor/
  A header can be exported as a `.json` file. [doc] https://elementor.com/help/header-site-part/
- **Loop Grid (Pro):** "after you drag the widget onto the canvas, you'll be asked to create a template". That
  template (the loop item) is designed with normal widgets and repeated for each post; query settings choose posts.
  [doc] https://elementor.com/help/loop-grid/
- **Global widgets (Pro):** a widget saved as a template and reused, edits propagate. [doc, from a search summary,
  page not read fully] https://elementor.com/help/global-widget-pro/
- **Components (V4, Pro to create):** reusable atomic layouts with overridable props. Own post type
  `elementor_component`. [code] `modules/components/documents/component.php` (`TYPE = 'elementor_component'`)
  Help: https://elementor.com/help/components-2/ (from a search summary, not read fully).

---

## 6. Dynamic tags

- **Opt in per control:** `'dynamic' => [ 'active' => true ]`. [doc] https://developers.elementor.com/docs/editor-controls/dynamic-content
- **Tag class:** extends `\Elementor\Core\DynamicTags\Tag` with `get_name`, `get_title`, `get_group`, `get_categories`,
  `register_controls`, `render`. Registered on `elementor/dynamic_tags/register` with `$dynamic_tags_manager->register( new ... )`.
  Groups control where the tag appears in the picker, categories control which controls accept it. [doc]
  https://developers.elementor.com/docs/dynamic-tags/dynamic-tags-structure and https://developers.elementor.com/docs/dynamic-tags/add-new-dynamic-tag
- **How it is stored (V3).** The official docs do not show it. In the source: element `settings` gets a key
  `__dynamic__` that maps control name to a shortcode-like string:
  `[elementor-tag id="<tag id>" name="<tag name>" settings="<urlencoded JSON of tag settings>"]`.
  At render time `parse_dynamic_settings()` finds `settings['__dynamic__'][control]`, runs the tag, and replaces the
  control value. Repeater fields are handled field by field. [code] `core/dynamic-tags/manager.php` (`TAG_LABEL = 'elementor-tag'`,
  `DYNAMIC_SETTING_KEY = '__dynamic__'`, `tag_to_text` ~line 140), `includes/base/controls-stack.php` (`parse_dynamic_settings` ~lines 1296-1350)
- **How it is stored (V4).** A typed value: `{ "$$type": "dynamic", "value": { "name": "<tag name>", "settings": {...} } }`;
  a resolver looks up the tag and returns its content. [code] `modules/atomic-widgets/dynamic-tags/dynamic-prop-type.php`, `dynamic-transformer.php`
- Core registers the plumbing; the useful tags (Site Title, Site Tagline, Post Title, ACF fields) are listed in the
  help center. [doc] https://elementor.com/help/dynamic-tags-pro-2/ , https://elementor.com/help/dynamic-tags-in-v4/ , https://elementor.com/help/elementor-acf/
  (ACF repeater fields are not supported per the ACF page; from a search summary.)

---

## 7. Extending with code

- **New widget:** class extending `\Elementor\Widget_Base`. Methods in the official skeleton: `get_name()` (unique id),
  `get_title()`, `get_icon()`, `get_categories()`, `register_controls()`, `render()`, `content_template()` (JS template
  for live editor preview), plus less common `get_keywords`, `get_script_depends`, `get_style_depends`, `has_widget_inner_wrapper`.
  [doc] https://developers.elementor.com/docs/widgets/widget-structure
- **Register:** `add_action( 'elementor/widgets/register', fn( $widgets_manager ) => $widgets_manager->register( new My_Widget() ) )`.
  [doc] https://developers.elementor.com/docs/widgets/add-new-widget
  Minimal example (oEmbed widget): one TEXT control `url`, `render()` reads `$this->get_settings_for_display()`. [doc] https://developers.elementor.com/docs/widgets/simple-example
- Same pattern for dynamic tags (section 6), form actions and fields (section 4), theme conditions
  (`elementor/theme/register_conditions`, from a search summary of https://developers.elementor.com/docs/theme-conditions/add-new-condition/).
- **What must be code (V3):** widget class, control definitions and `selectors`, tags, form actions, conditions.
  **What users do in the editor:** all values, layout (containers), globals, templates, conditions, form fields and actions.
- **V4 adds a data-driven way:** a widget schema (`define_props_schema`) is exposed as JSON Schema to the MCP;
  styles and classes need no PHP. A brand-new widget type still needs PHP (or the Angie add-on, see section 8).

---

## 8. Editing without the editor

**There is no big public REST API for page content documented on developers.elementor.com** (the `/docs/rest-api/`
URL returned 404). What exists:

1. **WordPress core REST + registered meta** (the permission method in that file is marked `@since 3.27.0`; the
   exact release that exposed the meta is not stated, so treat the version as **UNCONFIRMED**). For post types that support
   `elementor`, Elementor registers `_elementor_data` (a JSON **string**), `_elementor_edit_mode` (`""` or `builder`;
   `builder` is "required for Elementor editing"), `_elementor_template_type`, `_elementor_page_settings`, and
   `_elementor_conditions` (Pro) with `show_in_rest`. So `GET/POST /wp-json/wp/v2/<post-type>/<id>` with
   `context=edit` can read and write the tree. Writes need edit permission on the document. Without the
   `unfiltered_html` capability the JSON is run through `kses_post_deep`. [code] `modules/wp-rest/classes/elementor-post-meta.php`
2. **Elementor's own REST routes** under `elementor/v1` (documents media import, global-class and component
   routes, etc.). They are internal helpers, not a page-CRUD API. [code] `grep register_rest_route` over the repo
   (e.g. `core/documents-manager.php` line 777, `modules/components/components-rest-api.php`)
3. **Official Elementor MCP (new, in core on `main`).** Built on the WordPress Abilities API and the MCP Adapter.
   About 40 abilities, for example: `elementor/create-page`, `get-page-structure`, `manage-elements` (bulk update, delete,
   move, duplicate; up to 50 operations, one save), `build-composition`, `manage-classes`, `manage-global-variable`,
   `update-page-settings`, `publish-document`, `manage-revisions` (undo), `list-dynamic-tags`, `list-widget-schemas`,
   `get-widget-schemas`, `clear-cache`, `create-preview-link`, `manage-site-parts`. It edits V4 (atomic) elements;
   V3 widgets are only partly supported. It saves drafts, not published pages. [code] `modules/mcp/abilities/`
   (e.g. `manage-elements-ability.php`, `create-page-ability.php`) and `modules/mcp/module.php`;
   [doc] https://elementor.com/blog/elementor-mcp-launch/ . The blog says access is limited to site admins,
   per site, and conflicts with an open editor session are flagged.
4. **WP-CLI:** `wp elementor flush-css [--regenerate] [--network]`, `replace-urls`, `update db`, `library sync/import`,
   `kit import/export`, `system-info`, experiment on/off. 17 commands listed. [doc] https://developers.elementor.com/docs/cli/ and
   https://developers.elementor.com/docs/cli/flush-css ; [code] `modules/wp-cli/command.php`
5. Template JSON export and import (library). [doc] https://elementor.com/help/header-site-part/

**Known problems when outside code writes `_elementor_data`:** [code unless noted]
- The CSS is cached. It is rebuilt only when the `_elementor_css` meta is missing or its status is empty. A direct
  meta write leaves old CSS. Fix: delete `_elementor_css` for that post, or call the full clear:
  `Files_Manager::clear_cache()` deletes the files in `uploads/elementor/css/` plus the metas
  `_elementor_css`, `_elementor_element_cache` and the assets meta; or run `wp elementor flush-css --regenerate`.
  `core/files/manager.php` (~lines 123-165), `core/files/css/base.php` (~lines 225-240)
- Other caches also hold old output: `_elementor_element_cache`, page/CDN caches. Help center: "Clear Files & Data"
  and clear caching plugins and the CDN. [doc] https://elementor.com/help/how-to-fix-a-missing-header-or-footer-in-elementor/
- Hooks run only on editor saves: `elementor/document/after_save` and `elementor/editor/after_save` (usage stats,
  atomic style cache, MCP sync state). A raw meta write skips them. [code] `core/base/document.php` (~lines 899, 1419)
- JSON must be a string, slashed (`wp_slash`) before `update_post_meta`, as `save_elements()` does. The posts also need
  `_elementor_edit_mode = builder`. [code] `core/base/document.php`
- Two writers at once (editor open + external write) overwrite each other. The MCP warns about this in its own text:
  "performs a read-modify-write on the current document". [code] `modules/mcp/abilities/manage-elements-ability.php`
- **UNCONFIRMED:** I found no official doc page that lists "problems of editing `_elementor_data` by hand". The points
  above are my reading of the code. A search for GitHub issues did not return a clear primary source.

---

## 9. For comparison: Puck and GrapesJS

**Puck (React, open source).** Data is `{ content: ComponentData[], root: { props }, zones }`.
`ComponentData` is `{ type, props: { id, ...fieldValues }, readOnly? }`; `type` is the key of a component in the
config. `zones` (named drop areas) "will soon be deprecated" because **slot fields** replace them: a field of
`type: "slot"` stores an array of `ComponentData` inside the component's own props, so nesting lives in the tree.
[doc] https://puckeditor.com/docs/api-reference/data-model/data , https://puckeditor.com/docs/api-reference/data-model/component-data , https://puckeditor.com/docs/api-reference/fields/slot
The config is code: `components: { Name: { fields, defaultProps, render, resolveData, resolveFields, permissions, ... } }`,
plus `root` and `categories`. [doc] https://puckeditor.com/docs/api-reference/configuration/config , https://puckeditor.com/docs/api-reference/configuration/component-config
So the data is small and typed by the config; every block, field set and style option is defined in code, and
styling is whatever fields you declare. (The slot page gives no sample of the stored slot JSON: **UNCONFIRMED** shape beyond "array of ComponentData".)

**GrapesJS (framework-agnostic, open source).** A component tree like a virtual DOM:
`{ tagName, type, attributes, components: [...], content }`; the root is a `wrapper`. [doc] https://grapesjs.com/docs/modules/Components.html
The Style Manager edits styles through **sectors** and **properties** (each = one CSS property control) on a
**target**: a selected component, or a CSS selector (it creates a CSS rule if missing). [doc] https://grapesjs.com/docs/modules/Style-manager.html
Project data is one JSON (`editor.getProjectData()` / `loadProjectData()`) holding styles, pages, assets (and
more, **UNCONFIRMED** from that page); it does not hold HTML/CSS, which are generated separately; remote storage
is GET to load and POST to store. [doc] https://grapesjs.com/docs/modules/Storage.html
Styles are real CSS rules separate from the component tree, so any CSS property is editable as data.
(How rules store media queries and states is **not covered** on the pages I read.)

---

## What a builder needs to be Elementor-like (load-bearing concepts)

1. **One element tree as JSON**, each node `{ id, type, settings, children }`, stored with a format version.
   Layout is just nested containers (flex or grid), not special section/column types.
2. **Settings keyed by a schema**, with a typed value format (V4: `{ $$type, value }`). Stored values are small; the
   schema tells how to validate, edit and render them.
3. **Responsive values as data**: a value per breakpoint (V3 suffix `_tablet`; V4 variant `meta.breakpoint`), with
   inheritance from desktop.
4. **Style as data, not code**: a generic style layer (CSS property to value, per breakpoint and state) that any
   element can use, plus reusable named classes. V3 needed PHP `selectors` per control; V4 moved to data.
   This is the main lesson for "restyle any block".
5. **Design tokens (the Kit)**: global colors, fonts and variables stored once, referenced by id from elements
   (`__globals__`, `globals/colors?id=primary`), output as CSS custom properties.
6. **Generated CSS with a cache** per document, plus a clear rule for when it is rebuilt (on every save, never by
   a lazy check that a data write can skip).
7. **Reusable content as documents**: templates, headers/footers/archives (theme parts) with **display conditions**
   stored as data, loop templates for lists, reusable components with overridable props.
8. **Bindings (dynamic tags)**: a field value can be `{ dynamic tag name + settings }` resolved at render time.
9. **Fields as child data**: the V3 Form uses a repeater; the V4 Form uses child elements. Both mean "add a form
   field" is a data edit. Only new field types or new submit actions are code.
10. **A registry for code extension** (widgets, tags, actions, conditions) with schemas the editor and the API can read.
11. **A write API that goes through the same save path**: validate against schema, save, clear CSS, fire hooks, keep
    revisions for undo. Elementor's MCP does exactly this (bulk ops, one save, undo revision id, preview link).
    Direct writes to the data column skip these steps.
12. **Data migrations**: a version on the document and on each element, with upgrade jobs and (V4) JSON migration recipes.

---

## Unconfirmed or weak points

- `e_submissions*` table names and columns (Pro, closed source). Section 4.
- Exact content of Pro Theme Builder condition storage beyond the `_elementor_conditions` meta (Pro code not read).
- Global Widgets and Components help pages were read only as search summaries.
- Whether the official MCP supports V3 sections/widgets fully: the blog is silent; the code says V4-first with partial V3.
- `main` is ahead of the public release; V4 pieces (MCP, atomic form, components) may need the Editor V4 opt-in. The
  data-structure docs for atomic elements are marked "Elementor Core Advanced".
- No official statement found on the best practice for external `_elementor_data` edits (section 8).
