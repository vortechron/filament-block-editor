<?php

namespace Vortechron\FilamentBlockEditor\Design;

use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\Styling\CssValue;

/**
 * Writes a clean kit (Kit::normalize()) as CSS on `.sf-page`.
 *
 * Always: the kit variables, `--kit-color-<key>` for every colour,
 * `--kit-font-heading`, `--kit-font-body`, `--kit-radius`,
 * `--kit-shadow-sm|md|lg|xl`, `--kit-text-base`, `--kit-heading-weight`,
 * and the button and form variables.
 *
 * Only for values that differ from the package defaults (today's look):
 * the old page tokens mapped to the kit (`--sf-accent:
 * var(--kit-color-primary)`, `--sf-text`, `--sf-heading-font`, ...), and the
 * button, form and text rules that read the kit. So the default kit
 * changes nothing, a host's own `--sf-*` theme keeps working until the kit
 * is changed, and once a value changes every existing layout follows it.
 */
final class KitCss
{
    private const SHADOWS = [
        'sm' => '0 1px 2px rgb(15 23 42 / 0.06), 0 1px 3px rgb(15 23 42 / 0.1)',
        'md' => '0 4px 12px -2px rgb(15 23 42 / 0.12)',
        'lg' => '0 12px 28px -8px rgb(15 23 42 / 0.2)',
        'xl' => '0 24px 48px -12px rgb(15 23 42 / 0.28)',
    ];

    /**
     * The button block's height, padding and text size by kit size. "md"
     * is today's button (parts.css).
     */
    private const BUTTON_SIZES = [
        'sm' => 'min-height:2.75rem;padding:.55rem 1.25rem;font-size:.9375rem',
        'lg' => 'min-height:3.75rem;padding:.95rem 2.25rem;font-size:1.1875rem',
    ];

    /**
     * @param  array<string, mixed>  $kit  a clean kit
     */
    public static function write(array $kit): string
    {
        $defaults = Kit::PACKAGE_DEFAULTS;
        $variables = [...self::variables($kit), ...self::mappings($kit, $defaults)];

        $css = '.sf-page{'.implode(';', $variables).'}'
            .self::textRules($kit, $defaults)
            .self::buttonRules($kit['buttons'], $defaults['buttons'])
            .self::formRules($kit['forms'], $defaults['forms']);

        // Every value is typed, but the CSS is printed in a <style> tag.
        return str_replace('<', '', $css);
    }

    /**
     * @param  array<string, mixed>  $kit
     * @return list<string>
     */
    private static function variables(array $kit): array
    {
        $css = [];

        foreach ($kit['colors'] as $key => $value) {
            $css[] = "--kit-color-{$key}:{$value}";
        }

        foreach ($kit['custom_colors'] as $color) {
            $css[] = "--kit-color-{$color['key']}:{$color['value']}";
        }

        $css[] = '--kit-font-heading:'.self::font($kit['fonts']['heading'], 'var(--sf-heading-font)');
        $css[] = '--kit-font-body:'.self::font($kit['fonts']['body'], 'var(--sf-body-font)');
        $css[] = '--kit-text-base:'.$kit['text']['base_size'];
        $css[] = '--kit-heading-weight:'.$kit['text']['heading_weight'];
        $css[] = '--kit-radius:'.$kit['radius'];

        foreach (self::SHADOWS as $size => $shadow) {
            $css[] = "--kit-shadow-{$size}:{$shadow}";
        }

        $css[] = '--kit-button-radius:'.$kit['buttons']['radius'];
        $css[] = '--kit-button-weight:'.$kit['buttons']['font_weight'];
        $css[] = '--kit-button-transform:'.$kit['buttons']['text_transform'];
        $css[] = '--kit-form-radius:'.$kit['forms']['radius'];

        return $css;
    }

    /**
     * The old page tokens, for each kit value that differs from today's.
     *
     * @param  array<string, mixed>  $kit
     * @param  array<string, mixed>  $defaults
     * @return list<string>
     */
    private static function mappings(array $kit, array $defaults): array
    {
        $changed = fn (string $group, ?string $key = null): bool => $key === null
            ? $kit[$group] !== $defaults[$group]
            : $kit[$group][$key] !== $defaults[$group][$key];
        $css = [];

        if ($changed('colors', 'primary')) {
            $css[] = '--sf-accent:var(--kit-color-primary)';
            // Words on the accent colour stay easy to read.
            $css[] = '--sf-accent-ink:'.(BlockNoteRenderer::isDarkColor(self::sixDigits($kit['colors']['primary'])) ? '#ffffff' : '#0f172a');
        }

        $map = [
            'secondary' => ['--sf-ink:var(--kit-color-secondary)'],
            'text' => ['--sf-text:var(--kit-color-text)'],
            'background' => ['--sf-surface:var(--kit-color-background)', '--sf-card:var(--kit-color-background)'],
            'surface' => ['--sf-alt:var(--kit-color-surface)'],
            'border' => ['--sf-card-line:1px solid var(--kit-color-border)'],
        ];

        foreach ($map as $key => $declarations) {
            if ($changed('colors', $key)) {
                array_push($css, ...$declarations);
            }
        }

        if ($kit['fonts']['heading'] !== 'theme') {
            $css[] = '--sf-heading-font:var(--kit-font-heading)';
        }

        if ($kit['fonts']['body'] !== 'theme') {
            $css[] = '--sf-body-font:var(--kit-font-body)';
        }

        if ($changed('text', 'heading_weight')) {
            $css[] = '--sf-heading-weight:var(--kit-heading-weight)';
        }

        if ($changed('radius')) {
            $css[] = '--sf-radius:var(--kit-radius)';
        }

        return $css;
    }

    /**
     * @param  array<string, mixed>  $kit
     * @param  array<string, mixed>  $defaults
     */
    private static function textRules(array $kit, array $defaults): string
    {
        return $kit['text']['base_size'] === $defaults['text']['base_size'] ? '' : '.sf-page .sf-rich{font-size:var(--kit-text-base)}';
    }

    /**
     * @param  array<string, string>  $buttons
     * @param  array<string, string>  $defaults
     */
    private static function buttonRules(array $buttons, array $defaults): string
    {
        $css = [];

        foreach (['radius' => 'border-radius:var(--kit-button-radius)', 'font_weight' => 'font-weight:var(--kit-button-weight)', 'text_transform' => 'text-transform:var(--kit-button-transform)'] as $key => $declaration) {
            if ($buttons[$key] !== $defaults[$key]) {
                $css[] = $declaration;
            }
        }

        if (isset(self::BUTTON_SIZES[$buttons['size']])) {
            $css[] = self::BUTTON_SIZES[$buttons['size']];
        }

        $css = match ($buttons['style']) {
            'pill' => [...$css, 'border-radius:9999px'],
            'shadow' => [...$css, 'border:2.5px solid var(--sf-ink)', 'box-shadow:6px 6px 0 var(--sf-ink)'],
            default => $css,
        };

        return ($css === [] ? '' : '.sf-page .bn-button{'.implode(';', $css).'}')
            .($buttons['style'] === 'outline' ? '.sf-page .bn-button-solid{border-color:currentColor;background:transparent;box-shadow:none;color:var(--sf-heading, var(--sf-ink))}' : '');
    }

    /**
     * The form look beyond the default "outline" style with labels above
     * (resources/css/page/forms.css). The corners always read
     * --kit-form-radius.
     *
     * @param  array<string, string>  $forms
     * @param  array<string, string>  $defaults
     */
    private static function formRules(array $forms, array $defaults): string
    {
        $css = match ($forms['style']) {
            'filled' => '.sf-page .fbe-form .fbe-input{border-color:transparent;background:var(--kit-color-surface)}',
            'underline' => '.sf-page .fbe-form .fbe-input{border-width:0 0 2px;border-radius:0;background:transparent;padding-inline:0}',
            default => '',
        };

        return $css.($forms['labels'] === $defaults['labels'] ? '' : '.sf-page .fbe-form .fbe-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}');
    }

    private static function font(string $font, string $theme): string
    {
        return $font === 'theme' ? $theme : CssValue::fontCss($font);
    }

    /**
     * A kit colour as "#rrggbb", for the brightness check.
     */
    private static function sixDigits(string $color): string
    {
        $hex = substr($color, 1);

        return '#'.(strlen($hex) === 3 ? $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2] : substr($hex, 0, 6));
    }
}
