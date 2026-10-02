<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages;

use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\SavedBlockResource;

class EditSavedBlock extends EditRecord
{
    protected static string $resource = SavedBlockResource::class;

    /**
     * The block is edited at the same width as in the page builder, so what
     * you see here matches what the customer sees.
     */
    protected Width|string|null $maxContentWidth = Width::Full;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
