<?php

namespace Workbench\App\Filament\Resources\Pages;

use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockNoteEditor;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockSections;
use Workbench\App\Filament\Resources\Pages\Pages\CreatePage;
use Workbench\App\Filament\Resources\Pages\Pages\EditPage;
use Workbench\App\Filament\Resources\Pages\Pages\ListPages;
use Workbench\App\Models\Page;

class PageResource extends Resource
{
    protected static ?string $model = Page::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentText;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('title')->required()->maxLength(255),
            TextInput::make('slug')->required()->maxLength(255)->unique(ignoreRecord: true),
            Section::make('Summary')
                ->description('A plain BlockNoteEditor field on its own JSON column.')
                ->collapsible()
                ->columnSpanFull()
                ->schema([
                    BlockNoteEditor::make('summary')->hiddenLabel(),
                ]),
            BlockSections::make(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')->searchable(),
                TextColumn::make('slug'),
                TextColumn::make('updated_at')->since(),
            ])
            ->recordActions([
                Action::make('view')
                    ->label('Open page')
                    ->icon(Heroicon::ArrowTopRightOnSquare)
                    ->url(fn (Page $record): string => route('pages.show', $record->slug))
                    ->openUrlInNewTab(),
                EditAction::make(),
                DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPages::route('/'),
            'create' => CreatePage::route('/create'),
            'edit' => EditPage::route('/{record}/edit'),
        ];
    }
}
