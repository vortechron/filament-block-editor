<?php

namespace Workbench\App\Filament\Resources\Pages\Pages;

use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;
use Workbench\App\Filament\Resources\Pages\PageResource;

class CreatePage extends CreateRecord
{
    protected static string $resource = PageResource::class;

    protected Width|string|null $maxContentWidth = Width::Full;
}
