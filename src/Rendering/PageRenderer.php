<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;

/**
 * Draws a page: a list of sections (Content\PageContent) as HTML.
 *
 * Each section is wrapped in `<div data-block-id="{id}">`. In a preview the
 * wrapper also carries `data-empty-label`, the words shown while the section
 * is still empty. The page builder's canvas finds sections by these wrappers
 * and items by `data-item` (see RenderContext).
 *
 * Hidden sections are left off the page for everyone, the builder's canvas
 * included: a hidden section stays in the builder's lists, not on the page.
 *
 * Draw the result inside an element with the `sf-page` class (the
 * `<x-filament-block-editor::page>` component does), because the stylesheet
 * reads its colours and fonts from there.
 */
final class PageRenderer
{
    public function __construct(private readonly SectionLayoutRenderer $layouts) {}

    /**
     * @param  array<mixed>  $sections  sections as stored; they are normalized first
     */
    public function render(array $sections, RenderContext $context): string
    {
        $html = '';

        foreach (PageContent::visible(PageContent::normalize($sections)) as $section) {
            $html .= '<div data-block-id="'.e($section['id']).'"'
                .($context->isPreview ? ' data-empty-label="'.e(__('filament-block-editor::preview.empty_section')).'"' : '')
                .'>'.$this->section($section['data'], $context).'</div>';
        }

        return $html;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section(array $data, RenderContext $context): string
    {
        $layout = SectionLayout::tryFrom((string) ($data['layout'] ?? '')) ?? SectionLayout::Plain;

        return view('filament-block-editor::section', [
            'data' => $data,
            'layout' => $layout,
            'html' => $this->layouts->render($data['document'] ?? [], $layout, $context),
        ])->render();
    }
}
