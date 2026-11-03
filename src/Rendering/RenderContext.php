<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

/**
 * Who a page is drawn for, and with which values.
 *
 * `forBuilder`: the page builder's canvas. Items carry `data-item` (their
 * place in the document) so a click finds them, and an empty photo or video
 * shows where it goes.
 *
 * `isPreview`: an author's preview of unsaved work. Each section's wrapper
 * gets an empty-section label, and the page is marked `data-preview`.
 *
 * `values`: dynamic values for this draw (Content\DynamicValues), by key,
 * such as `['entry.title' => 'Kopi']`. They win over the registered ones.
 *
 * A public visitor gets neither flag: `new RenderContext()`.
 */
final readonly class RenderContext
{
    /**
     * @param  array<string, mixed>  $values
     */
    public function __construct(
        public bool $forBuilder = false,
        public bool $isPreview = false,
        public array $values = [],
    ) {}

    /**
     * The same context with more values (these win over the ones it has).
     *
     * @param  array<string, mixed>  $values
     */
    public function withValues(array $values): self
    {
        return new self($this->forBuilder, $this->isPreview, [...$this->values, ...$values]);
    }
}
