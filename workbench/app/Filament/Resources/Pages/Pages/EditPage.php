<?php

namespace Workbench\App\Filament\Resources\Pages\Pages;

use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;
use Workbench\App\Filament\Resources\Pages\PageResource;

class EditPage extends EditRecord
{
    protected static string $resource = PageResource::class;

    protected Width|string|null $maxContentWidth = Width::Full;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('open')
                ->label('Open page')
                ->color('gray')
                ->url(fn (): string => route('pages.show', $this->getRecord()->slug))
                ->openUrlInNewTab(),
            DeleteAction::make(),
        ];
    }
}
