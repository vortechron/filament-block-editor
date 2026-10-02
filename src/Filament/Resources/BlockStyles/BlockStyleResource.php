<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles;

use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages\CreateBlockStyle;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages\EditBlockStyle;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Pages\ListBlockStyles;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Schemas\BlockStyleForm;
use Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Tables\BlockStylesTable;
use Vortechron\FilamentBlockEditor\Filament\Resources\Concerns\ManagedByPlugin;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;

class BlockStyleResource extends Resource
{
    use ManagedByPlugin;

    protected static bool $isScopedToTenant = false;

    protected static ?string $model = BlockStyle::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSwatch;

    protected static ?int $navigationSort = 2;

    protected static ?string $recordTitleAttribute = 'name';

    protected static ?string $navigationLabel = 'Block Styles';

    protected static ?string $modelLabel = 'block style';

    protected static ?string $slug = 'block-styles';

    public static function form(Schema $schema): Schema
    {
        return BlockStyleForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return BlockStylesTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListBlockStyles::route('/'),
            'create' => CreateBlockStyle::route('/create'),
            'edit' => EditBlockStyle::route('/{record}/edit'),
        ];
    }
}
