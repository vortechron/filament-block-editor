{{--
    A page: a list of sections drawn as plain HTML. Link the stylesheet once
    with <x-filament-block-editor::styles /> in the <head>.

    <x-filament-block-editor::page :sections="$page->sections" />
    <x-filament-block-editor::page :sections="$sections" :context="new RenderContext(forBuilder: true, isPreview: true)" />

    Extra attributes (class, id, style) go on the wrapper. Colours and fonts
    are CSS custom properties on it (--sf-accent, ...), so a style="" here
    themes this page only. The photo slideshow needs a few lines of script
    for its arrows and dots; pass :script="false" to leave them out and
    include your own.
--}}
@props(['sections' => [], 'context' => null, 'script' => true])
@use('Vortechron\FilamentBlockEditor\Rendering\PageRenderer')
@use('Vortechron\FilamentBlockEditor\Rendering\RenderContext')
@php
    $context = $context instanceof RenderContext ? $context : new RenderContext;
    $sections = is_string($sections) ? json_decode($sections, true) : $sections;
    // The whole page value ({"sections": [...]}) is fine too.
    $sections = is_array($sections) ? (is_array($sections['sections'] ?? null) ? $sections['sections'] : $sections) : [];
    $html = app(PageRenderer::class)->render($sections, $context);
@endphp
<div {{ $attributes->class(['sf-page']) }} @if ($context->isPreview) data-preview @endif>{!! $html !!}</div>
@if ($script && str_contains($html, 'data-gallery-controls'))
    @include('filament-block-editor::partials.gallery-script')
@endif
