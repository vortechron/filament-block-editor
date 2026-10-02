{{--
    One BlockNote document from a plain BlockNoteEditor field, without the
    section around it.

    <x-filament-block-editor::content :content="$post->body" />
--}}
@props(['content' => []])

@php
    $document = is_string($content) ? (json_decode($content, true) ?? []) : (array) $content;
@endphp

<div {{ $attributes->class(['fbe-rich-text']) }}>
    {!! app(\Vortechron\FilamentBlockEditor\Support\BlockNoteRenderer::class)->render($document) !!}
</div>
