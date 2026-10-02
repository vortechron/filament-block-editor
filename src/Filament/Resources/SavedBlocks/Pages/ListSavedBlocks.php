<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages;

use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Pages\ListRecords;
use Filament\Support\Icons\Heroicon;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\SavedBlockResource;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockLibraryPicker;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\Support\BlockLibrary;

class ListSavedBlocks extends ListRecords
{
    protected static string $resource = SavedBlockResource::class;

    protected function getHeaderActions(): array
    {
        return [
            $this->createFromPresetAction(),
            CreateAction::make()
                ->label('New blank block')
                ->outlined(),
        ];
    }

    /**
     * Creates the record from a ready-made design first, then opens it for
     * editing. The content editor only reads its content when it first loads,
     * so the block has to exist before the edit page is opened.
     */
    private function createFromPresetAction(): Action
    {
        return BlockLibraryPicker::sheet(Action::make('createFromPreset'))
            ->label('New from a ready-made design')
            ->icon(Heroicon::Sparkles)
            ->modalHeading('Start from a ready-made design')
            ->modalSubmitAction(fn (Action $action): Action => $action->label('Create block'))
            ->schema([
                TextInput::make('name')
                    ->label('Name')
                    ->required()
                    ->maxLength(255),
                TextInput::make('description')
                    ->label('Description')
                    ->maxLength(255),
                ...BlockLibraryPicker::fields('presets', ['presets' => 'Ready-made'], insertOnClick: false),
            ])
            ->action(function (array $data) {
                $block = SavedBlock::create([
                    'name' => $data['name'],
                    'description' => $data['description'] ?? null,
                    ...BlockLibrary::attributes(BlockLibraryPicker::tenant(), $data['selection']),
                ]);

                return redirect(SavedBlockResource::getUrl('edit', ['record' => $block]));
            });
    }
}
