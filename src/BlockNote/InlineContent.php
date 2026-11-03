<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * Draws a block's inline content for BlockNoteRenderer: styled text, links
 * and dynamic values, every word escaped. Only BlockNote's named colours
 * reach a style attribute, never a raw value.
 *
 * A dynamic value is drawn as its escaped value (in the builder inside
 * `<span class="bn-dynamic" data-dynamic="{key}">`, with the value's label
 * when it is empty). A link's address, a `@key` too, is resolved and then
 * checked by Urls::link().
 */
final readonly class InlineContent
{
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

    public function __construct(private RenderContext $context) {}

    /**
     * Styled text and links.
     */
    public function html(mixed $content): string
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
                $inner = $this->html($item['content'] ?? []);
                $html .= $url === null ? $inner : '<a href="'.e($url).'" target="_blank" rel="noopener">'.$inner.'</a>';

                continue;
            }

            $html .= $this->styledText($item);
        }

        return $html;
    }

    /**
     * The words alone, not escaped.
     */
    public function plainText(mixed $content): string
    {
        if (! is_array($content)) {
            return '';
        }

        return implode('', array_map(
            fn (mixed $item): string => is_array($item) && is_string($item['text'] ?? null) ? $item['text'] : '',
            $content,
        ));
    }

    /**
     * A block's text alignment and named colours as a style attribute, or ''.
     *
     * @param  array<mixed>  $props
     */
    public function styleAttribute(array $props): string
    {
        $alignment = $props['textAlignment'] ?? null;
        $css = in_array($alignment, ['center', 'right', 'justify'], true) ? "text-align: {$alignment};" : '';
        $css .= $this->colorCss($props);

        return $css === '' ? '' : ' style="'.$css.'"';
    }

    /**
     * A link address, its dynamic value resolved, through Urls::link().
     */
    public function link(mixed $url): ?string
    {
        return app(DynamicValues::class)->link($url, $this->context);
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

        if (! $this->context->forBuilder) {
            return $value === null ? '' : nl2br(e($value), false);
        }

        return '<span class="bn-dynamic" data-dynamic="'.e($key).'">'.nl2br(e($value ?? $values->label($key) ?? $key), false).'</span>';
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
     * Only BlockNote's named colours, never a raw value. The names come
     * from the document, so they may be anything, not only a string.
     *
     * @param  array<mixed>  $values
     */
    private function colorCss(array $values): string
    {
        $text = is_string($values['textColor'] ?? null) ? (self::TEXT_COLORS[$values['textColor']] ?? null) : null;
        $background = is_string($values['backgroundColor'] ?? null) ? (self::BACKGROUND_COLORS[$values['backgroundColor']] ?? null) : null;

        return ($text === null ? '' : "color: {$text};").($background === null ? '' : "background-color: {$background};");
    }
}
