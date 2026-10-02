<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    @php($items = $getItems())
    <div x-data="{ busy: false }" class="fbe-library-picker">
        <div @class(['fbe-library-cards', 'fbe-library-cards-media' => isset($items->first()['media'])]) wire:loading.class="fbe-is-loading">
            @forelse ($items as $item)
                <button
                    type="button"
                    class="fbe-library-card"
                    wire:key="library-{{ $getStatePath() }}-{{ $item['value'] }}"
                    aria-label="{{ $shouldInsertOnClick() ? 'Insert ' : 'Choose ' }}{{ $item['name'] }}"
                    aria-pressed="{{ $getState() === $item['value'] ? 'true' : 'false' }}"
                    :disabled="busy"
                    x-on:click="busy = true; try { await $wire.$set(@js($getStatePath()), @js($item['value'])); @if ($shouldInsertOnClick()) await $wire.callMountedAction(); @endif } finally { busy = false; }"
                >
                    @if (isset($item['block']))
                        <x-filament-block-editor::preview :block="$item['block']" />
                    @else
                        @include('filament-block-editor::media.thumbnail', ['asset' => $item['media']])
                    @endif
                    <span class="fbe-library-card-caption">
                        <strong>{{ $item['name'] }}</strong>
                        @if ($item['description'])<span>{{ $item['description'] }}</span>@endif
                    </span>
                </button>
            @empty
                <div class="fbe-library-empty">
                    <x-filament::icon icon="heroicon-o-squares-2x2" class="fbe-library-empty-icon" />
                    <p>No items found</p>
                    <span>Try another search, save a block, or upload media.</span>
                </div>
            @endforelse
        </div>
        @if ($items->hasPages())
            <div class="fbe-library-pagination">
                <x-filament::button color="gray" size="sm" :disabled="$items->onFirstPage()" wire:click="$set('{{ $getPagePath() }}', {{ max(1, $items->currentPage() - 1) }})">Previous</x-filament::button>
                <span>{{ $items->currentPage() }} / {{ $items->lastPage() }}</span>
                <x-filament::button color="gray" size="sm" :disabled="! $items->hasMorePages()" wire:click="$set('{{ $getPagePath() }}', {{ $items->currentPage() + 1 }})">Next</x-filament::button>
            </div>
        @endif
        {{-- People who may use the library here cannot always open the pages that manage it. --}}
        @if ($links = $getManageLinks())
            <div class="fbe-library-links">
                @foreach ($links as $label => $url)
                    <a href="{{ $url }}" target="_blank" rel="noopener">{{ $label }} ↗</a>
                @endforeach
            </div>
        @endif
    </div>
</x-dynamic-component>
