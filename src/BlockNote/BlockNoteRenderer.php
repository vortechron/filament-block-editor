<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Styling\StyleSheet;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * Draws a section's BlockNote document as HTML for the public page, so
 * visitors get plain HTML and CSS and no editor JavaScript.
 *
 * Everything is escaped here, and only values from fixed lists reach a style
 * attribute: colour names, spacing sizes, whole-number widths. Links keep
 * only http(s), mailto:, tel:, "#anchor" and same-site addresses (Urls::link);
 * pictures, video and files keep only http(s) and same-site addresses
 * (Urls::media). Unknown block types are skipped. The package's own blocks
 * (button, gallery) are drawn here; an `ownBlock` is drawn by the app's
 * Blocks\BlockRegistry.
 *
 * Dynamic values (Content\DynamicValues) are resolved here: dynamic text
 * is drawn as its escaped value (in the builder inside
 * `<span class="bn-dynamic" data-dynamic="{key}">`, with the value's label
 * when it is empty), and `@key` links and pictures are resolved, then
 * checked by the same address rules.
 *
 * A block's `look` prop (BlockLook) adds its class and its rules to the
 * page's StyleSheet; drawn on its own, render() puts the <style> in front.
 *
 * Keep the numbers below in step with the editor kit (@vortechron/blocknote-kit).
 */
final class BlockNoteRenderer
{
    /**
     * The per-item width grid. A block's `width` prop is a whole number of
     * these columns. A full row (the default) renders without a wrapper.
     *
     * Keep in sync with WIDTH_COLUMNS in the kit's item-width.jsx.
     */
    public const WIDTH_COLUMNS = 12;

    /**
     * Steps above WIDTH_COLUMNS. These stretch an item past the section
     * padding, out towards its edge. The last step reaches the edge.
     *
     * Keep in sync with BLEED_STEPS in the kit's item-width.jsx.
     */
    public const BLEED_STEPS = 6;

    /**
     * The card's Show button when the card does not pick its own colour.
     *
     * Keep in sync with CARD_BUTTON_COLOR in the kit's blocks/card.jsx.
     */
    public const CARD_BUTTON_COLOR = '#f6c343';

    /**
     * "Space above" and "Space below" on one item.
     *
     * Keep in sync with ITEM_SPACING in the kit's item-spacing.jsx.
     */
    private const ITEM_SPACING = ['sm' => '1rem', 'md' => '2rem', 'lg' => '3.5rem', 'xl' => '6rem'];

    /**
     * Keep in sync with SPACER_SIZES in the kit's blocks/spacer.jsx.
     */
    private const SPACER_SIZES = ['sm' => '1rem', 'md' => '2.5rem', 'lg' => '5rem', 'xl' => '8rem'];

    private const TEXT_COLORS = [
        'gray' => '#6b7280',
        'brown' => '#92400e',
        'red' => '#dc2626',
        'orange' => '#ea580c',
        'yellow' => '#ca8a04',
        'green' => '#16a34a',
        'blue' => '#2563eb',
        'purple' => '#9333ea',
        'pink' => '#db2777',
    ];

    private const BACKGROUND_COLORS = [
        'gray' => '#f3f4f6',
        'brown' => '#fef3c7',
        'red' => '#fee2e2',
        'orange' => '#ffedd5',
        'yellow' => '#fef9c3',
        'green' => '#dcfce7',
        'blue' => '#dbeafe',
        'purple' => '#f3e8ff',
        'pink' => '#fce7f3',
    ];

    private const LIST_TYPES = ['bulletListItem', 'numberedListItem', 'checkListItem'];

    /**
     * Every block type this renderer draws itself. `column` is drawn by its
     * columnList.
     *
     * @var list<string>
     */
    public const TYPES = [
        'paragraph', 'heading', 'quote', 'codeBlock', 'bulletListItem', 'numberedListItem', 'checkListItem',
        'toggleListItem', 'divider', 'image', 'video', 'audio', 'file', 'table', 'spacer', 'card', 'columnList', 'column',
        Blocks::GALLERY, Blocks::BUTTON, Blocks::OWN_BLOCK,
    ];

    /**
     * The key that holds a block's place in its document, such as "3.0" for
     * the first block inside the fourth. SectionLayoutRenderer writes it on
     * the top-level blocks before it splits them into groups, so each group
     * still knows where its blocks came from.
     */
    public const ITEM_PATH = '_itemPath';

    /**
     * Whether render() draws for the page builder: each item is marked with
     * `data-item`, its place in the document, so the builder finds the
     * item the author clicked, and an empty photo or video shows where it
     * goes. Visitors get neither.
     */
    private bool $forBuilder = false;

    private RenderContext $context;

    public function __construct(private readonly ?BlockRegistry $registry = null)
    {
        $this->context = new RenderContext;
    }

    /**
     * @param  array<mixed>  $blocks
     */
    public function render(array $blocks, ?RenderContext $context = null): string
    {
        $this->context = $context ?? new RenderContext;
        $this->forBuilder = $this->context->forBuilder;

        try {
            return StyleSheet::collect(fn (): string => $this->renderBlocks($blocks));
        } finally {
            $this->context = new RenderContext;
            $this->forBuilder = false;
        }
    }

    /**
     * Whether a value is a place render() wrote, like "3" or "3.0.1".
     */
    public static function isItemPath(mixed $value): bool
    {
        return is_string($value) && preg_match('/^\d{1,4}(?:\.\d{1,4}){0,5}$/', $value) === 1;
    }

    /**
     * A lowercase "#rrggbb", or the fallback when the value is not a
     * six-digit hex colour. Every colour goes through here before it
     * reaches a style attribute.
     */
    public static function hexColor(mixed $value, ?string $fallback = null): ?string
    {
        if (! is_string($value) || preg_match('/^#?([0-9a-f]{6})$/i', trim($value), $matches) !== 1) {
            return $fallback;
        }

        return '#'.strtolower($matches[1]);
    }

    /**
     * True when text on this colour should be white (YIQ brightness).
     */
    public static function isDarkColor(string $color): bool
    {
        $hex = self::hexColor($color);

        if ($hex === null) {
            return false;
        }

        [$red, $green, $blue] = array_map(hexdec(...), str_split(substr($hex, 1), 2));

        return (($red * 299) + ($green * 587) + ($blue * 114)) / 1000 < 128;
    }

    /**
     * A YouTube, Vimeo or Loom link as a player address, or null for any
     * other link, which then plays in a plain <video> tag.
     */
    public static function videoEmbedUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        if (preg_match('~youtube(?:-nocookie)?\.com/watch\?.*v=([\w-]{6,})~', $url, $matches) === 1
            || preg_match('~youtube(?:-nocookie)?\.com/(?:shorts|embed|live|v)/([\w-]{6,})~', $url, $matches) === 1
            || preg_match('~youtu\.be/([\w-]{6,})~', $url, $matches) === 1) {
            return "https://www.youtube-nocookie.com/embed/{$matches[1]}";
        }

        if (preg_match('~vimeo\.com/(?:[\w-]+/)*?(?:video/)?(\d+)(?:/([a-zA-Z0-9]+))?~', $url, $matches) === 1) {
            $hash = $matches[2] ?? '';

            if ($hash === '' && preg_match('~[?&]h=([a-zA-Z0-9]+)~', $url, $query) === 1) {
                $hash = $query[1];
            }

            return "https://player.vimeo.com/video/{$matches[1]}".($hash === '' ? '' : '?h='.$hash);
        }

        if (preg_match('~loom\.com/(?:share|embed)/([\w-]+)~', $url, $matches) === 1) {
            return "https://www.loom.com/embed/{$matches[1]}";
        }

        return null;
    }

    /**
     * Lists are stored one item per block, so neighbouring items of the
     * same kind are drawn as one <ul> or <ol>.
     *
     * @param  array<mixed>  $blocks
     * @param  bool  $insideColumn  Items in a column may not stretch past it.
     */
    private function renderBlocks(array $blocks, bool $insideColumn = false, ?string $parentPath = null): string
    {
        $blocks = $this->withPaths(array_values(array_filter($blocks, is_array(...))), $parentPath);
        $html = '';
        $index = 0;

        while ($index < count($blocks)) {
            $type = $blocks[$index]['type'] ?? 'paragraph';

            if (in_array($type, self::LIST_TYPES, true)) {
                $group = [];

                while ($index < count($blocks) && ($blocks[$index]['type'] ?? null) === $type) {
                    $group[] = $blocks[$index];
                    $index++;
                }

                $html .= $this->renderList($type, $group);

                continue;
            }

            $html .= $this->renderBlock($blocks[$index], $insideColumn);
            $index++;
        }

        return $html;
    }

    /**
     * Each block with its place in the document, while items are marked.
     * A child's place is always worked out here. A top-level block keeps the
     * place SectionLayoutRenderer gave it, when it is a real place.
     *
     * @param  list<array<mixed>>  $blocks
     * @return list<array<mixed>>
     */
    private function withPaths(array $blocks, ?string $parentPath): array
    {
        if (! $this->forBuilder) {
            return $blocks;
        }

        foreach ($blocks as $index => $block) {
            $blocks[$index][self::ITEM_PATH] = $parentPath === null
                ? (self::isItemPath($block[self::ITEM_PATH] ?? null) ? $block[self::ITEM_PATH] : (string) $index)
                : $parentPath.'.'.$index;
        }

        return $blocks;
    }

    /**
     * The place withPaths() gave a block, if any.
     *
     * @param  array<mixed>  $block
     */
    private static function pathOf(array $block): ?string
    {
        $path = $block[self::ITEM_PATH] ?? null;

        return is_string($path) ? $path : null;
    }

    /**
     * Puts `data-item` on the first tag of an item's HTML.
     */
    private function markItem(string $html, ?string $path): string
    {
        if (! $this->forBuilder || ! self::isItemPath($path)) {
            return $html;
        }

        return preg_replace('/^(\s*<[a-zA-Z][a-zA-Z0-9-]*)/', '$1 data-item="'.e($path).'"', $html, 1) ?? $html;
    }

    /**
     * @param  array<mixed>  $block
     */
    private function renderBlock(array $block, bool $insideColumn): string
    {
        return $this->markItem($this->drawBlock($block, $insideColumn), self::pathOf($block));
    }

    /**
     * @param  array<mixed>  $block
     */
    private function drawBlock(array $block, bool $insideColumn): string
    {
        $path = self::pathOf($block);
        $type = $block['type'] ?? 'paragraph';
        $props = is_array($block['props'] ?? null) ? $block['props'] : [];
        $content = $block['content'] ?? [];
        $children = is_array($block['children'] ?? null) ? $block['children'] : [];

        // Columns and cards hold their blocks in `children`, so they skip
        // the indent drawn below.
        if ($type === 'columnList') {
            return $this->wrap($this->own($this->columnList($children, $path), $block), $props, $insideColumn);
        }

        if ($type === 'card') {
            return $this->wrap($this->own($this->card($props, $content, $children, $insideColumn, $path), $block), $props, $insideColumn);
        }

        $style = $this->styleAttribute(BlockLook::inlineProps($props));

        if ($type === 'toggleListItem' || ($type === 'heading' && filter_var($props['isToggleable'] ?? false, FILTER_VALIDATE_BOOL))) {
            $isHeading = $type === 'heading';
            $summary = $isHeading ? $this->heading($props, $content, $style) : $this->inline($content);

            return $this->wrap($this->own(
                '<details class="bn-toggle"><summary'.($isHeading ? '' : $style).'>'.$summary.'</summary>'
                    .'<div>'.$this->renderBlocks($children, $insideColumn, $path).'</div></details>',
                $block,
            ), $props, $insideColumn);
        }

        $html = match ($type) {
            'paragraph' => '<p'.$style.'>'.$this->inline($content).'</p>',
            'heading' => $this->heading($props, $content, $style),
            'quote' => '<blockquote'.$style.'>'.$this->inline($content).'</blockquote>',
            'codeBlock' => '<pre><code>'.e($this->plainText($content)).'</code></pre>',
            'image' => $this->image($props),
            'video' => $this->video($props),
            'audio' => $this->audio($props),
            'file' => $this->file($props),
            'table' => $this->table($content),
            'divider' => '<hr>',
            'spacer' => '<div class="bn-spacer" style="height: '.(self::pick(self::SPACER_SIZES, $props['size'] ?? null) ?? self::SPACER_SIZES['md']).';"></div>',
            Blocks::BUTTON => $this->button($props),
            Blocks::GALLERY => $this->gallery($props),
            Blocks::OWN_BLOCK => $this->ownBlock($block, $props),
            default => '',
        };

        $html = $this->own($html, $block);

        if ($html !== '' && $children !== []) {
            $html .= '<div class="bn-indent">'.$this->renderBlocks($children, $insideColumn, $path).'</div>';
        }

        return $this->wrap($html, $props, $insideColumn);
    }

    /**
     * The block's own element with its look (BlockLook).
     *
     * @param  array<mixed>  $block
     */
    private function own(string $html, array $block): string
    {
        return BlockLook::apply($html, $block, $this->context);
    }

    /**
     * @param  array<mixed>  $props
     */
    private function wrap(string $html, array $props, bool $insideColumn): string
    {
        return $this->applySpacing($this->constrainWidth($html, $props, $insideColumn), $props);
    }

    /**
     * "Space above" and "Space below". Padding, not margin, so it does not
     * collapse into the margin the paragraph inside already has.
     *
     * @param  array<mixed>  $props
     */
    private function applySpacing(string $html, array $props): string
    {
        $top = self::pick(self::ITEM_SPACING, $props['spaceTop'] ?? null);
        $bottom = self::pick(self::ITEM_SPACING, $props['spaceBottom'] ?? null);

        if ($html === '' || ($top === null && $bottom === null)) {
            return $html;
        }

        $css = trim(($top === null ? '' : "padding-top: {$top}; ").($bottom === null ? '' : "padding-bottom: {$bottom};"));

        return '<div class="bn-item-space" style="'.$css.'">'.$html.'</div>';
    }

    /**
     * Below WIDTH_COLUMNS an item is narrower than the text, placed by its
     * own alignment. Above it, the item stretches past the section padding.
     * Exactly WIDTH_COLUMNS, the default, is left alone.
     *
     * @param  array<mixed>  $props
     */
    private function constrainWidth(string $html, array $props, bool $insideColumn): string
    {
        if ($html === '' || ! is_numeric($props['width'] ?? null)) {
            return $html;
        }

        $columns = (int) $props['width'];

        if ($columns > self::WIDTH_COLUMNS) {
            // In a column an item can only be centred on that column, so
            // stretching it would hang off to one side.
            if ($insideColumn) {
                return $html;
            }

            return '<div class="bn-width bn-bleed-'.min($columns - self::WIDTH_COLUMNS, self::BLEED_STEPS).'">'.$html.'</div>';
        }

        if ($columns < 1 || $columns === self::WIDTH_COLUMNS) {
            return $html;
        }

        $percent = rtrim(rtrim(sprintf('%.4F', $columns / self::WIDTH_COLUMNS * 100), '0'), '.');
        $offset = match ($props['textAlignment'] ?? 'left') {
            'center' => ' margin-left: auto; margin-right: auto;',
            'right' => ' margin-left: auto;',
            default => '',
        };

        return '<div class="bn-width" style="width: '.$percent.'%;'.$offset.'">'.$html.'</div>';
    }

    /**
     * A row of columns. Each column's `width` is a share of the row.
     *
     * @param  array<mixed>  $columns
     */
    private function columnList(array $columns, ?string $path): string
    {
        $html = '';

        foreach (array_values(array_filter($columns, is_array(...))) as $columnIndex => $column) {
            if (($column['type'] ?? null) !== 'column') {
                continue;
            }

            $props = is_array($column['props'] ?? null) ? $column['props'] : [];
            $share = is_numeric($props['width'] ?? null) && (float) $props['width'] > 0 ? (float) $props['width'] : 1.0;
            $children = is_array($column['children'] ?? null) ? $column['children'] : [];

            $html .= '<div class="bn-column" style="flex-grow: '.sprintf('%.4F', $share).';">'
                .$this->renderBlocks($children, insideColumn: true, parentPath: $path === null ? null : $path.'.'.$columnIndex)
                .'</div>';
        }

        return $html === '' ? '' : '<div class="bn-columns">'.$html.'</div>';
    }

    /**
     * A fold-out card: a banner with the title and a Show button over a body
     * of blocks. It is a native <details>, so it needs no JavaScript.
     *
     * @param  array<mixed>  $props
     * @param  array<mixed>  $children
     */
    private function card(array $props, mixed $content, array $children, bool $insideColumn, ?string $path): string
    {
        $url = Urls::media($props['url'] ?? null);
        $button = self::hexColor($props['buttonColor'] ?? null, self::CARD_BUTTON_COLOR) ?? self::CARD_BUTTON_COLOR;
        $buttonText = self::isDarkColor($button) ? '#ffffff' : '#111827';
        $open = filter_var($props['open'] ?? false, FILTER_VALIDATE_BOOL) ? ' open' : '';

        return '<details class="bn-card"'.$open.'>'
            .'<summary class="bn-card-head'.($url === null ? '' : ' bn-card-has-image').'">'
            .($url === null ? '' : '<img class="bn-card-image" src="'.e($url).'" alt="" loading="lazy" decoding="async">')
            .'<span class="bn-card-title">'.$this->inline($content).'</span>'
            .'<span class="bn-card-toggle" style="background-color: '.$button.'; color: '.$buttonText.';">'
            .'<span class="bn-card-show">'.e(__('filament-block-editor::page.show')).' &rarr;</span>'
            .'<span class="bn-card-hide">'.e(__('filament-block-editor::page.hide')).' &darr;</span>'
            .'</span>'
            .'</summary>'
            .'<div class="bn-card-body">'.$this->renderBlocks($children, $insideColumn, $path).'</div>'
            .'</details>';
    }

    /**
     * @param  list<array<mixed>>  $items
     */
    private function renderList(string $type, array $items): string
    {
        $tag = $type === 'numberedListItem' ? 'ol' : 'ul';
        $html = '<'.$tag.($type === 'checkListItem' ? ' class="bn-checklist"' : '').'>';

        foreach ($items as $item) {
            $props = is_array($item['props'] ?? null) ? $item['props'] : [];
            $children = is_array($item['children'] ?? null) ? $item['children'] : [];
            $mark = $type === 'checkListItem'
                ? (filter_var($props['checked'] ?? false, FILTER_VALIDATE_BOOL) ? '☑ ' : '☐ ')
                : '';

            $path = self::pathOf($item);

            $html .= $this->markItem($this->own('<li'.$this->styleAttribute(BlockLook::inlineProps($props)).'>', $item), $path)
                .$mark
                .$this->inline($item['content'] ?? [])
                .($children === [] ? '' : $this->renderBlocks($children, parentPath: $path))
                .'</li>';
        }

        return $html.'</'.$tag.'>';
    }

    /**
     * @param  array<mixed>  $props
     */
    private function heading(array $props, mixed $content, string $style): string
    {
        $level = min(max(is_numeric($props['level'] ?? null) ? (int) $props['level'] : 1, 1), 4);

        return "<h{$level}{$style}>".$this->inline($content)."</h{$level}>";
    }

    /**
     * @param  array<mixed>  $props
     */
    private function image(array $props): string
    {
        $url = $this->media($props['url'] ?? null);

        if ($url === null) {
            return $this->emptyMedia('photo');
        }

        $width = is_numeric($props['previewWidth'] ?? null) ? (int) $props['previewWidth'] : 0;
        $caption = is_string($props['caption'] ?? null) ? trim($props['caption']) : '';

        return '<figure class="bn-image">'
            .'<img src="'.e($url).'" alt="'.e($caption).'" loading="lazy" decoding="async"'
            .($width > 0 ? ' style="width: '.$width.'px;"' : '').'>'
            .($caption === '' ? '' : '<figcaption>'.e($caption).'</figcaption>')
            .'</figure>';
    }

    /**
     * @param  array<mixed>  $props
     */
    private function video(array $props): string
    {
        $url = $this->media($props['url'] ?? null);

        if ($url === null) {
            return $this->emptyMedia('video');
        }

        $embedUrl = self::videoEmbedUrl($url);

        if ($embedUrl !== null) {
            return '<div class="bn-video-embed">'
                .'<iframe src="'.e($embedUrl).'" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>'
                .'</div>';
        }

        return '<video class="bn-video" src="'.e($url).'" controls playsinline preload="metadata"></video>';
    }

    /**
     * Where a photo or video the author has not added yet goes. Only the
     * builder shows it; visitors see nothing.
     *
     * @param  'photo'|'video'  $kind
     */
    private function emptyMedia(string $kind): string
    {
        if (! $this->forBuilder) {
            return '';
        }

        return '<figure class="bn-media-empty" data-empty-media="'.$kind.'"><span>'.e(__("filament-block-editor::preview.empty_{$kind}")).'</span></figure>';
    }

    /**
     * @param  array<mixed>  $props
     */
    private function audio(array $props): string
    {
        $url = Urls::media($props['url'] ?? null);

        return $url === null ? '' : '<audio src="'.e($url).'" controls preload="none"></audio>';
    }

    /**
     * @param  array<mixed>  $props
     */
    private function file(array $props): string
    {
        $url = Urls::media($props['url'] ?? null);

        if ($url === null) {
            return '';
        }

        $name = is_string($props['name'] ?? null) && trim($props['name']) !== '' ? trim($props['name']) : $url;

        return '<p><a href="'.e($url).'" target="_blank" rel="noopener">'.e($name).'</a></p>';
    }

    /**
     * A link that looks like a button. An address that is not allowed
     * (Urls::link) draws the same look as a plain label, with no link.
     *
     * @param  array<mixed>  $props
     */
    private function button(array $props): string
    {
        $text = is_string($props['text'] ?? null) ? trim($props['text']) : '';

        if ($text === '') {
            return '';
        }

        $variant = in_array($props['variant'] ?? null, Blocks::BUTTON_VARIANTS, true) ? $props['variant'] : Blocks::BUTTON_VARIANTS[0];
        $class = 'bn-button bn-button-'.$variant;
        $url = $this->link($props['url'] ?? null);

        return $url === null
            ? '<span class="'.$class.'">'.e($text).'</span>'
            : '<a class="'.$class.'" href="'.e($url).'">'.e($text).'</a>';
    }

    /**
     * A photo slideshow. CSS scroll snapping does the swiping; the page
     * component adds the arrows and dots with a few lines of script.
     *
     * @param  array<mixed>  $props
     */
    private function gallery(array $props): string
    {
        $images = Blocks::galleryUrls($props['images'] ?? null);

        if ($images === []) {
            return $this->emptyMedia('photo');
        }

        return view('filament-block-editor::blocks.gallery', ['images' => $images])->render();
    }

    /**
     * The app's own block, drawn by its definition in the registry.
     *
     * @param  array<mixed>  $block
     * @param  array<mixed>  $props
     */
    private function ownBlock(array $block, array $props): string
    {
        $kind = is_string($props['kind'] ?? null) ? $props['kind'] : '';

        unset($block[self::ITEM_PATH]);

        return ($this->registry ?? app(BlockRegistry::class))
            ->render($kind, Blocks::decodeValues($props['values'] ?? null), $this->context, $block);
    }

    private function table(mixed $content): string
    {
        $rows = is_array($content) ? ($content['rows'] ?? null) : null;

        if (! is_array($rows) || $rows === []) {
            return '';
        }

        $html = '';

        foreach ($rows as $row) {
            $cells = is_array($row) && is_array($row['cells'] ?? null) ? $row['cells'] : [];
            $html .= '<tr>';

            foreach ($cells as $cell) {
                // Older documents store a cell as plain inline content. Newer
                // ones wrap it in a tableCell with props.
                if (is_array($cell) && ($cell['type'] ?? null) === 'tableCell') {
                    $props = is_array($cell['props'] ?? null) ? $cell['props'] : [];
                    $colspan = is_numeric($props['colspan'] ?? null) ? (int) $props['colspan'] : 1;
                    $rowspan = is_numeric($props['rowspan'] ?? null) ? (int) $props['rowspan'] : 1;

                    $html .= '<td'.$this->styleAttribute($props)
                        .($colspan > 1 ? ' colspan="'.min($colspan, 50).'"' : '')
                        .($rowspan > 1 ? ' rowspan="'.min($rowspan, 50).'"' : '')
                        .'>'.$this->inline($cell['content'] ?? []).'</td>';

                    continue;
                }

                $html .= '<td>'.$this->inline($cell).'</td>';
            }

            $html .= '</tr>';
        }

        return '<div class="bn-table"><table>'.$html.'</table></div>';
    }

    /**
     * Styled text and links.
     */
    private function inline(mixed $content): string
    {
        if (! is_array($content)) {
            return '';
        }

        $html = '';

        foreach ($content as $item) {
            if (! is_array($item)) {
                continue;
            }

            if (($item['type'] ?? null) === 'dynamic') {
                $html .= $this->dynamic($item);

                continue;
            }

            if (($item['type'] ?? null) === 'link') {
                $url = $this->link($item['href'] ?? null);
                $inner = $this->inline($item['content'] ?? []);
                $html .= $url === null ? $inner : '<a href="'.e($url).'" target="_blank" rel="noopener">'.$inner.'</a>';

                continue;
            }

            $html .= $this->styledText($item);
        }

        return $html;
    }

    /**
     * A dynamic value in the text, escaped. Visitors get nothing when it is
     * empty; the builder marks it, and shows its label when it is empty.
     *
     * @param  array<mixed>  $item
     */
    private function dynamic(array $item): string
    {
        $key = $item['props']['key'] ?? null;

        if (! DynamicValues::isKey($key)) {
            return '';
        }

        $values = app(DynamicValues::class);
        $value = $values->resolve($key, $this->context);

        if (! $this->forBuilder) {
            return $value === null ? '' : nl2br(e($value), false);
        }

        return '<span class="bn-dynamic" data-dynamic="'.e($key).'">'.nl2br(e($value ?? $values->label($key) ?? $key), false).'</span>';
    }

    /**
     * A link address, its dynamic value resolved, through Urls::link().
     */
    private function link(mixed $url): ?string
    {
        return app(DynamicValues::class)->link($url, $this->context);
    }

    /**
     * A picture or video address, its dynamic value resolved, through Urls::media().
     */
    private function media(mixed $url): ?string
    {
        return app(DynamicValues::class)->media($url, $this->context);
    }

    /**
     * @param  array<mixed>  $item
     */
    private function styledText(array $item): string
    {
        // The editor saves Shift+Enter as "\n" inside the text.
        $html = nl2br(e(is_string($item['text'] ?? null) ? $item['text'] : ''), false);
        $styles = is_array($item['styles'] ?? null) ? $item['styles'] : [];

        foreach (['bold' => 'strong', 'italic' => 'em', 'underline' => 'u', 'strike' => 's', 'code' => 'code'] as $style => $tag) {
            if (($styles[$style] ?? false) === true) {
                $html = "<{$tag}>{$html}</{$tag}>";
            }
        }

        $css = $this->colorCss($styles);

        return $css === '' ? $html : '<span style="'.$css.'">'.$html.'</span>';
    }

    /**
     * @param  array<mixed>  $props
     */
    private function styleAttribute(array $props): string
    {
        $alignment = $props['textAlignment'] ?? null;
        $css = in_array($alignment, ['center', 'right', 'justify'], true) ? "text-align: {$alignment};" : '';
        $css .= $this->colorCss($props);

        return $css === '' ? '' : ' style="'.$css.'"';
    }

    /**
     * Only BlockNote's named colours, never a raw value.
     *
     * @param  array<mixed>  $values
     */
    private function colorCss(array $values): string
    {
        $text = self::pick(self::TEXT_COLORS, $values['textColor'] ?? null);
        $background = self::pick(self::BACKGROUND_COLORS, $values['backgroundColor'] ?? null);

        return ($text === null ? '' : "color: {$text};").($background === null ? '' : "background-color: {$background};");
    }

    /**
     * The value a fixed list holds for a stored key, or null. The key comes
     * from the document, so it may be anything, not only a string.
     *
     * @param  array<string, string>  $map
     */
    private static function pick(array $map, mixed $key): ?string
    {
        return is_string($key) ? ($map[$key] ?? null) : null;
    }

    private function plainText(mixed $content): string
    {
        if (! is_array($content)) {
            return '';
        }

        return implode('', array_map(
            fn (mixed $item): string => is_array($item) && is_string($item['text'] ?? null) ? $item['text'] : '',
            $content,
        ));
    }
}
