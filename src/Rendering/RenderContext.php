<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

/**
 * Who a page is drawn for.
 *
 * `forBuilder`: the page builder's canvas. Items carry `data-item` (their
 * place in the document) so a click finds them, and an empty photo or video
 * shows where it goes.
 *
 * `isPreview`: an author's preview of unsaved work. Each section's wrapper
 * gets an empty-section label, and the page is marked `data-preview`.
 *
 * A public visitor gets neither: `new RenderContext()`.
 */
final readonly class RenderContext
{
    public function __construct(
        public bool $forBuilder = false,
        public bool $isPreview = false,
    ) {}
}
