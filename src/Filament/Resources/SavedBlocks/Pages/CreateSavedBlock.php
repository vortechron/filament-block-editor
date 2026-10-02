<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages;

use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\SavedBlockResource;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockLibraryPicker;
use Vortechron\FilamentBlockEditor\Support\BlockStyles;

class CreateSavedBlock extends CreateRecord
{
    protected static string $resource = SavedBlockResource::class;

    /**
     * The block is edited at the same width as in the page builder, so what
     * you see here matches what the customer sees.
     */
    protected Width|string|null $maxContentWidth = Width::Full;

    /**
     * A blank saved block starts from the default block style, the
     * same way a blank block on a page does. A block created from a
     * ready-made design keeps that design instead.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        if (filled($data['block_style_id'] ?? null)) {
            return $data;
        }

        return [
            ...$data,
            'block_style_id' => app(BlockStyles::class)->defaultFor(BlockLibraryPicker::tenant())?->getKey(),
            'style_overrides' => [],
        ];
    }
}
