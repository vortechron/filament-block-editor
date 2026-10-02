{{--
    Stands in for one of the page's own sections in the block list. The page
    draws the real section in this spot; there is nothing to type here.
--}}
<div class="fbe-section-block">
    <x-filament::icon :icon="$section['icon'] ?? 'heroicon-o-square-3-stack-3d'" class="fbe-section-block-icon" />
    <div>
        <p class="fbe-section-block-title">{{ $section['label'] ?? \Illuminate\Support\Str::headline((string) $kind) }}</p>
        @if (filled($section['description'] ?? null))
            <p>{{ $section['description'] }}</p>
        @endif
        <p class="fbe-section-block-hint">Move it with the arrows to change where it shows on the page.</p>
    </div>
</div>
