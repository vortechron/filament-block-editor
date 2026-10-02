<?php

namespace Vortechron\FilamentBlockEditor\Forms\Components;

use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\View;
use Filament\Support\Enums\Alignment;
use Filament\Support\Enums\Width;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;
use Vortechron\FilamentBlockEditor\PageSections;
use Vortechron\FilamentBlockEditor\Support\BlockLibrary;
use Vortechron\FilamentBlockEditor\Support\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Support\BlockStyles;

/**
 * The page builder: a list of full-width sections, each a BlockNote editor
 * that already wears its background, padding and width, so the form looks
 * like the finished page.
 *
 * A "+" menu under the list (and a second one above it once the list has
 * blocks) adds a blank block, a ready-made design, a saved block, a picture
 * or video, or one of the page's own sections (see PageSections). Each block
 * has a "Style" sheet and a "Save to library" action in its header.
 *
 * The model needs the HasContentBlocks trait. The field edits the
 * contentBlocks() relation by default:
 *
 *     BlockSections::make()
 *     BlockSections::make('footerBlocks')->collection('footer')
 */
class BlockSections extends Repeater
{
    protected string $collection = ContentBlock::DEFAULT_COLLECTION;

    /**
     * The page sections this list may hold, or null for every registered one.
     *
     * @var array<int, string>|null
     */
    protected ?array $sectionKinds = null;

    public static function make(?string $name = 'contentBlocks'): static
    {
        return parent::make($name);
    }

    protected function setUp(): void
    {
        parent::setUp();

        $name = $this->getName();

        $this
            ->hiddenLabel()
            ->relationship()
            ->orderColumn('sort_order')
            ->reorderable()
            ->reorderableWithButtons()
            ->defaultItems(0)
            ->addable(false)
            // "Collapse all" folds every block down to its name, so the list
            // becomes a short outline that is easy to drag into order.
            ->collapsible()
            ->itemLabel(fn (array $state): string => static::blockLabel($state))
            ->mutateRelationshipDataBeforeCreateUsing(
                fn (array $data): array => [...$data, 'collection' => $this->collection],
            )
            ->schema([
                Hidden::make('kind')
                    ->default(ContentBlock::KIND_CONTENT),
                BlockNoteEditor::make('content')
                    ->hiddenLabel()
                    ->extraAttributes(fn (Get $get): array => BlockAppearanceFields::editorAttributes($get), merge: true)
                    ->backgroundVideo(fn (Get $get): ?array => BlockAppearanceFields::editorVideo($get))
                    ->visible(fn (Get $get): bool => ! static::isSectionKind($get('kind'))),
                // A page section has nothing to edit here: a card shows where
                // the page will draw it.
                View::make('filament-block-editor::forms.components.section-block')
                    ->viewData(fn (Get $get): array => ['section' => PageSections::get($get('kind')), 'kind' => $get('kind')])
                    ->visible(fn (Get $get): bool => static::isSectionKind($get('kind'))),
                ...BlockAppearanceFields::hiddenFields(),
            ])
            ->extraItemActions([
                static::styleAction(),
                static::saveToLibraryAction(),
            ])
            ->aboveContent(
                Actions::make([$this->addBlockActionGroup($name, atTop: true)])
                    ->key("{$name}TopActions")
                    ->alignment(Alignment::Center)
                    // Inside the field's own content, Get is scoped to the field,
                    // so the list is read from the field itself.
                    ->visible(fn (): bool => ! $this->isDisabled() && filled($this->getRawState())),
            )
            ->belowContent(
                Actions::make([$this->addBlockActionGroup($name)])
                    ->key("{$name}Actions")
                    ->alignment(Alignment::Center)
                    ->visible(fn (): bool => ! $this->isDisabled()),
            )
            ->extraAttributes(['class' => 'fbe-blocks'])
            ->columnSpanFull();
    }

    /**
     * Which list of the model's blocks this field edits. Pair it with a
     * relation made by HasContentBlocks::contentBlocksIn().
     */
    public function collection(string $collection): static
    {
        $this->collection = $collection;

        return $this;
    }

    /**
     * Limit the page sections offered in the "+" menu. Every section
     * registered with PageSections is offered when this is not called.
     *
     * @param  array<int, string>  $kinds
     */
    public function sections(array $kinds): static
    {
        $this->sectionKinds = $kinds;

        return $this;
    }

    /**
     * Add one block to this list, at the end or ($atTop) first.
     *
     * Every schema field needs a key here. A missing key breaks the
     * client-side Livewire entanglement for the new item and silently stops
     * the form from saving in the browser.
     *
     * The "+" menus live inside the field's own content, where Get and Set
     * are scoped to the field, so the list is read and written on the field
     * itself rather than by name.
     *
     * @param  array<string, mixed>  $attributes  content and appearance overrides
     */
    public function insertBlock(array $attributes, bool $atTop = false): void
    {
        $items = $this->getRawState() ?? [];

        // A block that arrives with a look of its own keeps it: a ready-made
        // design is a design, and a saved block already says which style it
        // follows. Only a block starting from nothing picks up the default
        // style.
        $bringsOwnLook = array_intersect_key($attributes, ContentBlock::appearanceDefaults()) !== []
            || array_key_exists('block_style_id', $attributes);

        // The appearance defaults stay even when a style is attached: they are
        // ignored while the block follows the style, and become the fallback
        // the moment it stops.
        $seed = [
            'kind' => ContentBlock::KIND_CONTENT,
            'content' => [],
            'block_style_id' => $bringsOwnLook
                ? null
                : app(BlockStyles::class)->defaultFor(BlockLibraryPicker::tenant())?->getKey(),
            'style_overrides' => [],
            ...ContentBlock::appearanceDefaults(),
        ];

        $item = [(string) Str::uuid() => [...$seed, ...array_intersect_key($attributes, $seed)]];

        $this->rawState($atTop ? [...$item, ...$items] : [...$items, ...$item]);
    }

    /**
     * Per-item "Style" action: edits the block's background, layout and
     * spacing in a slide-over and writes each change straight into the
     * repeater item's hidden fields.
     */
    protected static function styleAction(): Action
    {
        return BlockAppearanceFields::configureSheet(Action::make('editStyle'))
            ->visible(fn (array $arguments, Repeater $component): bool => ! $component->isDisabled() && static::itemHoldsContent($component, $arguments))
            ->fillForm(fn (array $arguments, Repeater $component): array => BlockAppearanceFields::fillState(
                $component->getRawItemState($arguments['item']),
            ))
            ->action(function (array $arguments, array $data, Repeater $component, Action $action): void {
                $state = $component->getState();
                $state[$arguments['item']] = [
                    ...($state[$arguments['item']] ?? []),
                    ...BlockAppearanceFields::writeBackState($data),
                ];
                $component->state($state);

                // Keep the sheet open: every change applies on its own.
                $action->halt();
            });
    }

    /**
     * Per-item "Save to library" action: stores the block as a SavedBlock so
     * it can be dropped into any other page.
     */
    protected static function saveToLibraryAction(): Action
    {
        return Action::make('saveToLibrary')
            ->label('Save to library')
            ->icon(Heroicon::BookmarkSquare)
            ->visible(fn (array $arguments, Repeater $component): bool => ! $component->isDisabled() && static::itemHoldsContent($component, $arguments))
            ->modalHeading('Save this block to your library')
            ->modalWidth(Width::Medium)
            ->modalSubmitActionLabel('Save block')
            ->schema([
                TextInput::make('name')
                    ->label('Name')
                    ->required()
                    ->maxLength(255),
                TextInput::make('description')
                    ->label('Description')
                    ->maxLength(255),
            ])
            ->action(function (array $arguments, array $data, Repeater $component): void {
                $state = (array) $component->getRawItemState($arguments['item']);

                SavedBlock::create([
                    'name' => $data['name'],
                    'description' => $data['description'] ?? null,
                    'content' => $state['content'] ?? [],
                    ...array_intersect_key($state, [
                        ...ContentBlock::appearanceDefaults(),
                        ...array_fill_keys(ContentBlock::STYLE_COLUMNS, null),
                    ]),
                ]);

                Notification::make()
                    ->title('Block saved to your library')
                    ->success()
                    ->send();
            });
    }

    /**
     * The "+" menu. The one above the list ($atTop) adds blocks first, and
     * its actions carry a "_top" suffix (addBlank__contentBlocks_top) so their
     * names never clash with the menu below the list.
     */
    protected function addBlockActionGroup(string $name, bool $atTop = false): ActionGroup
    {
        $suffix = $name.($atTop ? '_top' : '');
        $tooltip = $atTop ? 'Add a block at the top' : 'Add a block';

        return ActionGroup::make([
            Action::make("addBlank__{$suffix}")
                ->label('Create blank')
                ->icon(Heroicon::Plus)
                ->action(fn () => $this->insertBlock([], $atTop)),
            $this->libraryAction("addReadyMade__{$suffix}", 'Ready-made blocks', 'presets', $atTop),
            $this->libraryAction("addSavedBlock__{$suffix}", 'Saved blocks', 'saved', $atTop),
            $this->libraryAction("addMedia__{$suffix}", 'Media', 'media', $atTop),
            ...collect(PageSections::all())
                ->map(fn (array $section, string $kind): Action => $this->addSectionAction($kind, $section, $suffix, $atTop))
                ->values()
                ->all(),
        ])
            ->label($tooltip)
            ->icon(Heroicon::Plus)
            ->iconButton()
            ->color('gray')
            ->tooltip($tooltip);
    }

    protected function libraryAction(string $actionName, string $label, string $tab, bool $atTop): Action
    {
        return BlockLibraryPicker::sheet(Action::make($actionName))
            ->label($label)
            ->icon($tab === 'media' ? Heroicon::Photo : Heroicon::Squares2x2)
            ->schema(BlockLibraryPicker::fields($tab))
            ->action(function (array $data) use ($atTop): void {
                $this->insertBlock(BlockLibrary::attributes(BlockLibraryPicker::tenant(), $data['selection']), $atTop);
            });
    }

    /**
     * Places one of the page's own sections in this list. A section that is
     * not repeatable disappears from both "+" menus once placed; deleting the
     * block brings it back.
     *
     * @param  array{label: string, view: string, icon: mixed, description: string|null, repeatable: bool}  $section
     */
    protected function addSectionAction(string $kind, array $section, string $suffix, bool $atTop): Action
    {
        return Action::make('addSection_'.Str::camel($kind).'__'.$suffix)
            ->label($section['label'])
            ->icon($section['icon'])
            ->hidden(fn (): bool => ! $this->offersSection($kind)
                || (! $section['repeatable'] && static::hasSectionBlock($this->getRawState(), $kind)))
            ->action(function () use ($kind, $section, $atTop): void {
                if (! $section['repeatable'] && static::hasSectionBlock($this->getRawState(), $kind)) {
                    return;
                }

                // No block style: a section is drawn by the page, not styled.
                $this->insertBlock(['kind' => $kind, 'block_style_id' => null], $atTop);
            });
    }

    protected function offersSection(string $kind): bool
    {
        return $this->sectionKinds === null || in_array($kind, $this->sectionKinds, true);
    }

    protected static function hasSectionBlock(mixed $items, string $kind): bool
    {
        return collect(is_array($items) ? $items : [])
            ->contains(fn (mixed $item): bool => data_get($item, 'kind') === $kind);
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    protected static function itemHoldsContent(Repeater $component, array $arguments): bool
    {
        $state = (array) $component->getRawItemState($arguments['item']);

        return ! static::isSectionKind($state['kind'] ?? null);
    }

    protected static function isSectionKind(mixed $kind): bool
    {
        return filled($kind) && $kind !== ContentBlock::KIND_CONTENT;
    }

    /**
     * The block's name in the list: a section's own name, else the first
     * heading or line of text, else "Block".
     *
     * @param  array<string, mixed>  $state
     */
    protected static function blockLabel(array $state): string
    {
        $kind = $state['kind'] ?? null;

        if (static::isSectionKind($kind)) {
            return PageSections::get($kind)['label'] ?? Str::headline((string) $kind);
        }

        return BlockNoteDocument::title($state['content'] ?? null) ?? 'Block';
    }
}
