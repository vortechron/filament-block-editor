<?php

namespace Vortechron\FilamentBlockEditor\Forms\Components;

use Filament\Forms\Components\Field;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Component;
use Livewire\Component as LivewireComponent;

/**
 * Shared behaviour for a sheet with no Apply button: every input writes its
 * value back the moment it changes and the sheet stays open.
 *
 * Used by the block "Style" sheet (BlockAppearanceFields). Reuse it for any
 * other sheet that should apply as you type.
 */
final class LiveSheet
{
    private static bool $applying = false;

    /**
     * Make every input apply as soon as it changes. Typed text waits until the
     * box loses focus, so a request is not sent per keystroke. Do not read
     * isLive() here: it needs the field's container, which does not exist yet
     * while the sheet is being built.
     *
     * @param  array<int, Component>  $fields
     * @return array<int, Component>
     */
    public static function applyLive(array $fields): array
    {
        foreach ($fields as $field) {
            if (! $field instanceof Field) {
                continue;
            }

            $field instanceof TextInput ? $field->live(onBlur: true) : $field->live();

            $field->afterStateUpdated(fn (LivewireComponent $livewire) => self::applyNow($livewire));
        }

        return $fields;
    }

    /**
     * Run the sheet's action (write the values back, keep the sheet open).
     *
     * Guarded against re-entry: reading the sheet's state stores any new
     * upload, and FileUpload fires its own afterStateUpdated hook while doing
     * so, which would call this again without end.
     *
     * forceRender() is what makes the page behind the sheet move. Filament
     * only re-renders the mounted modal when the same action stays mounted
     * (PartialsComponentHook::shouldRenderMountedActionOnly), so the form
     * behind the sheet would otherwise keep its old HTML until it closed.
     */
    public static function applyNow(LivewireComponent $livewire): void
    {
        if (self::$applying) {
            return;
        }

        self::$applying = true;

        try {
            $livewire->callMountedAction();

            if (method_exists($livewire, 'forceRender')) {
                $livewire->forceRender();
            }
        } finally {
            self::$applying = false;
        }
    }
}
