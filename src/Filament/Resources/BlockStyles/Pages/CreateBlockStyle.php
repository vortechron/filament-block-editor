<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages;

use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\BlockStyleResource;

class CreateBlockStyle extends CreateRecord
{
    protected static string $resource = BlockStyleResource::class;

    /**
     * Edited at the width a block is edited on a page, so the preview is the
     * same shape as the real thing.
     */
    protected Width|string|null $maxContentWidth = Width::Full;
}
