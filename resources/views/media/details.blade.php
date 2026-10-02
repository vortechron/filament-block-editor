<div class="fbe-media-details">
    @if ($asset->isVideo())
        <video src="{{ $asset->url }}" controls preload="metadata" class="fbe-media-details-preview"></video>
    @elseif ($asset->isDocument())
        <a href="{{ $asset->url }}" target="_blank" rel="noopener" class="fbe-media-details-link">
            <x-filament::icon icon="heroicon-o-document-text" class="fbe-media-details-link-icon" />
            Open {{ $asset->name }}
        </a>
    @else
        <img src="{{ $asset->url }}" alt="{{ $asset->name }}" class="fbe-media-details-preview" />
    @endif
    @include('filament-block-editor::media.usages', ['usages' => $usages])
</div>
