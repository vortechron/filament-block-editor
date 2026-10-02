<?php

namespace Vortechron\FilamentBlockEditor\Forms\Components;

use Closure;
use Filament\Actions\Action;
use Filament\Forms\Components\Field;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\ToggleButtons;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Support\Enums\SlideOverPosition;
use Filament\Support\Enums\Width;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorPlugin;
use Vortechron\FilamentBlockEditor\Support\BlockLibrary;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary;
use Vortechron\FilamentBlockEditor\Support\Tenancy;

/**
 * The library sheet: a grid of ready-made designs, saved blocks or media
 * cards. Clicking a card picks it, and (by default) runs the sheet's action
 * straight away, so one click inserts the block.
 */
class BlockLibraryPicker extends Field
{
    protected string $view = 'filament-block-editor::forms.components.block-library-picker';

    protected bool $insertOnClick = true;

    public static function sheet(Action $action): Action
    {
        return $action->slideOver()->slideOverPosition(SlideOverPosition::Start)
            ->modalWidth(Width::ExtraLarge)->modalHeading('Library')
            ->modalSubmitAction(false)->modalCancelActionLabel('Close');
    }

    /**
     * @param  array<string, string>  $tabs
     * @return array<Component>
     */
    public static function fields(string $tab = 'presets', array $tabs = ['presets' => 'Ready-made', 'saved' => 'Saved blocks', 'media' => 'Media'], bool $insertOnClick = true): array
    {
        $reset = function (Set $set): void {
            $set('library_page', 1);
            $set('selection', null);
        };

        return [
            ToggleButtons::make('library_tab')->hiddenLabel()->options($tabs)->default($tab)
                ->grouped()->live()->afterStateUpdated($reset)->dehydrated(false)
                ->visible(count($tabs) > 1),
            TextInput::make('library_search')->hiddenLabel()->placeholder('Search the library')
                ->prefixIcon('heroicon-o-magnifying-glass')->live(debounce: 350)
                ->afterStateUpdated($reset)->dehydrated(false),
            Actions::make([
                Action::make('uploadLibraryMedia')->label('Upload media')->icon('heroicon-o-arrow-up-tray')
                    ->schema([
                        FileUpload::make('files')->multiple()->required()->storeFiles(false)->maxFiles(20)
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'])
                            ->maxSize(12288)->helperText('Images or videos, up to 12 MB each.'),
                    ])
                    ->action(function (array $data, MediaLibrary $library): void {
                        foreach ($data['files'] as $file) {
                            $library->store(static::tenant(), $file);
                        }
                    }),
            ])->visible(fn (Get $get): bool => $get('library_tab') === 'media'),
            Hidden::make('library_page')->default(1)->dehydrated(false),
            static::make('selection')->hiddenLabel()->required()->insertOnClick($insertOnClick)
                ->rule(fn (): Closure => function (string $attribute, mixed $value, Closure $fail) use ($tabs): void {
                    $type = explode(':', (string) $value, 2)[0];
                    $tab = ['preset' => 'presets', 'saved' => 'saved', 'media' => 'media'][$type] ?? '';

                    if (! array_key_exists($tab, $tabs)) {
                        $fail('Choose an item from this library.');

                        return;
                    }

                    try {
                        BlockLibrary::attributes(static::tenant(), (string) $value);
                    } catch (ValidationException) {
                        $fail('This item is no longer available. Choose another one.');
                    }
                }),
        ];
    }

    /**
     * The library the signed-in person works in: the open panel tenant, or
     * null for the app's shared library.
     */
    public static function tenant(): ?Model
    {
        return Tenancy::current();
    }

    public function insertOnClick(bool $condition): static
    {
        $this->insertOnClick = $condition;

        return $this;
    }

    public function shouldInsertOnClick(): bool
    {
        return $this->insertOnClick;
    }

    public function getItems(): LengthAwarePaginator
    {
        return $this->evaluate(fn (Get $get): LengthAwarePaginator => BlockLibrary::items(
            static::tenant(), (string) ($get('library_tab') ?? 'presets'),
            (string) ($get('library_search') ?? ''), (int) ($get('library_page') ?? 1),
        ));
    }

    public function getPagePath(): string
    {
        return $this->getContainer()->getStatePath().'.library_page';
    }

    /**
     * Links to the pages that manage the library, for the foot of the sheet.
     * Only the pages this person may open are listed.
     *
     * @return array<string, string>
     */
    public function getManageLinks(): array
    {
        return FilamentBlockEditorPlugin::manageLinks();
    }
}
