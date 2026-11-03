{{-- The core map block (Blocks\CoreBlocks). Only a Google Maps embed address is drawn as a map; the address always links to a Google Maps search. --}}
@php
    $embed = is_string($values['embed_url']) && str_starts_with($values['embed_url'], 'https://www.google.com/maps') ? $values['embed_url'] : null;
    $address = trim((string) $values['address']);
@endphp
@if ($embed === null && $address === '')
    @if ($context->forBuilder)
        <figure class="bn-media-empty" data-empty-media="map"><span>{{ __('filament-block-editor::core.map.empty') }}</span></figure>
    @endif
@else
<div class="fbe-map fbe-map-{{ $values['height'] }}">
    @if ($embed !== null)
        <iframe class="fbe-map-frame" src="{{ $embed }}" title="{{ $address !== '' ? $address : __('filament-block-editor::core.map.title') }}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    @endif
    @if ($address !== '')
        <p class="fbe-map-address">
            <span>{{ $address }}</span>
            <a href="https://www.google.com/maps/search/?api=1&query={{ rawurlencode($address) }}" target="_blank" rel="noopener">{{ __('filament-block-editor::core.map.open') }}</a>
        </p>
    @endif
</div>
@endif
