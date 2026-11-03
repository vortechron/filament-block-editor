<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Styling\Look;
use Vortechron\FilamentBlockEditor\Styling\StyleBag;
use Vortechron\FilamentBlockEditor\Styling\StyleSheet;

/**
 * Draws a block's `look` prop (Styling\Look): its rules go into the page's
 * StyleSheet, and its element gets `fbe-b fbe-b-{id}` and its own class
 * names. The class goes on the block's own outer element (a <p>, an <a>,
 * an own block's wrapper), so a button stays inline; HTML that does not
 * start with an element is wrapped in `<div class="fbe-b fbe-b-{id}">`.
 *
 * A block needs an id for this. BlockNoteDocument::clean() gives one to
 * every block with a look.
 */
final class BlockLook
{
    /**
     * BlockNote's own colour and alignment are inline styles, which beat
     * any stylesheet. Where the look sets the same thing, they are left
     * out, so the look wins.
     *
     * @param  array<mixed>  $props
     * @return array<mixed>
     */
    public static function inlineProps(array $props): array
    {
        $style = Look::decode($props['look'] ?? null)['style'] ?? [];

        foreach (['color' => 'textColor', 'background_color' => 'backgroundColor', 'text_align' => 'textAlignment'] as $key => $prop) {
            if (StyleBag::sets($style, $key)) {
                unset($props[$prop]);
            }
        }

        return $props;
    }

    /**
     * @param  array<mixed>  $block
     */
    public static function apply(string $html, array $block, RenderContext $context): string
    {
        $props = is_array($block['props'] ?? null) ? $block['props'] : [];
        $look = Look::decode($props['look'] ?? null);
        $id = BlockNoteDocument::blockId($block['id'] ?? null);

        if ($look === [] || $id === null || trim($html) === '') {
            return $html;
        }

        StyleSheet::current()?->block($id, $look['style'] ?? [], $look['advanced'] ?? [], $context->forBuilder);

        $classes = 'fbe-b '.StyleSheet::blockClass($id).(isset($look['advanced']['class']) ? ' '.$look['advanced']['class'] : '');

        return self::addClass($html, $classes);
    }

    /**
     * Adds classes to the first element of some HTML, or wraps it.
     */
    private static function addClass(string $html, string $classes): string
    {
        if (preg_match('/^(\s*<[a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/', $html, $match) !== 1) {
            return '<div class="'.e($classes).'">'.$html.'</div>';
        }

        $attributes = preg_match('/\sclass="[^"]*"/', $match[2]) === 1
            ? (string) preg_replace('/(\sclass="[^"]*)"/', '$1 '.e($classes).'"', $match[2], 1)
            : ' class="'.e($classes).'"'.$match[2];

        return $match[1].$attributes.'>'.substr($html, strlen($match[0]));
    }
}
