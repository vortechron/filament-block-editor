{{--
    The public stylesheet for rendered blocks, plus one font stylesheet that
    holds only the web fonts these blocks use. Put it in the page <head>.

    <x-filament-block-editor::styles :blocks="$page->contentBlocks" />
    <x-filament-block-editor::styles :content="$post->body" />
--}}
@props(['blocks' => [], 'content' => null])

@php
    use Vortechron\FilamentBlockEditor\Enums\BlockFont;
    use Vortechron\FilamentBlockEditor\Support\BlockNoteRenderer;

    $documents = collect($blocks)
        ->map(fn ($block): array => is_array($block->content ?? null) ? $block->content : [])
        ->push(is_string($content) ? (json_decode($content, true) ?? []) : (array) ($content ?? []))
        ->all();

    $fontsUrl = BlockFont::stylesheetUrl(BlockNoteRenderer::fontsUsedIn($documents));
    $fontsHost = $fontsUrl === null ? null : parse_url($fontsUrl, PHP_URL_SCHEME).'://'.parse_url($fontsUrl, PHP_URL_HOST);
@endphp

<link rel="stylesheet" href="{{ \Filament\Support\Facades\FilamentAsset::getStyleHref('block-editor-page', package: 'vortechron/filament-block-editor') }}">
@if ($fontsUrl)
    <link rel="preconnect" href="{{ $fontsHost }}">
    <link rel="stylesheet" href="{{ $fontsUrl }}">
@endif
