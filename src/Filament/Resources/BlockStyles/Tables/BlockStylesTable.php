<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Tables;

use Filament\Actions\ActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ViewColumn;
use Filament\Tables\Table;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;

class BlockStylesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                ViewColumn::make('preview')
                    ->label('Preview')
                    ->view('filament-block-editor::block-styles.row-preview'),
                TextColumn::make('name')
                    ->weight('bold')
                    ->searchable()
                    ->sortable(),
                IconColumn::make('is_default')
                    ->label('New blocks')
                    ->boolean()
                    ->tooltip(fn (BlockStyle $record): ?string => $record->is_default
                        ? 'New blocks start with this style'
                        : null),
                TextColumn::make('followers')
                    ->label('Blocks using it')
                    ->state(fn (BlockStyle $record): int => $record->followerCount()),
                TextColumn::make('updated_at')
                    ->label('Last edited')
                    ->since()
                    ->sortable(),
            ])
            ->defaultSort('name')
            ->recordActions([
                ActionGroup::make([
                    EditAction::make(),
                    DeleteAction::make()
                        ->modalDescription('Blocks that follow this style keep the look they have now. They just stop following it.'),
                ]),
            ])
            ->emptyStateHeading('No block styles yet')
            ->emptyStateDescription('A style is a look you can reuse. Save one from any block, or create one here, then every new block can start with it.');
    }
}
