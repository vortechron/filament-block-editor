<?php

namespace Vortechron\FilamentBlockEditor\Filament\Pages;

use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Support\Enums\Width;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\Layout\Stack;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ViewColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;
use UnitEnum;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorPlugin;
use Vortechron\FilamentBlockEditor\Forms\Components\BlockLibraryPicker;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary as MediaLibraryService;

/**
 * Upload once, reuse anywhere: every picture, video and PDF the blocks use.
 * A file still shown by a block, a saved block or a block style cannot be
 * deleted; the delete dialog lists where it is used.
 */
class MediaLibrary extends Page implements HasTable
{
    use InteractsWithTable;

    protected string $view = 'filament-block-editor::pages.media-library';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedPhoto;

    protected static ?int $navigationSort = 3;

    protected static ?string $title = 'Media';

    protected static ?string $slug = 'media';

    /**
     * People who only pick media inside the editor do not need this page;
     * the editor's own picker goes through the media route.
     */
    public static function canAccess(): bool
    {
        return FilamentBlockEditorPlugin::canManageLibrary();
    }

    public static function getNavigationGroup(): string|UnitEnum|null
    {
        return FilamentBlockEditorPlugin::resolveNavigationGroup();
    }

    public function getSubheading(): string
    {
        return 'Upload once. Reuse images, videos and PDFs in your pages and saved blocks.';
    }

    public function getMaxWidth(): Width|string|null
    {
        return Width::Full;
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('importExisting')->label('Find existing uploads')->color('gray')
                ->icon(Heroicon::ArrowPath)
                ->action(function (MediaLibraryService $library): void {
                    $count = $library->importExisting(BlockLibraryPicker::tenant());
                    $this->resetTable();
                    Notification::make()->success()->title($count === 0 ? 'Your library is up to date' : "Added {$count} existing uploads")->send();
                }),
            Action::make('upload')->label('Upload media')->icon(Heroicon::ArrowUpTray)
                ->schema([
                    FileUpload::make('files')->label('Images, videos and PDFs')->multiple()->required()
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'application/pdf'])
                        ->maxSize(12288)->maxFiles(20)->storeFiles(false)
                        ->helperText('JPG, PNG, GIF, WebP, AVIF, MP4, WebM or PDF. Up to 12 MB per file.'),
                ])
                ->action(function (array $data, MediaLibraryService $library): void {
                    foreach ($data['files'] as $file) {
                        $library->store(BlockLibraryPicker::tenant(), $file);
                    }

                    $this->resetTable();
                    Notification::make()->success()->title('Media uploaded')->send();
                }),
        ];
    }

    public function table(Table $table): Table
    {
        return $table->query(fn (): Builder => MediaAsset::withoutGlobalScopes()->forTenant(BlockLibraryPicker::tenant()))
            ->columns([
                Stack::make([
                    ViewColumn::make('preview')->view('filament-block-editor::media.table-thumbnail'),
                    TextColumn::make('name')->weight('bold')->searchable()->sortable()->wrap(),
                    TextColumn::make('mime_type')->label('Type')->color('gray')
                        ->formatStateUsing(fn (MediaAsset $record): string => match ($record->kind()) {
                            'video' => 'Video',
                            'document' => 'PDF',
                            default => 'Image',
                        }.' · '.number_format($record->size / 1024, 0).' KB'),
                ])->space(3),
            ])
            ->contentGrid(['sm' => 2, 'lg' => 3, 'xl' => 4])
            ->paginated([12, 24, 48])->defaultPaginationPageOption(12)->defaultSort('id', 'desc')
            ->filters([
                SelectFilter::make('kind')->label('Type')->options(['image' => 'Images', 'video' => 'Videos', 'document' => 'PDFs'])
                    ->query(fn (Builder $query, array $data): Builder => match ($data['value']) {
                        'image', 'video' => $query->where('mime_type', 'like', $data['value'].'/%'),
                        'document' => $query->where('mime_type', 'application/pdf'),
                        default => $query,
                    }),
            ])
            ->recordActions([
                ActionGroup::make([
                    Action::make('view')->label('View file')->icon(Heroicon::Eye)
                        ->modalHeading(fn (MediaAsset $record): string => $record->name)
                        ->modalContent(fn (MediaAsset $record) => view('filament-block-editor::media.details', [
                            'asset' => $record, 'usages' => app(MediaLibraryService::class)->usages($record),
                        ]))->modalWidth(Width::ThreeExtraLarge)->modalSubmitAction(false)->modalCancelActionLabel('Close'),
                    Action::make('rename')->icon(Heroicon::PencilSquare)
                        ->schema([TextInput::make('name')->required()->maxLength(255)])
                        ->fillForm(fn (MediaAsset $record): array => ['name' => $record->name])
                        ->action(fn (MediaAsset $record, array $data) => $record->update($data)),
                    Action::make('delete')->color('danger')->icon(Heroicon::Trash)->requiresConfirmation()
                        ->modalDescription('Files used in pages or saved blocks cannot be deleted.')
                        ->modalContent(fn (MediaAsset $record) => view('filament-block-editor::media.usages', ['usages' => app(MediaLibraryService::class)->usages($record)]))
                        ->action(function (MediaAsset $record, MediaLibraryService $library, Action $action): void {
                            try {
                                $library->delete($record);
                            } catch (ValidationException $exception) {
                                Notification::make()->danger()->title('This file could not be deleted')->body($exception->getMessage())->send();
                                $action->halt();
                            }
                        }),
                ])->label('Media actions')->iconButton(),
            ])
            ->extraAttributes(['class' => 'fbe-card-grid'])
            ->emptyStateHeading('Your media library starts here')
            ->emptyStateDescription('Upload an image or video, or use Find existing uploads to collect files already in your content.');
    }
}
