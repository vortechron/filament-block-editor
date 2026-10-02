<?php

namespace Vortechron\FilamentBlockEditor\Enums;

use Filament\Support\Contracts\HasLabel;

/**
 * How the tint colour sits on a block's background image or video. Normal is
 * a flat see-through layer; Blend multiplies the colour into the picture, so
 * dark areas stay dark and the colour soaks into the light areas.
 */
enum BlockTintStyle: string implements HasLabel
{
    case Normal = 'normal';
    case Blend = 'blend';

    public function getLabel(): string
    {
        return match ($this) {
            self::Normal => 'Normal',
            self::Blend => 'Blend',
        };
    }

    /**
     * The CSS mix-blend-mode for the tint layer.
     */
    public function css(): string
    {
        return match ($this) {
            self::Normal => 'normal',
            self::Blend => 'multiply',
        };
    }

    public static function fromValue(mixed $value, self $default = self::Normal): self
    {
        if ($value instanceof self) {
            return $value;
        }

        return self::tryFrom((string) $value) ?? $default;
    }
}
