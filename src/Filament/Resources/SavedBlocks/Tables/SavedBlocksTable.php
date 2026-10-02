<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Tables;

use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Support\Enums\Width;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\Layout\Stack;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ViewColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;

class SavedBlocksTable
{
    public static function configure(Table $table): Table
    {
        return $table
            // Every row draws a preview, so the style each block follows has
            // to come along or the page costs one query per row.
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->with('blockStyle'))
            ->columns([
                Stack::make([
                    ViewColumn::make('preview')->view('filament-block-editor::saved-blocks.preview'),
                    TextColumn::make('name')
                        ->weight('bold')
                        ->searchable()
                        ->description(fn (SavedBlock $record): ?string => $record->description),
                    TextColumn::make('updated_at')
                        ->label('Last edited')
                        ->since()
                        ->sortable(),
                ])->space(3),
            ])
            ->contentGrid(['md' => 2, 'xl' => 3])
            ->paginated([12, 24, 48])
            ->defaultPaginationPageOption(12)
            ->recordUrl(null)
            ->defaultSort('name')
            ->recordActions([
                ActionGroup::make([
                    Action::make('preview')
                        ->label('Larger preview')->icon(Heroicon::MagnifyingGlassPlus)
                        ->modalHeading(fn (SavedBlock $record): string => $record->name)
                        ->modalWidth(Width::FiveExtraLarge)
                        ->modalContent(fn (SavedBlock $record) => view('filament-block-editor::saved-blocks.large-preview', ['block' => $record]))
                        ->modalSubmitAction(false)->modalCancelActionLabel('Close'),
                    Action::make('rename')->icon(Heroicon::PencilSquare)
                        ->schema([TextInput::make('name')->required()->maxLength(255)])
                        ->fillForm(fn (SavedBlock $record): array => ['name' => $record->name])
                        ->action(fn (SavedBlock $record, array $data) => $record->update($data)),
                    Action::make('duplicate')
                        ->label('Duplicate')
                        ->icon(Heroicon::DocumentDuplicate)
                        ->requiresConfirmation()
                        ->action(function (SavedBlock $record): void {
                            $copy = $record->replicate();
                            $copy->name = $record->name.' (copy)';
                            $copy->save();
                        }),
                    EditAction::make(),
                    DeleteAction::make(),
                ])->label('Block actions')->iconButton(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->extraAttributes(['class' => 'fbe-card-grid'])
            ->emptyStateHeading('No saved blocks yet')
            ->emptyStateDescription('Save a block from a page, or create one here, to reuse it on every page.');
    }
}
