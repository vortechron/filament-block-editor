<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\BlockStyles\Schemas;

use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Text;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Illuminate\Support\HtmlString;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockAppearanceFields;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Support\BlockPresetLibrary;

/**
 * The block style editor.
 *
 * A style has no content of its own, so instead of an editor it shows a live
 * picture of what a block following this style will look like, drawn by the
 * very same partial the customer page uses. The settings themselves are edited
 * in the shared "Style" sheet, exactly as they are on a page block.
 */
class BlockStyleForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->label('Name')
                    ->placeholder('Dark hero')
                    ->required()
                    ->maxLength(255)
                    ->columnSpanFull(),
                Toggle::make('is_default')
                    ->label('Use this style for new blocks')
                    ->helperText('Only one style can be the default. Turning this on turns it off everywhere else.')
                    ->columnSpanFull(),
                Section::make('Preview')
                    ->key('blockStyle')
                    ->description('A sample block wearing this style. Every block that follows it changes when you save.')
                    ->headerActions([static::styleAction()])
                    ->columnSpanFull()
                    ->schema([
                        Text::make(fn (Get $get): HtmlString => new HtmlString(
                            view('filament-block-editor::block-styles.preview', [
                                'block' => BlockAppearanceFields::previewBlock($get)
                                    ->forceFill(['content' => static::sampleContent()]),
                            ])->render(),
                        )),
                        ...BlockAppearanceFields::hiddenFields(withStyleLink: false),
                    ]),
            ]);
    }

    /**
     * The same "Style" sheet a page block opens, minus the style picker: a
     * style cannot follow another style.
     */
    private static function styleAction(): Action
    {
        return BlockAppearanceFields::configureSheet(Action::make('editStyle'), withStylePicker: false)
            ->modalDescription('These settings change every block that follows this style.')
            ->fillForm(fn (Get $schemaGet): array => BlockAppearanceFields::fillState(
                collect(BlockStyle::appearanceColumns())
                    ->mapWithKeys(fn (string $column): array => [$column => $schemaGet($column)])
                    ->all(),
            ))
            ->action(function (array $data, Set $schemaSet, Action $action): void {
                // writeBackState treats "no style attached" as owning every
                // setting, which is exactly what a style is. Its two link keys
                // have no field here, so they are left out.
                foreach (BlockAppearanceFields::writeBackState($data) as $column => $value) {
                    if (in_array($column, BlockStyle::appearanceColumns(), true)) {
                        $schemaSet($column, $value);
                    }
                }

                // Keep the sheet open: every change applies on its own.
                $action->halt();
            });
    }

    /**
     * Stand-in content for the preview, so padding and text colour have
     * something to act on.
     *
     * @return array<int, array<string, mixed>>
     */
    private static function sampleContent(): array
    {
        return [
            BlockPresetLibrary::heading(2, 'A heading in this style'),
            BlockPresetLibrary::paragraph(
                'And a line of body text underneath, so you can see the spacing, the width of the text column and how readable the colours are.',
            ),
        ];
    }
}
