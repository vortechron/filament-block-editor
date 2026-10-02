<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\SavedBlocks\Schemas;

use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Filament\Support\Enums\Width;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockAppearanceFields;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockNoteEditor;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;

/**
 * The saved block editor, laid out like one block inside the page builder:
 * the content sits on a card that already wears its background, padding,
 * width and height, and the appearance inputs stay in the "Style" sheet.
 *
 * Nothing about the look is edited below the content, because that is not how
 * a block is edited on a page.
 */
class SavedBlockForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Grid::make(2)
                    ->schema([
                        TextInput::make('name')
                            ->hiddenLabel()
                            ->placeholder('Name this block')
                            ->required()
                            ->maxLength(255),
                        TextInput::make('description')
                            ->hiddenLabel()
                            ->placeholder('What this block is for')
                            ->maxLength(255),
                    ])
                    ->columnSpanFull(),
                Section::make('Saved block')
                    ->key('savedBlock')
                    ->headerActions([static::styleAction()])
                    ->columnSpanFull()
                    ->schema([
                        BlockNoteEditor::make('content')
                            ->hiddenLabel()
                            ->extraAttributes(
                                fn (Get $get): array => BlockAppearanceFields::editorAttributes($get),
                                merge: true,
                            )
                            ->backgroundVideo(fn (Get $get): ?array => BlockAppearanceFields::editorVideo($get)),
                        ...BlockAppearanceFields::hiddenFields(),
                    ]),
            ]);
    }

    /**
     * The same "Style" sheet the page builder opens from a block's header. It
     * reads the hidden appearance fields, and writes the chosen values back
     * into them so the editor repaints straight away.
     */
    private static function styleAction(): Action
    {
        return BlockAppearanceFields::configureSheet(Action::make('editStyle'))
            ->fillForm(fn (Get $schemaGet): array => BlockAppearanceFields::fillState(
                collect([...array_keys(SavedBlock::appearanceDefaults()), ...SavedBlock::STYLE_COLUMNS])
                    ->mapWithKeys(fn (string $column): array => [$column => $schemaGet($column)])
                    ->all(),
            ))
            ->action(function (array $data, Set $schemaSet, Action $action): void {
                foreach (BlockAppearanceFields::writeBackState($data) as $column => $value) {
                    $schemaSet($column, $value);
                }

                // Keep the sheet open: every change applies on its own.
                $action->halt();
            });
    }
}
