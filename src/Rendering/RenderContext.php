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
 * `sectionId`: the section being drawn, set by PageRenderer, so a form
 * knows its key (`{sectionId}.{blockId}`).
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
        public ?string $sectionId = null,
    ) {}

    /**
     * The same context with more values (these win over the ones it has).
     *
     * @param  array<string, mixed>  $values
     */
    public function withValues(array $values): self
    {
        return new self($this->forBuilder, $this->isPreview, [...$this->values, ...$values], $this->sectionId);
    }

    /**
     * The same context, drawing the section with this id.
     */
    public function withSection(string $id): self
    {
        return new self($this->forBuilder, $this->isPreview, $this->values, $id);
    }
}
