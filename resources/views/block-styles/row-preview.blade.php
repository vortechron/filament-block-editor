@php
    $style = $getRecord();
    $block = $style->toPreviewBlock([
        \Vortechron\FilamentBlockEditor\Support\BlockPresetLibrary::heading(2, $style->name),
        \Vortechron\FilamentBlockEditor\Support\BlockPresetLibrary::paragraph('A line of body text in this style.'),
    ]);
@endphp

<x-filament-block-editor::preview :block="$block" class="fbe-block-style-preview" />
