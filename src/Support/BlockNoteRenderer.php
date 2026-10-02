<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Vortechron\FilamentBlockEditor\Enums\BlockFont;
use Vortechron\FilamentBlockEditor\Enums\BlockSpacing;

/**
 * Renders a BlockNote JSON document (array of blocks) to sanitized HTML for
 * the public page. Only the block types enabled in the editor are supported;
 * unknown types are skipped silently.
 */
class BlockNoteRenderer
{
    /**
     * The per-item width grid. A block's `width` prop is a whole number of
     * these columns; the default (a full row) renders without a wrapper.
     *
     * Keep in sync with WIDTH_COLUMNS in resources/js/block-width.jsx.
     */
    public const WIDTH_COLUMNS = 12;

    /**
     * Steps above WIDTH_COLUMNS. These stretch an item past the block's
     * padding, out towards the edge of the section, the way Qwilr does. The
     * last step reaches the edge exactly.
     *
     * Keep in sync with BLEED_STEPS in resources/js/block-width.jsx.
     */
    public const BLEED_STEPS = 6;

    /**
     * Every block type renderBlock() knows how to draw, plus `column`, which
     * columnList() draws itself. Anything else is skipped in silence.
     *
     * Keep in sync with the match in renderBlock().
     *
     * @var array<int, string>
     */
    public const SUPPORTED_TYPES = [
        'paragraph',
        'heading',
        'quote',
        'codeBlock',
        'bulletListItem',
        'numberedListItem',
        'checkListItem',
        'toggleListItem',
        'divider',
        'image',
        'video',
        'audio',
        'file',
        'table',
        'spacer',
        'card',
        'columnList',
        'column',
    ];

    /**
     * The Show button on a card when the card does not pick its own colour.
     *
     * Keep in sync with CARD_BUTTON_COLOR in resources/js/card-block.jsx.
     */
    public const CARD_BUTTON_COLOR = '#f6c343';

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

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     */
    public function render(array $blocks): string
    {
        return $this->sanitize($this->renderBlocks($blocks));
    }

    /**
     * Every font a document names with a `fontFamily` inline style, so the page
     * that draws it can load exactly those web fonts and no others. Names the
     * enum does not know are skipped, the same way styledText() skips them.
     *
     * @param  array<int, mixed>  $blocks
     * @return array<int, BlockFont>
     */
    public static function fontsUsedIn(array $blocks): array
    {
        $found = [];

        array_walk_recursive($blocks, function (mixed $value, string|int $key) use (&$found): void {
            if ($key === 'fontFamily' && $font = BlockFont::tryFrom((string) $value)) {
                $found[$font->value] = $font;
            }
        });

        return array_values($found);
    }

    /**
     * The block types in a document this renderer would drop, each named once.
     *
     * Nested blocks count too: a `columnList` holds its columns in `children`,
     * and any block may hold indented blocks the same way.
     *
     * @param  array<int, mixed>  $blocks
     * @return array<int, string>
     */
    public static function unsupportedTypesIn(array $blocks): array
    {
        $found = [];

        $walk = function (array $blocks) use (&$walk, &$found): void {
            foreach ($blocks as $block) {
                if (! is_array($block)) {
                    continue;
                }

                $type = $block['type'] ?? 'paragraph';

                if (is_string($type) && ! in_array($type, self::SUPPORTED_TYPES, true)) {
                    $found[$type] = true;
                }

                if (is_array($block['children'] ?? null)) {
                    $walk($block['children']);
                }
            }
        };

        $walk($blocks);

        return array_keys($found);
    }

    /**
     * Convert a share URL from a known video host into an embeddable URL.
     * Unknown hosts return null so the caller falls back to a <video> tag.
     */
    public static function videoEmbedUrl(?string $url): ?string
    {
        if (blank($url)) {
            return null;
        }

        return static::youTubeEmbedUrl($url)
            ?? static::vimeoEmbedUrl($url)
            ?? static::loomEmbedUrl($url);
    }

    /**
     * Watch, share, shorts, live and already-embedded YouTube links.
     */
    private static function youTubeEmbedUrl(string $url): ?string
    {
        if (preg_match('~youtube(?:-nocookie)?\.com/watch\?.*v=([\w-]{6,})~', $url, $matches)
            || preg_match('~youtube(?:-nocookie)?\.com/(?:shorts|embed|live|v)/([\w-]{6,})~', $url, $matches)
            || preg_match('~youtu\.be/([\w-]{6,})~', $url, $matches)) {
            return "https://www.youtube-nocookie.com/embed/{$matches[1]}";
        }

        return null;
    }

    /**
     * Vimeo hands out the same video under several paths: vimeo.com/ID,
     * vimeo.com/video/ID, player.vimeo.com/video/ID, and prefixed paths such
     * as /channels/name/ID, /groups/name/videos/ID or /manage/videos/ID. An
     * unlisted video also carries a privacy hash, either as a trailing path
     * segment (vimeo.com/ID/HASH) or as ?h=HASH; the embed does not play
     * without it, so it is carried over.
     */
    private static function vimeoEmbedUrl(string $url): ?string
    {
        if (preg_match('~vimeo\.com/event/(\d+)~', $url, $matches)) {
            return "https://vimeo.com/event/{$matches[1]}/embed";
        }

        if (preg_match('~vimeo\.com/(?:[\w-]+/)*?(?:video/)?(\d+)(?:/([a-zA-Z0-9]+))?~', $url, $matches) !== 1) {
            return null;
        }

        $hash = $matches[2] ?? '';

        if ($hash === '' && preg_match('~[?&]h=([a-zA-Z0-9]+)~', $url, $query) === 1) {
            $hash = $query[1];
        }

        $embed = "https://player.vimeo.com/video/{$matches[1]}";

        return $hash === '' ? $embed : $embed.'?h='.$hash;
    }

    /**
     * Share and already-embedded Loom links.
     */
    private static function loomEmbedUrl(string $url): ?string
    {
        if (preg_match('~loom\.com/(?:share|embed)/([\w-]+)~', $url, $matches)) {
            return "https://www.loom.com/embed/{$matches[1]}";
        }

        return null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $blocks
     * @param  bool  $insideColumn  Items in a multi-column layout may not be stretched past their column.
     */
    private function renderBlocks(array $blocks, bool $insideColumn = false): string
    {
        $blocks = array_values($blocks);
        $html = '';
        $index = 0;

        while ($index < count($blocks)) {
            $type = $blocks[$index]['type'] ?? 'paragraph';

            if (in_array($type, ['bulletListItem', 'numberedListItem', 'checkListItem'], true)) {
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
     * @param  array<string, mixed>  $block
     */
    private function renderBlock(array $block, bool $insideColumn = false): string
    {
        $props = (array) ($block['props'] ?? []);
        $content = $block['content'] ?? [];
        $children = is_array($block['children'] ?? null) ? $block['children'] : [];

        // Multi-column layout blocks hold their columns in `children`, so they
        // bypass the generic children handling below. They can still be resized
        // as a whole, the same as any other item.
        if (($block['type'] ?? null) === 'columnList') {
            return $this->applySpacing(
                $this->constrainWidth($this->columnList($children), $props, $insideColumn),
                $props,
            );
        }

        // A card holds its body in `children` too, drawn inside the fold-out
        // rather than as an indent after it.
        if (($block['type'] ?? null) === 'card') {
            return $this->applySpacing(
                $this->constrainWidth($this->card($props, $content, $children, $insideColumn), $props, $insideColumn),
                $props,
            );
        }

        $style = $this->styleAttribute($props);

        if (($block['type'] ?? null) === 'toggleListItem'
            || (($block['type'] ?? null) === 'heading' && filter_var($props['isToggleable'] ?? false, FILTER_VALIDATE_BOOL))) {
            $isHeading = ($block['type'] ?? null) === 'heading';
            $summary = $isHeading ? $this->heading($props, $content, $style) : $this->inline($content);

            return $this->applySpacing(
                $this->constrainWidth($this->toggle($summary, $children, $insideColumn, $isHeading ? '' : $style), $props, $insideColumn),
                $props,
            );
        }

        $html = match ($block['type'] ?? 'paragraph') {
            'paragraph' => '<p'.$style.'>'.$this->inline($content).'</p>',
            'heading' => $this->heading($props, $content, $style),
            'quote' => '<blockquote'.$style.'>'.$this->inline($content).'</blockquote>',
            'codeBlock' => '<pre><code>'.e($this->plainText($content)).'</code></pre>',
            'image' => $this->image($props),
            'video' => $this->video($props),
            'audio' => $this->audio($props),
            'file' => $this->file($props),
            'table' => $this->table($block),
            'divider' => '<hr>',
            'spacer' => '<div class="bn-spacer" style="height: '.$this->spacerHeight($props).';"></div>',
            default => '',
        };

        if ($children !== []) {
            $html .= '<div class="bn-indent">'.$this->renderBlocks($children, $insideColumn).'</div>';
        }

        return $this->applySpacing($this->constrainWidth($html, $props, $insideColumn), $props);
    }

    /**
     * Wrap a block that carries its own vertical spacing. `spaceTop` and
     * `spaceBottom` hold BlockSpacing preset names, the same ones the whole
     * block uses for its padding and margins. `none` (the default) renders
     * nothing at all, so documents saved before this existed are untouched.
     *
     * Padding, not margin: a margin here would collapse into the margin the
     * paragraph or heading inside already has, so the gap the user picked in
     * the editor would silently shrink.
     *
     * @param  array<string, mixed>  $props
     */
    private function applySpacing(string $html, array $props): string
    {
        if ($html === '') {
            return $html;
        }

        $top = BlockSpacing::fromValue($props['spaceTop'] ?? null, BlockSpacing::None);
        $bottom = BlockSpacing::fromValue($props['spaceBottom'] ?? null, BlockSpacing::None);

        if ($top === BlockSpacing::None && $bottom === BlockSpacing::None) {
            return $html;
        }

        $css = collect([
            $top === BlockSpacing::None ? null : "padding-top: {$top->css()};",
            $bottom === BlockSpacing::None ? null : "padding-bottom: {$bottom->css()};",
        ])->filter()->implode(' ');

        return '<div class="bn-item-space" style="'.$css.'">'.$html.'</div>';
    }

    /**
     * Wrap a block when the editor stored a `width` prop. The prop counts grid
     * columns: below WIDTH_COLUMNS the item is narrower than the text column,
     * above it the item stretches past the block's padding towards the edge of
     * the section. Exactly WIDTH_COLUMNS (the default) is left alone, so old
     * documents and untouched blocks render as before.
     *
     * @param  array<string, mixed>  $props
     */
    private function constrainWidth(string $html, array $props, bool $insideColumn): string
    {
        if ($html === '' || ! isset($props['width'])) {
            return $html;
        }

        $columns = (int) $props['width'];

        if ($columns > self::WIDTH_COLUMNS) {
            // Inside a multi-column layout an item can only be centred on its
            // own column, so stretching it would hang off to one side.
            return $insideColumn ? $html : $this->bleedWidth($html, $columns);
        }

        if ($columns < 1 || $columns === self::WIDTH_COLUMNS) {
            return $html;
        }

        $percent = rtrim(rtrim(sprintf('%.4F', $columns / self::WIDTH_COLUMNS * 100), '0'), '.');

        // The block's own alignment decides where the narrower column sits.
        $offset = match ($props['textAlignment'] ?? 'left') {
            'center' => ' margin-left: auto; margin-right: auto;',
            'right' => ' margin-left: auto;',
            default => '',
        };

        return '<div class="bn-width" style="width: '.$percent.'%;'.$offset.'">'.$html.'</div>';
    }

    /**
     * Stretch an item past the block's padding. The step is carried as a class
     * rather than an inline custom property, because the HTML sanitizer keeps
     * classes but is not guaranteed to keep CSS variables. The widths
     * themselves live in the stylesheets, keyed by these classes.
     */
    private function bleedWidth(string $html, int $columns): string
    {
        $step = min($columns - self::WIDTH_COLUMNS, self::BLEED_STEPS);

        return '<div class="bn-width bn-bleed-'.$step.'">'.$html.'</div>';
    }

    /**
     * Render a BlockNote columnList block: children are `column` blocks whose
     * `width` prop is a relative flex weight.
     *
     * @param  array<int, array<string, mixed>>  $columns
     */
    private function columnList(array $columns): string
    {
        $html = '<div class="bn-columns">';

        foreach ($columns as $column) {
            if (! is_array($column) || ($column['type'] ?? null) !== 'column') {
                continue;
            }

            $width = (float) (((array) ($column['props'] ?? []))['width'] ?? 1);
            $width = $width > 0 ? $width : 1.0;
            $children = is_array($column['children'] ?? null) ? $column['children'] : [];

            $html .= '<div class="bn-column" style="flex-grow: '.sprintf('%.4F', $width).';">'
                .$this->renderBlocks($children, insideColumn: true)
                .'</div>';
        }

        return $html.'</div>';
    }

    /**
     * A fold-out card: a banner with the title and a Show button, over a body
     * of child blocks. It is a native <details>, so it opens and closes with
     * no JavaScript, and the PDF, which ignores <details>, prints it open.
     *
     * @param  array<string, mixed>  $props
     * @param  array<int, mixed>  $children
     */
    private function card(array $props, mixed $content, array $children, bool $insideColumn): string
    {
        $url = $this->safeUrl($props['url'] ?? null);
        $button = BlockColor::hex($props['buttonColor'] ?? null, self::CARD_BUTTON_COLOR);
        $buttonText = BlockColor::isDark($button) ? '#ffffff' : '#111827';
        $open = filter_var($props['open'] ?? false, FILTER_VALIDATE_BOOL) ? ' open' : '';

        return '<details class="bn-card"'.$open.'>'
            .'<summary class="bn-card-head'.($url === null ? '' : ' bn-card-has-image').'">'
            .($url === null ? '' : '<img class="bn-card-image" src="'.e($url).'" alt="">')
            .'<span class="bn-card-title">'.$this->inline($content).'</span>'
            .'<span class="bn-card-toggle" style="background-color: '.$button.'; color: '.$buttonText.';">'
            .'<span class="bn-card-show">Show &rarr;</span><span class="bn-card-hide">Hide &darr;</span>'
            .'</span>'
            .'</summary>'
            .'<div class="bn-card-body">'.$this->renderBlocks($children, $insideColumn).'</div>'
            .'</details>';
    }

    /**
     * A toggle's title stays visible in the summary while its child blocks
     * fold underneath. Dompdf prints both because it ignores details.
     *
     * @param  array<int, array<string, mixed>>  $children
     */
    private function toggle(string $summary, array $children, bool $insideColumn, string $style): string
    {
        return '<details class="bn-toggle"><summary'.$style.'>'.$summary.'</summary>'
            .'<div>'.$this->renderBlocks($children, $insideColumn).'</div></details>';
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function renderList(string $type, array $items): string
    {
        $tag = $type === 'numberedListItem' ? 'ol' : 'ul';
        $class = $type === 'checkListItem' ? ' class="bn-checklist"' : '';
        $html = "<{$tag}{$class}>";

        foreach ($items as $item) {
            $prefix = '';

            if ($type === 'checkListItem') {
                $prefix = (($item['props']['checked'] ?? false) ? '☑' : '☐').' ';
            }

            $html .= '<li'.$this->styleAttribute((array) ($item['props'] ?? [])).'>'
                .$prefix
                .$this->inline($item['content'] ?? []);

            $children = is_array($item['children'] ?? null) ? $item['children'] : [];

            if ($children !== []) {
                $html .= $this->renderBlocks($children);
            }

            $html .= '</li>';
        }

        return "{$html}</{$tag}>";
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function heading(array $props, mixed $content, string $style): string
    {
        $level = min(max((int) ($props['level'] ?? 1), 1), 4);

        return "<h{$level}{$style}>".$this->inline($content)."</h{$level}>";
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function image(array $props): string
    {
        $url = $this->safeUrl($props['url'] ?? null);

        if ($url === null) {
            return '';
        }

        $width = (int) ($props['previewWidth'] ?? 0);
        $widthStyle = $width > 0 ? ' style="width: '.$width.'px; max-width: 100%;"' : '';
        $caption = trim((string) ($props['caption'] ?? ''));

        $html = '<figure class="bn-image"><img src="'.e($url).'" alt="'.e($caption).'"'.$widthStyle.'>';

        if ($caption !== '') {
            $html .= '<figcaption>'.e($caption).'</figcaption>';
        }

        return $html.'</figure>';
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function video(array $props): string
    {
        $url = $this->safeUrl($props['url'] ?? null);

        if ($url === null) {
            return '';
        }

        if ($embedUrl = static::videoEmbedUrl($url)) {
            return '<div class="bn-video-embed">'
                .'<iframe src="'.e($embedUrl).'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>'
                .'</div>';
        }

        return '<video class="bn-video" src="'.e($url).'" controls playsinline></video>';
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function audio(array $props): string
    {
        $url = $this->safeUrl($props['url'] ?? null);

        if ($url === null) {
            return '';
        }

        return '<audio src="'.e($url).'" controls></audio>';
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function file(array $props): string
    {
        $url = $this->safeUrl($props['url'] ?? null);

        if ($url === null) {
            return '';
        }

        $name = trim((string) ($props['name'] ?? '')) ?: $url;

        return '<p><a href="'.e($url).'" target="_blank" rel="noopener">'.e($name).'</a></p>';
    }

    /**
     * @param  array<string, mixed>  $block
     */
    private function table(array $block): string
    {
        $rows = $block['content']['rows'] ?? [];

        if (! is_array($rows) || $rows === []) {
            return '';
        }

        $html = '<table>';

        foreach ($rows as $row) {
            $html .= '<tr>';

            foreach (($row['cells'] ?? []) as $cell) {
                // Older documents store a cell as a plain inline-content array;
                // newer ones wrap it in a tableCell object with props.
                if (is_array($cell) && ($cell['type'] ?? null) === 'tableCell') {
                    $props = (array) ($cell['props'] ?? []);
                    $colspan = (int) ($props['colspan'] ?? 1);
                    $rowspan = (int) ($props['rowspan'] ?? 1);
                    $attributes = $this->styleAttribute($props)
                        .($colspan > 1 ? ' colspan="'.$colspan.'"' : '')
                        .($rowspan > 1 ? ' rowspan="'.$rowspan.'"' : '');
                    $html .= '<td'.$attributes.'>'.$this->inline($cell['content'] ?? []).'</td>';

                    continue;
                }

                $html .= '<td>'.$this->inline($cell).'</td>';
            }

            $html .= '</tr>';
        }

        return $html.'</table>';
    }

    /**
     * Render BlockNote inline content (styled text and links).
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

            if (($item['type'] ?? null) === 'link') {
                $url = $this->safeUrl($item['href'] ?? null);
                $inner = $this->inline($item['content'] ?? []);
                $html .= $url === null
                    ? $inner
                    : '<a href="'.e($url).'" target="_blank" rel="noopener">'.$inner.'</a>';

                continue;
            }

            $html .= $this->styledText($item);
        }

        return $html;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function styledText(array $item): string
    {
        // The editor saves Shift+Enter as "\n" inside the text. Without <br>
        // the browser folds it into a space and two lines become one.
        $html = nl2br(e((string) ($item['text'] ?? '')), false);
        $styles = (array) ($item['styles'] ?? []);

        foreach (['bold' => 'strong', 'italic' => 'em', 'underline' => 'u', 'strike' => 's', 'code' => 'code'] as $styleName => $tag) {
            if ($styles[$styleName] ?? false) {
                $html = "<{$tag}>{$html}</{$tag}>";
            }
        }

        $css = '';

        if ($color = self::TEXT_COLORS[$styles['textColor'] ?? null] ?? null) {
            $css .= "color: {$color};";
        }

        if ($background = self::BACKGROUND_COLORS[$styles['backgroundColor'] ?? null] ?? null) {
            $css .= "background-color: {$background};";
        }

        // The editor writes a BlockFont key, never a raw CSS value, so an
        // unknown name simply renders without a typeface of its own.
        if ($font = BlockFont::tryFrom((string) ($styles['fontFamily'] ?? ''))) {
            $css .= 'font-family: '.$font->cssStack().';';
        }

        return $css === '' ? $html : '<span style="'.$css.'">'.$html.'</span>';
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function styleAttribute(array $props): string
    {
        $css = '';

        $alignment = $props['textAlignment'] ?? null;

        if (in_array($alignment, ['center', 'right', 'justify'], true)) {
            $css .= "text-align: {$alignment};";
        }

        if ($color = self::TEXT_COLORS[$props['textColor'] ?? null] ?? null) {
            $css .= "color: {$color};";
        }

        if ($background = self::BACKGROUND_COLORS[$props['backgroundColor'] ?? null] ?? null) {
            $css .= "background-color: {$background};";
        }

        return $css === '' ? '' : ' style="'.$css.'"';
    }

    /**
     * Keep the size map in sync with SPACER_SIZES in resources/js/blocknote.jsx.
     *
     * @param  array<string, mixed>  $props
     */
    private function spacerHeight(array $props): string
    {
        return match ($props['size'] ?? 'md') {
            'sm' => '1rem',
            'lg' => '5rem',
            'xl' => '8rem',
            default => '2.5rem',
        };
    }

    private function plainText(mixed $content): string
    {
        if (! is_array($content)) {
            return '';
        }

        return collect($content)
            ->map(fn ($item): string => is_array($item) ? (string) ($item['text'] ?? '') : '')
            ->implode('');
    }

    /**
     * Web links, mail links and paths on this site (/storage/... from the
     * public disk). Anything else, javascript: included, is dropped.
     */
    private function safeUrl(mixed $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $url = trim($url);

        if (preg_match('~^(https?://|mailto:|/(?!/))~i', $url) !== 1) {
            return null;
        }

        return $url;
    }

    /**
     * Defense in depth: the renderer already escapes everything, but run the
     * output through Filament's sanitizer config extended with the media
     * elements this renderer produces (iframe/video/audio are stripped by the
     * default config).
     */
    private function sanitize(string $html): string
    {
        $sanitizer = new HtmlSanitizer(
            app(HtmlSanitizerConfig::class)
                ->allowElement('iframe', ['src', 'class', 'allow', 'allowfullscreen', 'loading'])
                ->allowElement('video', ['src', 'class', 'controls', 'playsinline', 'muted', 'loop', 'autoplay', 'poster'])
                ->allowElement('audio', ['src', 'class', 'controls'])
                ->allowAttribute('colspan', allowedElements: 'td')
                ->allowAttribute('rowspan', allowedElements: 'td'),
        );

        return $sanitizer->sanitize($html);
    }
}
