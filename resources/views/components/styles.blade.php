{{--
    The public stylesheet for rendered pages, then the site's design kit as
    CSS variables. Put it in the page <head>.

    <x-filament-block-editor::styles />
    <x-filament-block-editor::styles :kit="$kit" />   {{-- a kit of your own --}}

    The kit comes from the bound Design\KitSource (the package defaults, or
    the host's stored kit). A host font the kit uses is linked too. The page
    still reads the --sf-* custom properties; your own CSS after this tag
    wins over both. See docs/php.md.
--}}
@props(['kit' => null])
@use('Vortechron\FilamentBlockEditor\Design\Kit')
@use('Vortechron\FilamentBlockEditor\Design\KitSource')
@php
    $kit = is_array($kit) ? Kit::normalize($kit) : app(KitSource::class)->current();
    $fonts = Kit::fonts();
    $links = array_values(array_unique(array_filter(array_map(
        fn (string $font): ?string => $fonts[$font]['href'] ?? null,
        [$kit['fonts']['heading'], $kit['fonts']['body']],
    ))));
@endphp
<link rel="stylesheet" href="{{ \Vortechron\FilamentBlockEditor\Support\Stylesheet::href() }}">
@foreach ($links as $href)
    <link rel="stylesheet" href="{{ $href }}">
@endforeach
<style data-fbe-kit>{!! Kit::css($kit) !!}</style>
