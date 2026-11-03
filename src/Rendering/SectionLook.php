<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\Styling\Advanced;
use Vortechron\FilamentBlockEditor\Styling\StyleBag;
use Vortechron\FilamentBlockEditor\Styling\StyleSheet;

/**
 * A section's `style` and `advanced` settings, ready to draw: the rules go
 * into the page's StyleSheet, and the section element gets its classes.
 *
 * When `style` and a simple look field set the same thing, `style` wins.
 * Two look fields would still win in CSS, so they move here: the preset
 * background colour (an inline style on the section) becomes the base of
 * the style's background colour, and the `align` preset (an !important
 * rule) becomes the base of its text alignment.
 */
final class SectionLook
{
    /**
     * @param  list<string>  $classes  the extra classes of the <section>
     * @param  array<string, mixed>  $data  the section data the view draws
     */
    private function __construct(public readonly array $classes, public readonly array $data, public readonly bool $inlineBackground) {}

    /**
     * @param  array<string, mixed>  $data  cleaned section data
     */
    public static function apply(string $id, array $data, RenderContext $context): self
    {
        $style = StyleBag::clean($data['style'] ?? null);
        $advanced = Advanced::clean($data['advanced'] ?? null);

        if ($style === [] && $advanced === []) {
            return new self([], $data, inlineBackground: true);
        }

        $presetColor = ($data['background'] ?? null) === 'color' ? BlockNoteRenderer::hexColor($data['background_color'] ?? null) : null;
        $movesBackground = $presetColor !== null && StyleBag::sets($style, 'background_color');

        if ($movesBackground) {
            $style['desktop'] = ['background_color' => $presetColor, ...($style['desktop'] ?? [])];
        }

        if (in_array($data['align'] ?? null, ['left', 'center'], true) && StyleBag::sets($style, 'text_align')) {
            $style['desktop'] = ['text_align' => $data['align'], ...($style['desktop'] ?? [])];
            $data['align'] = 'auto';
        }

        StyleSheet::current()?->section($id, $style, $advanced, $context->forBuilder);

        $classes = [StyleSheet::sectionClass($id), ...(isset($advanced['class']) ? explode(' ', $advanced['class']) : [])];

        return new self($classes, $data, inlineBackground: ! $movesBackground);
    }
}
