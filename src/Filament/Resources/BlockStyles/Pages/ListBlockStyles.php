<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages;

use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\BlockStyleResource;

class ListBlockStyles extends ListRecords
{
    protected static string $resource = BlockStyleResource::class;

    /**
     * The list page is the top of its resource tree, so it shows only the
     * resource name instead of Filament's "… / List" trail.
     *
     * @return array<int, string>
     */
    public function getBreadcrumbs(): array
    {
        return [static::getResource()::getBreadcrumb()];
    }

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->label('New block style'),
        ];
    }
}
