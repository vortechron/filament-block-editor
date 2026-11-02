<?php

namespace Vortechron\FilamentBlockEditor\Blocks;

use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * The own blocks of the app, by kind. One instance serves the whole app
 * (the service provider registers it as a singleton). PHP is the single
 * source of truth: the builder gets definitions() as JSON, and the renderer
 * draws a block through render().
 */
final class BlockRegistry
{
    /**
     * @var array<string, OwnBlock>
     */
    private array $blocks = [];

    public function register(OwnBlock $block): self
    {
        $this->blocks[$block->kind] = $block;

        return $this;
    }

    public function forget(string $kind): self
    {
        unset($this->blocks[$kind]);

        return $this;
    }

    public function has(string $kind): bool
    {
        return isset($this->blocks[$kind]);
    }

    public function get(string $kind): ?OwnBlock
    {
        return $this->blocks[$kind] ?? null;
    }

    /**
     * @return array<string, OwnBlock>
     */
    public function all(): array
    {
        return $this->blocks;
    }

    /**
     * The definitions the builder gets, as JSON-ready arrays.
     *
     * @return list<array<string, mixed>>
     */
    public function definitions(): array
    {
        return array_values(array_map(fn (OwnBlock $block): array => $block->toArray(), $this->blocks));
    }

    /**
     * Values cleaned by the definition of `$kind`, or null when no block of
     * that kind is registered.
     *
     * @param  array<mixed>  $values
     * @return array<string, mixed>|null
     */
    public function cleanValues(string $kind, array $values): ?array
    {
        return $this->get($kind)?->clean($values);
    }

    /**
     * The block's HTML, inside `<div class="bn-own-block" data-own-block="{kind}">`.
     * Values are cleaned by the definition first. An unknown kind draws
     * nothing for visitors, and a "missing block" placeholder in the builder.
     *
     * @param  array<mixed>  $values
     * @param  array<mixed>  $block  the raw BlockNote block, passed to the view as `$block`
     */
    public function render(string $kind, array $values, RenderContext $context, array $block = []): string
    {
        $definition = $this->get($kind);

        if ($definition === null) {
            return $context->forBuilder ? $this->missing($kind) : '';
        }

        $html = $definition->render($definition->clean($values), $block, $context);

        if (trim($html) === '' && ! $context->forBuilder) {
            return '';
        }

        return '<div class="bn-own-block" data-own-block="'.e($kind).'">'.$html.'</div>';
    }

    private function missing(string $kind): string
    {
        return '<figure class="bn-media-empty" data-empty-media="block"><span>'
            .e(__('filament-block-editor::preview.missing_block', ['kind' => $kind]))
            .'</span></figure>';
    }
}
