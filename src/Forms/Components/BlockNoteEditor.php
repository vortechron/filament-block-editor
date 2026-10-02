<?php

namespace Vortechron\FilamentBlockEditor\Forms\Components;

use Closure;
use Filament\Facades\Filament;
use Filament\Forms\Components\Field;
use LogicException;
use Vortechron\FilamentBlockEditor\Enums\BlockFont;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorPlugin;

/**
 * A Notion-style block editor (BlockNote) for one JSON column.
 *
 * Use it on its own for a rich text field, or inside BlockSections, where
 * each section of a page gets one. The column holds the BlockNote document;
 * cast it to `array` on the model and render it with
 * <x-filament-block-editor::content :content="$model->body" />.
 *
 * The editor is a React island. It reads its content once, when it mounts,
 * so setting the state from Livewire later does not change what is on screen.
 */
class BlockNoteEditor extends Field
{
    protected string $view = 'filament-block-editor::forms.components.block-note-editor';

    protected ?Closure $backgroundVideo = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->default([]);

        // Livewire can hand the document back as JSON text for a moment.
        $this->afterStateHydrated(function (BlockNoteEditor $component, mixed $state): void {
            if (is_string($state)) {
                $component->state(json_decode($state, true) ?? []);
            }
        });
    }

    /**
     * A video to play behind the editor, so the block looks like it will on
     * the public page. The closure returns ['embed' => bool, 'url' => string]
     * or null for no video.
     */
    public function backgroundVideo(?Closure $callback): static
    {
        $this->backgroundVideo = $callback;

        return $this;
    }

    /**
     * @return array{embed: bool, url: string}|null
     */
    public function getBackgroundVideo(): ?array
    {
        return $this->evaluate($this->backgroundVideo);
    }

    public function getUploadUrl(): string
    {
        return $this->panelRoute('block-editor.upload');
    }

    public function getMediaUrl(): string
    {
        return $this->panelRoute('block-editor.media');
    }

    /**
     * @return array<int, array{value: string, label: string, stack: string}>
     */
    public function getFonts(): array
    {
        return BlockFont::editorOptions();
    }

    /**
     * The upload and media routes live on the panel, behind its own sign-in
     * and tenant checks, so they only exist on panels that register the
     * plugin.
     */
    private function panelRoute(string $name): string
    {
        $panel = Filament::getCurrentOrDefaultPanel();

        if (! $panel->hasPlugin(FilamentBlockEditorPlugin::ID)) {
            throw new LogicException('Add FilamentBlockEditorPlugin::make() to the "'.$panel->getId().'" panel to use the block editor.');
        }

        $tenant = Filament::getTenant();

        return $panel->route($name, $tenant === null ? [] : ['tenant' => $tenant]);
    }
}
