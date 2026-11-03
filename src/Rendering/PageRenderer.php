<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Styling\StyleSheet;

/**
 * Draws a page as HTML: a page value of any format (Content\PageValue), or
 * a bare list of sections (Content\PageContent).
 *
 * Each section is wrapped in `<div data-block-id="{id}">`. In a preview the
 * wrapper also carries `data-empty-label`, the words shown while the section
 * is still empty. The page builder's canvas finds sections by these wrappers
 * and items by `data-item` (see RenderContext).
 *
 * Hidden sections are left off the page for visitors and previews. The
 * builder's canvas (`forBuilder`) draws them with `data-hidden` on the
 * wrapper, so the builder can show them dimmed.
 *
 * A section with its own `style` or `advanced` settings gets the class
 * `fbe-s-{id}`, and the page one `<style data-fbe-style>` before the
 * sections with their rules (Styling\StyleSheet).
 *
 * Draw the result inside an element with the `sf-page` class (the
 * `<x-filament-block-editor::page>` component does), because the stylesheet
 * reads its colours and fonts from there.
 */
final class PageRenderer
{
    public function __construct(private readonly SectionLayoutRenderer $layouts) {}

    /**
     * @param  array<mixed>  $sections  a page value or a list of sections, as stored; it is upgraded and normalized first
     */
    public function render(array $sections, RenderContext $context): string
    {
        $sections = PageValue::normalize($sections)['sections'];

        return StyleSheet::collect(function () use ($sections, $context): string {
            $html = '';

            foreach ($context->forBuilder ? $sections : PageContent::visible($sections) as $section) {
                if ($section['type'] !== PageContent::TYPE) {
                    continue;
                }

                $html .= $this->wrapper($section, $context).$this->section($section['id'], $section['data'], $context).'</div>';
            }

            return $html;
        });
    }

    /**
     * The opening tag every section is drawn in.
     *
     * @param  array<string, mixed>  $section
     */
    private function wrapper(array $section, RenderContext $context): string
    {
        return '<div data-block-id="'.e($section['id']).'"'
            .(($section['hidden'] ?? false) === true ? ' data-hidden' : '')
            .($context->isPreview ? ' data-empty-label="'.e(__('filament-block-editor::preview.empty_section')).'"' : '')
            .'>';
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function section(string $id, array $data, RenderContext $context): string
    {
        $layout = SectionLayout::tryFrom((string) ($data['layout'] ?? '')) ?? SectionLayout::Plain;
        $look = SectionLook::apply($id, $data, $context);

        return view('filament-block-editor::section', [
            'data' => $look->data,
            'layout' => $layout,
            'html' => $this->layouts->render($data['document'] ?? [], $layout, $context),
            'classes' => $look->classes,
            'inlineBackground' => $look->inlineBackground,
        ])->render();
    }
}
