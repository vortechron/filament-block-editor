@php
    use Filament\Support\Facades\FilamentAsset;

    $statePath = $getStatePath();
@endphp

<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    {{-- The editor's stylesheet starts loading straight away; the script is
         loaded by x-load below, only on pages that show an editor. --}}
    <div
        x-data
        x-load-css="[@js(FilamentAsset::getStyleHref('blocknote', package: 'vortechron/filament-block-editor'))]"
    >
        <div
            x-load
            x-load-src="{{ FilamentAsset::getAlpineComponentSrc('block-note-editor', 'vortechron/filament-block-editor') }}"
            x-data="blockNoteEditorFormComponent({
                state: $wire.$entangle(@js($statePath)),
                uploadUrl: @js($getUploadUrl()),
                mediaUrl: @js($getMediaUrl()),
                fonts: @js($getFonts()),
                readOnly: @js($isDisabled()),
            })"
            {{ $getExtraAttributeBag()->class(['fbe-blocknote']) }}
        >
            <div x-ref="editor" wire:ignore wire:key="{{ $statePath }}-editor"></div>

            {{-- Background video preview. Sits after the editor so Livewire never
                 confuses it with the wire:ignore'd editor node when it appears. --}}
            @if ($video = $getBackgroundVideo())
                <div class="fbe-blocknote-media" aria-hidden="true" wire:key="{{ $statePath }}-media">
                    @if ($video['embed'])
                        <iframe src="{{ $video['url'] }}" title="Background video" allow="autoplay; encrypted-media" tabindex="-1"></iframe>
                    @else
                        <video src="{{ $video['url'] }}" autoplay muted loop playsinline></video>
                    @endif
                </div>
            @endif
        </div>
    </div>
</x-dynamic-component>
