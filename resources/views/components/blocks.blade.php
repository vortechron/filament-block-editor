{{--
    Every section of a page, in order.

    <x-filament-block-editor::blocks :blocks="$page->contentBlocks" :page="$page" />

    A block placed for one of the page's own sections (see PageSections) draws
    that section's view with $block and $page. $transform is passed on to each
    content block (see block.blade.php).
--}}
@props(['blocks', 'page' => null, 'transform' => null])

@php
    $blocks = $blocks instanceof \Illuminate\Database\Eloquent\Collection
        ? $blocks->loadMissing('blockStyle')
        : collect($blocks);
@endphp

@foreach ($blocks as $block)
    @if ($block->isSection())
        @if ($section = \Vortechron\FilamentBlockEditor\PageSections::get($block->kind))
            @include($section['view'], ['block' => $block, 'page' => $page])
        @endif
    @else
        <x-filament-block-editor::block :block="$block" :transform="$transform" />
    @endif
@endforeach
