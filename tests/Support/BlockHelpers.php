<?php

namespace Vortechron\FilamentBlockEditor\Tests\Support;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Symfony\Component\CssSelector\CssSelectorConverter;

/**
 * Small helpers for building BlockNote blocks and reading rendered HTML.
 */
trait BlockHelpers
{
    /**
     * @param  array<string, mixed>  $styles
     * @return array<string, mixed>
     */
    protected function text(string $text, array $styles = []): array
    {
        return ['type' => 'text', 'text' => $text, 'styles' => $styles];
    }

    /**
     * @param  array<int, mixed>  $content
     * @param  array<string, mixed>  $props
     * @param  array<int, mixed>  $children
     * @return array<string, mixed>
     */
    protected function block(string $type, array $content = [], array $props = [], array $children = []): array
    {
        return ['id' => uniqid(), 'type' => $type, 'props' => $props, 'content' => $content, 'children' => $children];
    }

    /**
     * Elements matching a CSS selector in an HTML fragment.
     *
     * @return list<DOMElement>
     */
    protected function select(string $html, string $selector): array
    {
        $document = new DOMDocument;
        libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8"?><body>'.$html.'</body>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        $xpath = new DOMXPath($document);
        $nodes = $xpath->query((new CssSelectorConverter)->toXPath($selector));

        return $nodes === false ? [] : array_values(iterator_to_array($nodes));
    }

    protected function first(string $html, string $selector): ?DOMElement
    {
        return $this->select($html, $selector)[0] ?? null;
    }

    /**
     * The text of every element matching a selector.
     *
     * @return list<string>
     */
    protected function texts(string $html, string $selector): array
    {
        return array_map(fn (DOMElement $element): string => $element->textContent, $this->select($html, $selector));
    }

    /**
     * The class attribute of every element matching a selector.
     *
     * @return list<string>
     */
    protected function classes(string $html, string $selector): array
    {
        return array_map(fn (DOMElement $element): string => $element->getAttribute('class'), $this->select($html, $selector));
    }
}
