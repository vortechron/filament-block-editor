<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages;

use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\BlockStyleResource;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;

class EditBlockStyle extends EditRecord
{
    protected static string $resource = BlockStyleResource::class;

    /**
     * Edited at the width a block is edited on a page, so the preview is the
     * same shape as the real thing.
     */
    protected Width|string|null $maxContentWidth = Width::Full;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make()
                ->modalDescription('Blocks that follow this style keep the look they have now. They just stop following it.'),
        ];
    }

    /**
     * Saving a style changes every block still following it, so the person
     * making the change is told how many that is.
     */
    protected function getSavedNotificationTitle(): ?string
    {
        $record = $this->getRecord();

        if (! $record instanceof BlockStyle) {
            return null;
        }

        $followers = $record->followerCount();

        return $followers === 0
            ? 'Style saved'
            : 'Style saved. '.$followers.' '.($followers === 1 ? 'block' : 'blocks').' updated.';
    }
}
