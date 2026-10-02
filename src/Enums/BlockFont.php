<?php

namespace Vortechron\FilamentBlockEditor\Enums;

use Filament\Support\Contracts\HasLabel;

/**
 * The choices in the block editor's font picker.
 *
 * The first five are installed on the reader's own device, so they cost
 * nothing. The rest are web fonts. By default they come from Bunny Fonts (a
 * privacy-friendly font host), one stylesheet per page holding only the faces
 * that page draws; see stylesheetUrl(). Set `fonts.web_fonts_url` to null in
 * config/filament-block-editor.php to load them yourself, for example
 * self-hosted through laravel-vite-plugin's `fonts` option, whose aliases are
 * the case values (see webFontAliases()).
 */
enum BlockFont: string implements HasLabel
{
    case Georgia = 'georgia';
    case Times = 'times';
    case Helvetica = 'helvetica';
    case Verdana = 'verdana';
    case Trebuchet = 'trebuchet';

    case OpenSans = 'open-sans';
    case Roboto = 'roboto';
    case GoogleSans = 'google-sans';
    case Inter = 'inter';
    case Poppins = 'poppins';
    case NotoSansJp = 'noto-sans-jp';
    case Montserrat = 'montserrat';
    case Lato = 'lato';
    case RobotoCondensed = 'roboto-condensed';
    case RobotoMono = 'roboto-mono';
    case Arimo = 'arimo';
    case Oswald = 'oswald';
    case NotoSans = 'noto-sans';
    case NunitoSans = 'nunito-sans';
    case Nunito = 'nunito';
    case Rubik = 'rubik';
    case RobotoSlab = 'roboto-slab';
    case DmSans = 'dm-sans';
    case Manrope = 'manrope';
    case Raleway = 'raleway';

    /**
     * Web font cases, keyed by case value, mapped to the family name Bunny and
     * the browser know them by. Each case value is also the Bunny family slug
     * and the laravel-vite-plugin font alias, because both slug the family
     * name the same way.
     *
     * @var array<string, string>
     */
    private const WEB_FONTS = [
        'open-sans' => 'Open Sans',
        'roboto' => 'Roboto',
        'google-sans' => 'Google Sans',
        'inter' => 'Inter',
        'poppins' => 'Poppins',
        'noto-sans-jp' => 'Noto Sans JP',
        'montserrat' => 'Montserrat',
        'lato' => 'Lato',
        'roboto-condensed' => 'Roboto Condensed',
        'roboto-mono' => 'Roboto Mono',
        'arimo' => 'Arimo',
        'oswald' => 'Oswald',
        'noto-sans' => 'Noto Sans',
        'nunito-sans' => 'Nunito Sans',
        'nunito' => 'Nunito',
        'rubik' => 'Rubik',
        'roboto-slab' => 'Roboto Slab',
        'dm-sans' => 'DM Sans',
        'manrope' => 'Manrope',
        'raleway' => 'Raleway',
    ];

    /** @var array<int, string> */
    private const SERIF_FONTS = ['georgia', 'times', 'roboto-slab'];

    /** @var array<int, string> */
    private const MONOSPACE_FONTS = ['roboto-mono'];

    public function getLabel(): string
    {
        return match ($this) {
            self::Georgia => 'Georgia',
            self::Times => 'Times New Roman',
            self::Helvetica => 'Helvetica',
            self::Verdana => 'Verdana',
            self::Trebuchet => 'Trebuchet MS',
            default => self::WEB_FONTS[$this->value],
        };
    }

    /**
     * The family name to download and declare, or null when the face is
     * already on the reader's device.
     */
    public function webFamily(): ?string
    {
        return self::WEB_FONTS[$this->value] ?? null;
    }

    /**
     * The font-family value for the public page.
     */
    public function cssStack(): string
    {
        return match ($this) {
            self::Georgia => "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
            self::Times => "'Times New Roman', Times, serif",
            self::Helvetica => 'Helvetica, Arial, sans-serif',
            self::Verdana => 'Verdana, Geneva, sans-serif',
            self::Trebuchet => "'Trebuchet MS', 'Segoe UI', sans-serif",
            default => "'".self::WEB_FONTS[$this->value]."', ".$this->genericFamily(),
        };
    }

    /**
     * The CSS keyword a browser falls back to while the web font loads, or if
     * it never does.
     */
    public function genericFamily(): string
    {
        return match (true) {
            $this->isMonospace() => 'monospace',
            $this->isSerif() => 'serif',
            default => 'sans-serif',
        };
    }

    /**
     * Dompdf only ships DejaVu, so each choice falls back to the DejaVu face
     * with the same serif, sans or monospace shape.
     */
    public function pdfFamily(): string
    {
        return match (true) {
            $this->isMonospace() => 'DejaVu Sans Mono, monospace',
            $this->isSerif() => 'DejaVu Serif, serif',
            default => 'DejaVu Sans, sans-serif',
        };
    }

    public function isSerif(): bool
    {
        return in_array($this->value, self::SERIF_FONTS, true);
    }

    public function isMonospace(): bool
    {
        return in_array($this->value, self::MONOSPACE_FONTS, true);
    }

    /**
     * One stylesheet URL that declares every web font among the given choices,
     * or null when none of them is a web font (or web fonts are switched off).
     * Regular and bold only: a page never needs more.
     *
     * @param  iterable<self|null>  $fonts
     */
    public static function stylesheetUrl(iterable $fonts): ?string
    {
        $base = config('filament-block-editor.fonts.web_fonts_url');
        $families = self::webFontAliases($fonts);

        if (blank($base) || $families === []) {
            return null;
        }

        $family = collect($families)->map(fn (string $slug): string => $slug.':400,700')->implode('|');

        return $base.'?family='.$family.'&display=swap';
    }

    /**
     * The web font slugs the given choices need. They double as the aliases
     * for laravel-vite-plugin's `@fonts` directive. Device fonts, nulls and
     * repeats contribute nothing, so an all-device page loads no font at all.
     *
     * @param  iterable<self|null>  $fonts
     * @return array<int, string>
     */
    public static function webFontAliases(iterable $fonts): array
    {
        return collect($fonts)
            ->filter(fn (?self $font): bool => $font?->webFamily() !== null)
            ->map(fn (self $font): string => $font->value)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * The choices the block editor's font picker offers, in the shape
     * resources/js/font-family.jsx expects. Passing them from here keeps the
     * enum the only place a typeface is declared.
     *
     * Set `fonts.enabled` to false in the config to hide the picker.
     *
     * @return array<int, array{value: string, label: string, stack: string}>
     */
    public static function editorOptions(): array
    {
        if (! config('filament-block-editor.fonts.enabled', true)) {
            return [];
        }

        return collect(self::cases())
            ->map(fn (self $font): array => [
                'value' => $font->value,
                'label' => $font->getLabel(),
                'stack' => $font->cssStack(),
            ])
            ->all();
    }

    /**
     * @return array<string, string>
     */
    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $font): array => [$font->value => $font->getLabel()])
            ->all();
    }
}
