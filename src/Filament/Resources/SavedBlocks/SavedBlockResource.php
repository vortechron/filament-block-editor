<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks;

use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Vortechron\FilamentBlockEditor\Filament\Resources\Concerns\ManagedByPlugin;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\CreateSavedBlock;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\EditSavedBlock;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Pages\ListSavedBlocks;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Schemas\SavedBlockForm;
use Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Tables\SavedBlocksTable;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;

class SavedBlockResource extends Resource
{
    use ManagedByPlugin;

    protected static bool $isScopedToTenant = false;

    protected static ?string $model = SavedBlock::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSquares2x2;

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    protected static ?string $navigationLabel = 'Saved Blocks';

    protected static ?string $modelLabel = 'saved block';

    protected static ?string $slug = 'saved-blocks';

    public static function form(Schema $schema): Schema
    {
        return SavedBlockForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SavedBlocksTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSavedBlocks::route('/'),
            'create' => CreateSavedBlock::route('/create'),
            'edit' => EditSavedBlock::route('/{record}/edit'),
        ];
    }
}
