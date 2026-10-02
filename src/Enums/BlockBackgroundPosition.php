<?php

namespace Vortechron\FilamentBlockEditor\Enums;

use Filament\Support\Contracts\HasLabel;

/**
 * Which part of a background image or video stays in view when the block is
 * a different shape from the picture. Maps straight onto CSS
 * background-position / object-position keywords.
 */
enum BlockBackgroundPosition: string implements HasLabel
{
    case Center = 'center';
    case Top = 'top';
    case Bottom = 'bottom';
    case Left = 'left';
    case Right = 'right';
    case TopLeft = 'top-left';
    case TopRight = 'top-right';
    case BottomLeft = 'bottom-left';
    case BottomRight = 'bottom-right';

    public function getLabel(): string
    {
        return match ($this) {
            self::Center => 'Center',
            self::Top => 'Top',
            self::Bottom => 'Bottom',
            self::Left => 'Left',
            self::Right => 'Right',
            self::TopLeft => 'Top left',
            self::TopRight => 'Top right',
            self::BottomLeft => 'Bottom left',
            self::BottomRight => 'Bottom right',
        };
    }

    public function css(): string
    {
        return match ($this) {
            self::Center => 'center',
            self::Top => 'top',
            self::Bottom => 'bottom',
            self::Left => 'left',
            self::Right => 'right',
            self::TopLeft => 'top left',
            self::TopRight => 'top right',
            self::BottomLeft => 'bottom left',
            self::BottomRight => 'bottom right',
        };
    }

    public static function fromValue(mixed $value, self $default = self::Center): self
    {
        if ($value instanceof self) {
            return $value;
        }

        return self::tryFrom((string) $value) ?? $default;
    }
}
