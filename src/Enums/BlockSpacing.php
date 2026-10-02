<?php

namespace Vortechron\FilamentBlockEditor\Enums;

use Filament\Support\Contracts\HasLabel;

/**
 * Preset spacing sizes for content block padding and vertical margins.
 */
enum BlockSpacing: string implements HasLabel
{
    case None = 'none';
    case Small = 'sm';
    case Medium = 'md';
    case Large = 'lg';
    case ExtraLarge = 'xl';

    public function getLabel(): string
    {
        return match ($this) {
            self::None => 'None',
            self::Small => 'Small',
            self::Medium => 'Medium',
            self::Large => 'Large',
            self::ExtraLarge => 'Extra large',
        };
    }

    public function css(): string
    {
        return match ($this) {
            self::None => '0',
            self::Small => '1rem',
            self::Medium => '2rem',
            self::Large => '3.5rem',
            self::ExtraLarge => '6rem',
        };
    }

    /**
     * The same size for the public page, where it shrinks with the
     * screen. It reaches css() on a laptop and never grows past it, but
     * stops at a small floor on a phone: at a fixed 6rem a 390px phone lost
     * 192px to padding and big headings no longer fit in what was left.
     *
     * Only for the browser. Dompdf cannot read clamp(), so the PDF and the
     * per-item spacing inside a document keep css().
     */
    public function fluidCss(): string
    {
        return match ($this) {
            self::None => '0',
            self::Small => '1rem',
            self::Medium => 'clamp(1.25rem, 3.2vw, 2rem)',
            self::Large => 'clamp(1.5rem, 5vw, 3.5rem)',
            self::ExtraLarge => 'clamp(1.5rem, 7.5vw, 6rem)',
        };
    }

    public static function fromValue(mixed $value, self $default = self::Medium): self
    {
        if ($value instanceof self) {
            return $value;
        }

        return self::tryFrom((string) $value) ?? $default;
    }
}
