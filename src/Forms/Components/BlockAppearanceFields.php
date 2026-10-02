<?php

namespace Vortechron\FilamentBlockEditor\Forms\Components;

use Filament\Actions\Action;
use Filament\Forms\Components\Field;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Slider;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\ToggleButtons;
use Filament\Notifications\Notification;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Text;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Support\Enums\Width;
use Filament\Support\Icons\Heroicon;
use Livewire\Component as LivewireComponent;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Vortechron\FilamentBlockEditor\Enums\BlockBackgroundPosition;
use Vortechron\FilamentBlockEditor\Enums\BlockBackgroundType;
use Vortechron\FilamentBlockEditor\Enums\BlockContentWidth;
use Vortechron\FilamentBlockEditor\Enums\BlockSpacing;
use Vortechron\FilamentBlockEditor\Enums\BlockTintStyle;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Support\BlockColor;
use Vortechron\FilamentBlockEditor\Support\BlockStyles;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary;

/**
 * The look of a content block: background, layout and spacing.
 *
 * Shared by the per-block "Style" sheet in BlockSections, SavedBlockForm and
 * BlockStyleForm, so every screen stays identical. Everything is one column per row: the labels are
 * sentences, and a three-across grid squeezed them into two or three lines.
 *
 * The visible inputs only ever live inside that sheet. The editing screens
 * themselves carry hiddenFields() and paint the values around the editor with
 * editorAttributes(), so the block in the form looks like the finished section.
 *
 * There is no Apply button. Every input is live and, once changed, runs the
 * sheet's action through Livewire::callMountedAction(); the action writes the
 * values back and halts, which keeps the sheet open (see configureSheet()).
 */
class BlockAppearanceFields
{
    /**
     * Ready-made background colours: navy, black, white, slate, light grey.
     *
     * @var array<int, string>
     */
    public const BACKGROUND_PRESETS = ['#1e1b4b', '#000000', '#ffffff', '#1e293b', '#f1f5f9'];

    /**
     * Ready-made tint colours: slate, black, navy, indigo, teal, white.
     *
     * @var array<int, string>
     */
    public const TINT_PRESETS = ['#0f172a', '#000000', '#1e1b4b', '#4338ca', '#0f766e', '#ffffff'];

    private static function chooseMediaAction(string $name): Action
    {
        return BlockLibraryPicker::sheet(Action::make($name))
            ->label('Choose from media')->icon(Heroicon::Photo)
            ->schema(BlockLibraryPicker::fields('media', ['media' => 'Media']))
            ->action(function (array $data, Get $schemaGet, Set $schemaSet, LivewireComponent $livewire): void {
                $id = explode(':', $data['selection'], 2)[1];
                $asset = MediaAsset::withoutGlobalScopes()->forTenant(BlockLibraryPicker::tenant())->visual()->findOrFail($id);
                $schemaSet('background_type', $asset->isVideo() ? 'video' : 'image');
                $schemaSet('background_image_path', $asset->isVideo() ? [] : [$asset->path]);
                $schemaSet('background_video_url', $asset->isVideo() ? $asset->url : null);

                // Set() does not fire afterStateUpdated, so the three fields
                // above have to be recorded as taken over by hand. Without
                // this a picked image would count as inherited and the style's
                // own background would paint straight back over it.
                foreach (['background_type', 'background_image_path', 'background_video_url'] as $column) {
                    static::markOverridden($schemaGet, $schemaSet, $column);
                }
                // callMountedAction() re-runs the Style sheet's own action, and
                // forceRender() makes Filament redraw the page behind it, so the
                // picked media shows in the editor straight away.
                $livewire->js('$wire.callMountedAction().then(() => $wire.forceRender())');
            });
    }

    /**
     * @return array<int, Component>
     */
    public static function sections(bool $withStylePicker = true): array
    {
        return [
            // A style cannot follow another style, so the style editor asks
            // for the picker to be left out.
            ...($withStylePicker ? [static::styleSection()] : []),
            static::backgroundSection(),
            static::layoutSection(),
            static::spacingSection(),
        ];
    }

    /**
     * One Hidden input per appearance column, for the form that owns the
     * block. The "Style" sheet writes back into these, and they are what gets
     * saved.
     *
     * ContentBlock and SavedBlock share HasBlockAppearance, so their defaults
     * are the same list.
     *
     * @return array<int, Hidden>
     */
    public static function hiddenFields(bool $withStyleLink = true): array
    {
        $fields = collect(ContentBlock::appearanceDefaults())
            ->map(fn (mixed $default, string $column): Hidden => Hidden::make($column)->default($default))
            ->values()
            ->all();

        if (! $withStyleLink) {
            return $fields;
        }

        // Every key the sheet writes back needs a field here, or Filament
        // drops it silently when the form is saved.
        return [
            ...$fields,
            Hidden::make('block_style_id')->default(null),
            Hidden::make('style_overrides')->default([]),
        ];
    }

    /**
     * What the "Style" sheet opens with: the block's saved appearance on top
     * of the defaults, with the background type worked out for blocks that
     * were made before the type existed.
     *
     * @param  array<string, mixed>  $state
     * @return array<string, mixed>
     */
    public static function fillState(array $state): array
    {
        $overrides = $state['style_overrides'] ?? [];

        $block = new ContentBlock([
            ...collect(ContentBlock::appearanceDefaults())
                ->map(fn (mixed $default, string $column): mixed => $state[$column] ?? null)
                ->all(),
            'block_style_id' => $state['block_style_id'] ?? null,
            'style_overrides' => is_array($overrides) ? $overrides : [],
        ]);

        $filled = [
            ...$block->effectiveAppearance(),
            'block_style_id' => $block->block_style_id,
            'style_overrides' => $block->styleOverrides(),
        ];

        $filled['background_type'] = BlockBackgroundType::resolve(
            $filled['background_type'],
            $filled['background_image_path'],
            $filled['background_video_url'],
        )->value;

        return $filled;
    }

    /**
     * Turn what the sheet is showing into what should be written onto the
     * block. Both editors go through this, so they cannot drift apart.
     *
     * A block with no style owns every setting; that is why a block made
     * before styles existed keeps saving exactly what it always did. A block
     * that follows a style keeps only the settings it has taken over and
     * leaves the rest empty, so the row says plainly what it owns.
     *
     * @param  array<string, mixed>  $data  the sheet's own values
     * @return array<string, mixed>
     */
    public static function writeBackState(array $data): array
    {
        $styleId = $data['block_style_id'] ?? null;
        $overrides = $styleId === null
            ? ContentBlock::APPEARANCE_COLUMNS
            : static::knownOverrides($data['style_overrides'] ?? []);

        $written = [
            'block_style_id' => $styleId,
            'style_overrides' => $styleId === null ? [] : $overrides,
        ];

        foreach (ContentBlock::APPEARANCE_COLUMNS as $column) {
            if (! in_array($column, $overrides, true)) {
                // Follows the style now, so the block's own column is emptied
                // and the row says plainly what it still owns.
                $written[$column] = null;

                continue;
            }

            // Filament leaves hidden inputs out of $data, so a missing key
            // means "the sheet never showed it", not "the user emptied it".
            // Writing null here would wipe the tint settings every time
            // somebody picked a flat colour.
            if (array_key_exists($column, $data)) {
                $written[$column] = $data[$column];
            }
        }

        return $written;
    }

    /**
     * @return array<int, string>
     */
    private static function knownOverrides(mixed $overrides): array
    {
        return is_array($overrides)
            ? array_values(array_intersect($overrides, ContentBlock::APPEARANCE_COLUMNS))
            : [];
    }

    /**
     * The shared shape of the "Style" sheet: a slide-over with no submit
     * button, because every change is applied as it happens. The caller adds
     * fillForm() and an action() that writes the values back and then calls
     * $action->halt(), so the sheet stays open.
     */
    public static function configureSheet(Action $action, bool $withStylePicker = true): Action
    {
        return $action
            ->label('Style')
            ->icon(Heroicon::PaintBrush)
            ->slideOver()
            ->modalWidth(Width::TwoExtraLarge)
            ->modalHeading('Block style')
            ->modalDescription('These settings change this one block. Each change shows in the editor straight away.')
            ->modalSubmitAction(false)
            ->modalCancelActionLabel('Done')
            ->schema(static::sections($withStylePicker));
    }

    /**
     * A throwaway ContentBlock built from the editing form's hidden fields, used
     * only to work out what the block looks like.
     *
     * The point is that the editor preview and the public page now ask the
     * same object the same questions, so they cannot disagree about which
     * settings come from the style the block follows. Only the CSS each one
     * writes stays separate.
     *
     * Never saved. The style is resolved through the BlockStyles service, so
     * a form full of blocks sharing one style costs one query.
     */
    public static function previewBlock(Get $get): ContentBlock
    {
        $own = collect(ContentBlock::appearanceDefaults())
            ->map(fn (mixed $default, string $column): mixed => $get($column))
            ->all();

        $overrides = $get('style_overrides');

        return new ContentBlock([
            ...$own,
            'block_style_id' => $get('block_style_id'),
            'style_overrides' => is_array($overrides) ? $overrides : [],
        ]);
    }

    /**
     * The video to play behind the editor, matching the public page.
     *
     * @return array{embed: bool, url: string}|null
     */
    public static function editorVideo(Get $get): ?array
    {
        $block = static::previewBlock($get);
        $url = $block->backgroundVideoUrl();

        if ($block->backgroundType() !== BlockBackgroundType::Video || blank($url)) {
            return null;
        }

        $embed = $block->backgroundVideoEmbedUrl();

        return ['embed' => $embed !== null, 'url' => $embed ?? $url];
    }

    /**
     * Live background, padding, width and height preview around the editor,
     * so the block in the form looks like the section on the public page.
     *
     * The picture and tint are drawn by ::before / ::after rules in
     * resources/css/editor.css, fed by the CSS variables set
     * here. The video itself comes from editorVideo() through
     * BlockNoteEditor::backgroundVideo(); a dark surface sits under it.
     *
     * @return array<string, string>
     */
    public static function editorAttributes(Get $get): array
    {
        $block = static::previewBlock($get);

        $width = $block->contentWidth();
        $padding = $block->paddingSize()->css();

        // --fbe-block-pad lets a stretched item cancel this padding, the
        // same way it does on the public page.
        $style = 'padding: '.$padding.'; --fbe-block-pad: '.$padding.';';
        $style .= ' --fbe-block-width: '.($width === BlockContentWidth::Full ? '100%' : $width->css()).';';

        if ($block->isFullHeight()) {
            $style .= ' min-height: 70vh;';
        }

        $type = $block->backgroundType();
        $classes = [];

        if ($type === BlockBackgroundType::Color) {
            $color = $block->backgroundColor();

            if ($color === null) {
                return ['style' => $style];
            }

            $classes[] = 'fbe-blocknote-has-bg';
            $style .= " background-color: {$color};";

            if (BlockColor::isDark($color)) {
                $classes[] = 'fbe-blocknote-light-text';
            }

            return ['class' => implode(' ', $classes), 'style' => $style];
        }

        if (! $block->hasBackgroundMedia()) {
            return ['style' => $style];
        }

        $classes[] = 'fbe-blocknote-has-bg';
        $classes[] = 'fbe-blocknote-has-media';
        $classes[] = $block->hasBackgroundCard() ? 'fbe-blocknote-card' : 'fbe-blocknote-light-text';

        $tint = $block->backgroundTintColor();
        $opacity = $block->backgroundTintOpacity() / 100;
        $blur = $block->backgroundBlur();

        $style .= " --fbe-bg-tint: {$tint}; --fbe-bg-tint-opacity: {$opacity};";
        $style .= ' --fbe-bg-tint-blend: '.$block->backgroundTintStyle()->css().';';
        $style .= ' --fbe-bg-position: '.$block->backgroundPosition()->css().';';
        $style .= " --fbe-bg-blur: {$blur}px;";

        if ($type === BlockBackgroundType::Image) {
            $style .= " --fbe-bg-image: url('".$block->background_image_url."');";
        } else {
            // No video plays in the editor: a dark surface stands in for it.
            $style .= ' background-color: #1e293b;';
        }

        return ['class' => implode(' ', $classes), 'style' => $style];
    }

    /**
     * The style this block follows, and the three things you can do about it.
     *
     * Sits at the top of the sheet because it decides what every setting below
     * means: with a style attached, an untouched setting follows the style.
     */
    private static function styleSection(): Section
    {
        return Section::make('Style preset')
            ->description('Follow a saved style. Change any setting below and only that one stops following it.')
            ->icon(Heroicon::Swatch)
            ->columnSpanFull()
            ->schema([
                Select::make('block_style_id')
                    ->label('Style')
                    ->placeholder('Custom (no style)')
                    ->options(fn (): array => app(BlockStyles::class)->optionsFor(BlockLibraryPicker::tenant()))
                    ->native(false)
                    ->live()
                    // Runs before LiveSheet's own hook, because
                    // afterStateUpdated appends rather than replaces.
                    ->afterStateUpdated(fn (Get $get, Set $set) => static::applyStyleChoice($get, $set))
                    ->afterStateUpdated(fn (LivewireComponent $livewire) => LiveSheet::applyNow($livewire))
                    ->columnSpanFull(),
                Text::make(fn (Get $get): string => static::styleSummary($get)),
                Actions::make([
                    static::saveAsStyleAction(),
                    static::updateStyleAction(),
                    static::resetAllToStyleAction(),
                ])->columnSpanFull(),
                Hidden::make('style_overrides')->default([]),
            ]);
    }

    /**
     * One plain sentence about where this block stands.
     */
    private static function styleSummary(Get $get): string
    {
        $style = app(BlockStyles::class)->find(static::styleId($get));

        if ($style === null) {
            return 'This block has its own look. Save it as a style to reuse it on other blocks.';
        }

        $changed = count(static::overridesOf($get));

        if ($changed === 0) {
            return 'Following "'.$style->name.'". Editing that style changes this block too.';
        }

        return 'Following "'.$style->name.'", with '
            .$changed.' '.($changed === 1 ? 'setting' : 'settings')
            .' changed on this block only.';
    }

    private static function saveAsStyleAction(): Action
    {
        return Action::make('saveAsStyle')
            ->label('Save as style')
            ->icon(Heroicon::BookmarkSquare)
            ->outlined()
            ->modalHeading('Save this look as a style')
            ->modalDescription('You can then start any new block from it, and change every block that follows it at once.')
            ->modalSubmitActionLabel('Save style')
            ->schema([
                TextInput::make('name')
                    ->label('Name')
                    ->placeholder('Dark hero')
                    ->required()
                    ->maxLength(255),
                Toggle::make('is_default')
                    ->label('Use this style for new blocks')
                    ->inline(false),
            ])
            ->action(function (array $data, Get $get, Set $set, LivewireComponent $livewire): void {
                $style = BlockStyle::create([
                    'name' => $data['name'],
                    'is_default' => (bool) ($data['is_default'] ?? false),
                    ...static::sheetAppearance($get),
                ]);

                $set('block_style_id', $style->getKey());
                $set('style_overrides', []);

                Notification::make()->title('Style saved')->success()->send();

                $livewire->js('$wire.callMountedAction().then(() => $wire.forceRender())');
            });
    }

    private static function updateStyleAction(): Action
    {
        return Action::make('updateStyle')
            ->label('Update the style')
            ->icon(Heroicon::ArrowPath)
            ->outlined()
            ->visible(fn (Get $get): bool => static::styleId($get) !== null)
            ->requiresConfirmation()
            ->modalHeading('Update the style with this look')
            ->modalDescription(fn (Get $get): string => static::updateWarning($get))
            ->modalSubmitActionLabel('Update the style')
            ->action(function (Get $get, Set $set, LivewireComponent $livewire): void {
                $style = app(BlockStyles::class)->find(static::styleId($get));

                if ($style === null) {
                    return;
                }

                $style->update(static::sheetAppearance($get));

                // The rest of this request must see the new values, or the
                // editor behind the sheet repaints with the old ones.
                app(BlockStyles::class)->forget($style->getKey());

                $set('style_overrides', []);

                Notification::make()->title('Style updated')->success()->send();

                $livewire->js('$wire.callMountedAction().then(() => $wire.forceRender())');
            });
    }

    private static function updateWarning(Get $get): string
    {
        $style = app(BlockStyles::class)->find(static::styleId($get));
        $followers = $style?->followerCount() ?? 0;

        return $followers <= 1
            ? 'No other block follows this style yet.'
            : 'This changes all '.$followers.' blocks that follow this style, on every page.';
    }

    private static function resetAllToStyleAction(): Action
    {
        return Action::make('resetAllToStyle')
            ->label('Undo my changes')
            ->icon(Heroicon::ArrowUturnLeft)
            ->color('gray')
            ->link()
            ->visible(fn (Get $get): bool => static::styleId($get) !== null && static::overridesOf($get) !== [])
            ->requiresConfirmation()
            ->modalHeading('Follow the style again')
            ->modalDescription('Every setting on this block goes back to what the style says.')
            ->modalSubmitActionLabel('Follow the style')
            ->action(function (Get $get, Set $set, LivewireComponent $livewire): void {
                static::applyStyleChoice($get, $set);

                $livewire->js('$wire.callMountedAction().then(() => $wire.forceRender())');
            });
    }

    /**
     * Fill the sheet from the style it now follows, and forget every change
     * made on this block. Detaching leaves the values already on screen, so
     * the block keeps the look it had.
     */
    private static function applyStyleChoice(Get $get, Set $set): void
    {
        $set('style_overrides', []);

        $style = app(BlockStyles::class)->find(static::styleId($get));

        if ($style === null) {
            return;
        }

        foreach (ContentBlock::APPEARANCE_COLUMNS as $column) {
            $set($column, static::sheetValue($column, $style->getAttribute($column)));
        }

        $set('background_type', BlockBackgroundType::resolve(
            $style->background_type,
            $style->background_image_path,
            $style->background_video_url,
        )->value);
    }

    /**
     * The 15 settings as the sheet currently shows them, ready to be written
     * onto a style.
     *
     * @return array<string, mixed>
     */
    private static function sheetAppearance(Get $get): array
    {
        return collect(ContentBlock::APPEARANCE_COLUMNS)
            ->mapWithKeys(fn (string $column): array => [$column => static::styleValue($column, $get($column))])
            ->all();
    }

    /**
     * The background image input is a FileUpload, whose state is a list of
     * paths while a style stores one string. These two helpers translate
     * between the two shapes; every other setting passes straight through.
     */
    private static function sheetValue(string $column, mixed $value): mixed
    {
        if ($column !== 'background_image_path') {
            return $value;
        }

        return blank($value) ? [] : [$value];
    }

    private static function styleValue(string $column, mixed $value): mixed
    {
        if ($column !== 'background_image_path' || ! is_array($value)) {
            return $value;
        }

        return collect($value)->filter()->first();
    }

    private static function styleId(Get $get): ?int
    {
        $id = $get('block_style_id');

        return blank($id) ? null : (int) $id;
    }

    /**
     * @return array<int, string>
     */
    private static function overridesOf(Get $get): array
    {
        return static::knownOverrides($get('style_overrides'));
    }

    private static function isOverridden(Get $get, string $column): bool
    {
        return static::styleId($get) !== null
            && in_array($column, static::overridesOf($get), true);
    }

    /**
     * Note on the label, plus a "Reset to style" link under the input, on
     * every setting that has stopped following the style. Both stay hidden
     * while the setting still follows, so the sheet is no busier than before.
     *
     * The marker hook is added before LiveSheet::applyLive() runs, and
     * afterStateUpdated appends, so it always runs before the write-back.
     *
     * @param  array<int, Component>  $fields
     * @return array<int, Component>
     */
    private static function tracked(array $fields): array
    {
        foreach ($fields as $field) {
            if (! $field instanceof Field) {
                continue;
            }

            $column = $field->getName();

            $field
                ->afterStateUpdated(fn (Get $get, Set $set) => static::markOverridden($get, $set, $column))
                ->hint(fn (Get $get): ?string => static::isOverridden($get, $column) ? 'Changed here' : null)
                ->hintColor('warning')
                ->belowContent(static::resetFieldAction($column));
        }

        return $fields;
    }

    /**
     * Record that this block has taken one setting over from its style.
     * Doing nothing when no style is attached is what keeps a plain block
     * behaving exactly as it always has.
     */
    private static function markOverridden(Get $get, Set $set, string $column): void
    {
        if (static::styleId($get) === null) {
            return;
        }

        $overrides = static::overridesOf($get);

        if (in_array($column, $overrides, true)) {
            return;
        }

        $set('style_overrides', [...$overrides, $column]);
    }

    private static function resetFieldAction(string $column): Action
    {
        return Action::make('resetStyleField_'.$column)
            ->label('Reset to style')
            ->icon(Heroicon::ArrowUturnLeft)
            ->link()
            ->color('gray')
            ->visible(fn (Get $get): bool => static::isOverridden($get, $column))
            ->action(function (Get $get, Set $set, LivewireComponent $livewire) use ($column): void {
                $style = app(BlockStyles::class)->find(static::styleId($get));

                if ($style === null) {
                    return;
                }

                $set($column, static::sheetValue($column, $style->getAttribute($column)));
                $set('style_overrides', array_values(array_diff(static::overridesOf($get), [$column])));

                // This is itself the mounted action, so the write-back has to
                // be deferred rather than called straight away.
                $livewire->js('$wire.callMountedAction().then(() => $wire.forceRender())');
            });
    }

    private static function backgroundSection(): Section
    {
        return Section::make('Background')
            ->description('A flat colour, a picture or a looping video behind this block.')
            ->icon(Heroicon::Photo)
            ->columnSpanFull()
            ->schema(LiveSheet::applyLive(static::tracked([
                ToggleButtons::make('background_type')
                    ->label('Background type')
                    ->options(BlockBackgroundType::class)
                    ->grouped()
                    ->default(BlockBackgroundType::Color->value)
                    ->required()
                    ->live()
                    ->columnSpanFull(),
                ColorSwatches::make('background_color')
                    ->label('Colour')
                    ->helperText('Pick a preset, use the colour well, or type a hex code. Leave it empty for no background.')
                    ->presets(self::BACKGROUND_PRESETS)
                    ->allowNone()
                    ->visible(fn (Get $get): bool => static::backgroundType($get) === BlockBackgroundType::Color)
                    ->columnSpanFull(),
                FileUpload::make('background_image_path')
                    ->label('Background image')
                    ->hintAction(static::chooseMediaAction('chooseBackgroundImage'))
                    ->helperText('JPG, PNG or WebP, up to 10 MB. Wide landscape photos work best.')
                    ->image()
                    ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
                    ->imagePreviewHeight('180')
                    ->panelLayout('integrated')
                    ->loadingIndicatorPosition('center')
                    ->removeUploadedFileButtonPosition('center')
                    ->uploadProgressIndicatorPosition('center')
                    ->disk(MediaLibrary::disk())
                    ->directory(config('filament-block-editor.directory', 'block-editor'))
                    ->saveUploadedFileUsing(fn (TemporaryUploadedFile $file): string => app(MediaLibrary::class)->store(BlockLibraryPicker::tenant(), $file)->path)
                    ->visibility('public')
                    ->maxSize(10240)
                    ->live()
                    ->visible(fn (Get $get): bool => static::backgroundType($get) === BlockBackgroundType::Image)
                    ->columnSpanFull(),
                TextInput::make('background_video_url')
                    ->label('Background video URL')
                    ->hintAction(static::chooseMediaAction('chooseBackgroundVideo'))
                    ->helperText('Paste a YouTube or Vimeo link, or a direct link to an .mp4 or .webm file. It plays behind the block, muted and on repeat.')
                    ->placeholder('https://www.youtube.com/watch?v=...')
                    ->prefixIcon(Heroicon::Film)
                    ->url()
                    ->live(onBlur: true)
                    ->visible(fn (Get $get): bool => static::backgroundType($get) === BlockBackgroundType::Video)
                    ->columnSpanFull(),
                ColorSwatches::make('background_tint_color')
                    ->label('Background tint')
                    ->helperText('A colour laid over the picture so the text stays readable.')
                    ->presets(self::TINT_PRESETS)
                    ->default(ContentBlock::DEFAULT_TINT_COLOR)
                    ->required()
                    ->visible(fn (Get $get): bool => static::backgroundType($get)->hasMedia())
                    ->columnSpanFull(),
                Select::make('background_position')
                    ->label('Position')
                    ->helperText('Which part of the picture or video stays in view when the block is a different shape.')
                    ->options(BlockBackgroundPosition::class)
                    ->native(false)
                    ->selectablePlaceholder(false)
                    ->default(BlockBackgroundPosition::Center->value)
                    ->visible(fn (Get $get): bool => static::backgroundType($get)->hasMedia())
                    ->columnSpanFull(),
                ToggleButtons::make('background_tint_style')
                    ->label('Tint style')
                    ->helperText('Normal lays the colour flat on top. Blend soaks it into the picture.')
                    ->options(BlockTintStyle::class)
                    ->grouped()
                    ->default(BlockTintStyle::Normal->value)
                    ->visible(fn (Get $get): bool => static::backgroundType($get)->hasMedia())
                    ->columnSpanFull(),
                Slider::make('background_overlay')
                    ->label('Tint opacity')
                    ->range(0, 100)
                    ->step(5)
                    ->default(45)
                    ->visible(fn (Get $get): bool => static::backgroundType($get)->hasMedia())
                    ->columnSpanFull(),
                Slider::make('background_blur')
                    ->label('Background blur')
                    ->range(0, ContentBlock::MAX_BLUR)
                    ->step(1)
                    ->default(0)
                    ->visible(fn (Get $get): bool => static::backgroundType($get)->hasMedia())
                    ->columnSpanFull(),
                Toggle::make('background_card')
                    ->label('Background card')
                    ->helperText('Put the text on a white card on top of the picture.')
                    ->inline(false)
                    ->visible(fn (Get $get): bool => static::backgroundType($get)->hasMedia())
                    ->columnSpanFull(),
            ])));
    }

    private static function layoutSection(): Section
    {
        return Section::make('Layout')
            ->description('How wide and how tall this block is on the page.')
            ->icon(Heroicon::ViewColumns)
            ->columnSpanFull()
            ->schema(LiveSheet::applyLive(static::tracked([
                Select::make('content_width')
                    ->label('Content width')
                    ->helperText('The block always spans the whole page. This only limits the column of text inside it.')
                    ->options(BlockContentWidth::class)
                    ->native(false)
                    ->selectablePlaceholder(false)
                    ->default('normal')
                    ->required()
                    ->columnSpanFull(),
                Toggle::make('full_height')
                    ->label('Fill the whole screen')
                    ->helperText('The block is at least as tall as the reader\'s browser window. Good for a cover or hero block.')
                    ->inline(false)
                    ->columnSpanFull(),
            ])));
    }

    private static function spacingSection(): Section
    {
        return Section::make('Spacing')
            ->description('Breathing room inside the block, and the gaps to the blocks around it.')
            ->icon(Heroicon::ArrowsUpDown)
            ->columnSpanFull()
            ->schema(LiveSheet::applyLive(static::tracked([
                static::spacingButtons('padding_size', 'Padding (inside)')
                    ->helperText('The gap between the edge of the block and the text inside it.')
                    ->live(),
                static::spacingButtons('spacing_top', 'Space above'),
                static::spacingButtons('spacing_bottom', 'Space below'),
            ])));
    }

    private static function spacingButtons(string $name, string $label): ToggleButtons
    {
        return ToggleButtons::make($name)
            ->label($label)
            ->options(BlockSpacing::class)
            ->grouped()
            ->default('md')
            ->required()
            ->columnSpanFull();
    }

    /**
     * The chosen background type from the sheet's own state.
     *
     * Stays raw on purpose: this drives the visible() closures inside the
     * Style sheet, and fillState() already fills that sheet with the values
     * the block ends up with, style included. Only editorAttributes() and
     * editorVideo(), which read the editing form rather than the sheet, need
     * to resolve a style themselves.
     */
    private static function backgroundType(Get $get): BlockBackgroundType
    {
        return BlockBackgroundType::resolve(
            $get('background_type'),
            $get('background_image_path'),
            $get('background_video_url'),
        );
    }

    /**
     * True when the chosen type is Image or Video and that media is set, so
     * the editor preview has a picture (or a stand-in for the video) to paint.
     * The sheet itself shows the tint, blur, position and card inputs as soon
     * as the type is picked, so the settings are ready before the upload.
     */
    private static function hasBackgroundMedia(Get $get): bool
    {
        return match (static::backgroundType($get)) {
            BlockBackgroundType::Image => filled($get('background_image_path')),
            BlockBackgroundType::Video => filled($get('background_video_url')),
            BlockBackgroundType::Color => false,
        };
    }
}
