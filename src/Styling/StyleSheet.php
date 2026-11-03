<?php

namespace Vortechron\FilamentBlockEditor\Styling;

use Closure;

/**
 * Collects the CSS of the sections and blocks a page draws, from their
 * style bags (StyleBag) and advanced settings (Advanced), and prints it as
 * one `<style data-fbe-style>` before the page's sections.
 *
 * A section is `.sf-page .fbe-s-{id}`, a block `.sf-page .fbe-b-{id}`, so
 * these rules beat the layout CSS. The order is: base (desktop) rules,
 * hover rules, the tablet and phone media queries, "hide on" rules, then
 * the developers' own CSS, so each one can override the one before.
 *
 * Every value is cleaned again here, so nothing but typed values and
 * cleaned custom CSS is ever written. collect() keeps one sheet per draw:
 * draws inside it (a synced section, a block inside an own block) add to
 * the outer sheet instead of printing their own.
 */
final class StyleSheet
{
    private const TABLET = '(max-width: 1024px)';

    private const PHONE = '(max-width: 767px)';

    /**
     * Where "hide on" applies: each device's own width range.
     */
    private const HIDE_ON = [
        'desktop' => '(min-width: 1025px)',
        'tablet' => '(min-width: 768px) and (max-width: 1024px)',
        'phone' => '(max-width: 767px)',
    ];

    /**
     * @var list<self>
     */
    private static array $stack = [];

    /**
     * @var array{base: list<string>, hover: list<string>, tablet: list<string>, phone: list<string>, hide: list<string>, custom: list<string>}
     */
    private array $rules = ['base' => [], 'hover' => [], 'tablet' => [], 'phone' => [], 'hide' => [], 'custom' => []];

    /**
     * Runs a draw. The outermost one gets the sheet's <style> in front of
     * its HTML; a draw inside another adds its rules to the outer sheet.
     *
     * @param  Closure(): string  $draw
     */
    public static function collect(Closure $draw): string
    {
        if (self::$stack !== []) {
            return $draw();
        }

        $sheet = new self;
        self::$stack[] = $sheet;

        try {
            $html = $draw();
        } finally {
            array_pop(self::$stack);
        }

        return $sheet->toHtml().$html;
    }

    /**
     * The sheet of the draw that is running, if any.
     */
    public static function current(): ?self
    {
        return self::$stack[count(self::$stack) - 1] ?? null;
    }

    public static function sectionClass(string $id): string
    {
        return 'fbe-s-'.self::cleanId($id);
    }

    public static function blockClass(string $id): string
    {
        return 'fbe-b-'.self::cleanId($id);
    }

    /**
     * @param  array<mixed>  $style  a style bag
     * @param  array<mixed>  $advanced  advanced settings
     */
    public function section(string $id, array $style, array $advanced, bool $forBuilder = false): void
    {
        $this->add('.sf-page .'.self::sectionClass($id), $style, $advanced, $forBuilder, words: true);
    }

    /**
     * @param  array<mixed>  $style  a style bag
     * @param  array<mixed>  $advanced  advanced settings
     */
    public function block(string $id, array $style, array $advanced, bool $forBuilder = false): void
    {
        $this->add('.sf-page .'.self::blockClass($id), $style, $advanced, $forBuilder, words: false);
    }

    public function isEmpty(): bool
    {
        return $this->css() === '';
    }

    public function css(): string
    {
        $css = implode('', $this->rules['base']).implode('', $this->rules['hover']);

        foreach (['tablet' => self::TABLET, 'phone' => self::PHONE] as $variant => $media) {
            $css .= $this->rules[$variant] === [] ? '' : '@media '.$media.'{'.implode('', $this->rules[$variant]).'}';
        }

        // Nothing written here can hold a "<", but the sheet is printed in
        // a <style> tag, so make sure.
        return str_replace('<', '', $css.implode('', $this->rules['hide']).implode('', $this->rules['custom']));
    }

    public function toHtml(): string
    {
        $css = $this->css();

        return $css === '' ? '' : '<style data-fbe-style>'.$css.'</style>';
    }

    /**
     * @param  array<mixed>  $style
     * @param  array<mixed>  $advanced
     * @param  bool  $words  whether the element is a section, whose words (.sf-rich) set their own size
     */
    private function add(string $selector, array $style, array $advanced, bool $forBuilder, bool $words): void
    {
        foreach (StyleBag::clean($style) as $variant => $values) {
            $bucket = $variant === 'desktop' ? 'base' : $variant;
            $this->rules[$bucket][] = $this->rule($variant === 'hover' ? $selector.':hover' : $selector, StyleBag::declarations($values));

            $text = $words ? array_intersect_key($values, array_flip(StyleBag::SECTION_TEXT_KEYS)) : [];

            if ($text !== [] && $variant !== 'hover') {
                $this->rules[$bucket][] = $this->rule($selector.' .sf-rich', StyleBag::declarations($text));
            }
        }

        $advanced = Advanced::clean($advanced);
        $hide = $forBuilder ? 'opacity:.35;outline:2px dashed #94a3b8;outline-offset:-2px' : 'display:none';

        foreach ($advanced['hide_on'] ?? [] as $device) {
            $this->rules['hide'][] = '@media '.self::HIDE_ON[$device].'{'.$selector.'{'.$hide.'}}';
        }

        if (isset($advanced['css'])) {
            $this->rules['custom'][] = CustomCss::scope($advanced['css'], $selector);
        }
    }

    /**
     * @param  list<string>  $declarations
     */
    private function rule(string $selector, array $declarations): string
    {
        return $declarations === [] ? '' : $selector.'{'.implode(';', $declarations).'}';
    }

    private static function cleanId(string $id): string
    {
        return substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', $id), 0, 64);
    }
}
