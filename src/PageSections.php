<?php

namespace Vortechron\FilamentBlockEditor;

use BackedEnum;
use Filament\Support\Icons\Heroicon;

/**
 * Sections the page draws itself, which an editor can place between blocks:
 * a contact form, a pricing table, a newsletter sign-up.
 *
 * Register them once, from a service provider:
 *
 *     PageSections::register('contact', 'Contact form', 'sections.contact', Heroicon::Envelope);
 *
 * The "+" menu of every BlockSections field then offers "Contact form". The
 * block it adds holds no content; <x-filament-block-editor::blocks> draws the
 * view in its place, with $block and $page (the model that owns the blocks).
 */
final class PageSections
{
    /**
     * @var array<string, array{label: string, view: string, icon: string|BackedEnum, description: string|null, repeatable: bool}>
     */
    private static array $sections = [];

    /**
     * @param  string  $view  the Blade view the public page draws for it
     * @param  bool  $repeatable  false lets a page hold this section only once
     */
    public static function register(
        string $kind,
        string $label,
        string $view,
        string|BackedEnum $icon = Heroicon::OutlinedSquare3Stack3d,
        ?string $description = null,
        bool $repeatable = false,
    ): void {
        self::$sections[$kind] = [
            'label' => $label,
            'view' => $view,
            'icon' => $icon,
            'description' => $description,
            'repeatable' => $repeatable,
        ];
    }

    /**
     * @return array<string, array{label: string, view: string, icon: string|BackedEnum, description: string|null, repeatable: bool}>
     */
    public static function all(): array
    {
        return self::$sections;
    }

    /**
     * @return array{label: string, view: string, icon: string|BackedEnum, description: string|null, repeatable: bool}|null
     */
    public static function get(?string $kind): ?array
    {
        return $kind === null ? null : (self::$sections[$kind] ?? null);
    }

    /**
     * Drop every registered section. For tests.
     */
    public static function flush(): void
    {
        self::$sections = [];
    }
}
