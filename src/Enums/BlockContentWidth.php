<?php

namespace Vortechron\FilamentBlockEditor\Enums;

use Filament\Support\Contracts\HasLabel;

/**
 * How wide the readable content inside a content block may grow. The block
 * section itself always spans the full width of the page; this only limits
 * the centered column of text inside it, the way a marketing page does.
 */
enum BlockContentWidth: string implements HasLabel
{
    case Narrow = 'narrow';
    case Normal = 'normal';
    case Wide = 'wide';
    case Full = 'full';

    public function getLabel(): string
    {
        return match ($this) {
            self::Narrow => 'Narrow',
            self::Normal => 'Normal',
            self::Wide => 'Wide',
            self::Full => 'Full bleed (edge to edge)',
        };
    }

    /**
     * Max width of the centered content column.
     *
     * Normal is 53rem: a comfortable reading width that matches a 56rem page
     * column with 1.5rem of padding on each side.
     */
    public function css(): string
    {
        return match ($this) {
            self::Narrow => '42rem',
            self::Normal => '53rem',
            self::Wide => '72rem',
            self::Full => 'none',
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
