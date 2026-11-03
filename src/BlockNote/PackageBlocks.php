<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Forms\FormDefinition;
use Vortechron\FilamentBlockEditor\Forms\FormRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * Draws the blocks the package adds to BlockNote, for BlockNoteRenderer:
 * the button, the app's own blocks (through Blocks\BlockRegistry) and the
 * form (through Forms\FormRenderer).
 */
final readonly class PackageBlocks
{
    public function __construct(
        private RenderContext $context,
        private InlineContent $inline,
        private ?BlockRegistry $registry = null,
    ) {}

    /**
     * A link that looks like a button. An address that is not allowed
     * (Urls::link) draws the same look as a plain label, with no link.
     *
     * @param  array<mixed>  $props
     */
    public function button(array $props): string
    {
        $text = is_string($props['text'] ?? null) ? trim($props['text']) : '';

        if ($text === '') {
            return '';
        }

        $variant = in_array($props['variant'] ?? null, Blocks::BUTTON_VARIANTS, true) ? $props['variant'] : Blocks::BUTTON_VARIANTS[0];
        $class = 'bn-button bn-button-'.$variant;
        $url = $this->inline->link($props['url'] ?? null);

        return $url === null
            ? '<span class="'.$class.'">'.e($text).'</span>'
            : '<a class="'.$class.'" href="'.e($url).'">'.e($text).'</a>';
    }

    /**
     * The app's own block, drawn by its definition in the registry.
     *
     * @param  array<mixed>  $block
     * @param  array<mixed>  $props
     */
    public function ownBlock(array $block, array $props): string
    {
        $kind = is_string($props['kind'] ?? null) ? $props['kind'] : '';

        unset($block[BlockNoteRenderer::ITEM_PATH]);

        return ($this->registry ?? app(BlockRegistry::class))
            ->render($kind, Blocks::decodeValues($props['values'] ?? null), $this->context, $block);
    }

    /**
     * A form anyone builds in the editor (Forms\FormRenderer). It needs a
     * block id for its key; BlockNoteDocument::clean() gives every form one.
     *
     * @param  array<mixed>  $block
     * @param  array<mixed>  $props
     */
    public function form(array $block, array $props): string
    {
        $id = BlockNoteDocument::blockId($block['id'] ?? null);

        return $id === null ? '' : app(FormRenderer::class)->render(FormDefinition::fromProps($props), $id, $this->context);
    }
}
