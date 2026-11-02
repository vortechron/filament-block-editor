{{-- A photo slideshow people swipe through. CSS scroll snapping does the swiping; the page component's script shows the arrows and dots and keeps the dots in step. --}}
@if ($images !== [])
    <div class="sf-gallery" data-gallery role="region" aria-roledescription="carousel" aria-label="{{ __('filament-block-editor::page.gallery.label') }}">
        <div class="sf-gallery-track" data-gallery-track tabindex="0">
            @foreach ($images as $index => $url)
                <div class="sf-gallery-slide" role="group" aria-roledescription="slide" aria-label="{{ __('filament-block-editor::page.gallery.slide', ['number' => $index + 1, 'total' => count($images)]) }}">
                    <img src="{{ $url }}" alt="" @if ($index > 0) loading="lazy" @endif decoding="async">
                </div>
            @endforeach
        </div>
        @if (count($images) > 1)
            <div class="sf-gallery-controls" data-gallery-controls hidden>
                <button type="button" data-gallery-step="-1" aria-label="{{ __('filament-block-editor::page.gallery.previous') }}" class="sf-gallery-arrow">&lsaquo;</button>
                <div class="sf-gallery-dots">
                    @foreach ($images as $index => $url)
                        <button type="button" data-gallery-dot="{{ $index }}" aria-label="{{ __('filament-block-editor::page.gallery.go_to', ['number' => $index + 1]) }}" @if ($index === 0) aria-current="true" @endif class="sf-gallery-dot"></button>
                    @endforeach
                </div>
                <button type="button" data-gallery-step="1" aria-label="{{ __('filament-block-editor::page.gallery.next') }}" class="sf-gallery-arrow">&rsaquo;</button>
            </div>
        @endif
    </div>
@endif
