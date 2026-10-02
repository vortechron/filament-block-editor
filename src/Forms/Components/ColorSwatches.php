<?php

namespace Vortechron\FilamentBlockEditor\Forms\Components;

use Closure;
use Filament\Forms\Components\Field;
use Vortechron\FilamentBlockEditor\Support\BlockColor;

/**
 * A row of round preset colours, a native colour picker and a hex box, all
 * writing the same "#rrggbb" value. Used in the block Style sheet for the
 * background colour and the tint colour.
 *
 * The saved value is always lowercase "#rrggbb" (see BlockColor::hex), so it
 * is safe to drop straight into an inline style.
 */
class ColorSwatches extends Field
{
    protected string $view = 'filament-block-editor::forms.components.color-swatches';

    /**
     * @var array<int, string> | Closure
     */
    protected array|Closure $presets = [];

    protected bool|Closure $allowsNone = false;

    protected function setUp(): void
    {
        parent::setUp();

        $this->default(null);
        $this->rule('regex:'.BlockColor::HEX_PATTERN);
        $this->validationMessages(['regex' => 'Use a hex colour like #1E1B4B.']);
        $this->dehydrateStateUsing(fn (mixed $state): ?string => BlockColor::hex($state));
    }

    /**
     * @param  array<int, string> | Closure  $presets
     */
    public function presets(array|Closure $presets): static
    {
        $this->presets = $presets;

        return $this;
    }

    /**
     * Show a "no colour" swatch that clears the value.
     */
    public function allowNone(bool|Closure $condition = true): static
    {
        $this->allowsNone = $condition;

        return $this;
    }

    /**
     * @return array<int, string>
     */
    public function getPresets(): array
    {
        return collect($this->evaluate($this->presets))
            ->map(fn (string $preset): ?string => BlockColor::hex($preset))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function allowsNone(): bool
    {
        return (bool) $this->evaluate($this->allowsNone);
    }
}
