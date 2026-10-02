<div class="fbe-media-thumbnail">
    @if ($asset->isVideo())
        <video src="{{ $asset->url }}#t=0.1" preload="metadata" muted playsinline aria-label="{{ $asset->name }}"></video>
        <span class="fbe-media-video-label"><x-filament::icon icon="heroicon-s-play" class="fbe-media-video-label-icon" /> Video</span>
    @elseif ($asset->isDocument())
        <span class="fbe-media-document" aria-label="{{ $asset->name }}">
            <x-filament::icon icon="heroicon-o-document-text" class="fbe-media-document-icon" />
            <span>PDF</span>
        </span>
    @else
        <img src="{{ $asset->url }}" alt="{{ $asset->name }}" loading="lazy" />
    @endif
</div>
