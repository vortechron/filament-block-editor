<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\Styling\StyleBag;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class StyleBagTest extends TestCase
{
    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);
        $app['config']->set('filament-block-editor.fonts', [
            'brand' => ['label' => 'Brand', 'stack' => "'Inter', sans-serif"],
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: mixed, 2: string}>
     */
    public static function goodValues(): array
    {
        return [
            'px length' => ['padding_top', '24px', '24px'],
            'rem length with decimals' => ['padding_left', '1.125rem', '1.125rem'],
            'a leading dot gets its zero' => ['gap', '.5rem', '0.5rem'],
            'zero' => ['padding_bottom', '0', '0'],
            'zero as a number' => ['padding_right', 0, '0'],
            'upper case unit' => ['width', '50PX', '50px'],
            'negative margin' => ['margin_top', '-12px', '-12px'],
            'percent at the limit' => ['max_width', '100%', '100%'],
            'px at the limit' => ['min_height', '2000px', '2000px'],
            'rem at the limit' => ['font_size', '200rem', '200rem'],
            'viewport height' => ['min_height', '80vh', '80vh'],
            'negative letter spacing' => ['letter_spacing', '-0.02em', '-0.02em'],
            'short hex' => ['color', '#ABC', '#abc'],
            'long hex' => ['background_color', '#AABBCC', '#aabbcc'],
            'hex with alpha' => ['border_color', '#aabbcc80', '#aabbcc80'],
            'transparent' => ['background_color', 'transparent', 'transparent'],
            'a kit colour' => ['color', 'kit:primary', 'kit:primary'],
            'a custom kit colour' => ['color', 'kit:gold-2', 'kit:gold-2'],
            'the kit heading font' => ['font_family', 'kit:heading', 'kit:heading'],
            'a section font' => ['font_family', 'serif', 'serif'],
            'a host font' => ['font_family', 'brand', 'brand'],
            'a font weight' => ['font_weight', '700', '700'],
            'a font weight as a number' => ['font_weight', 300, '300'],
            'unitless line height' => ['line_height', '1.5', '1.5'],
            'line height as a number' => ['line_height', 2, '2'],
            'line height as a length' => ['line_height', '28px', '28px'],
            'text transform' => ['text_transform', 'uppercase', 'uppercase'],
            'text align' => ['text_align', 'justify', 'justify'],
            'border width' => ['border_width', '2px', '2px'],
            'border style' => ['border_style', 'dashed', 'dashed'],
            'radius' => ['radius', '12px', '12px'],
            'the kit radius' => ['radius', 'kit:radius', 'kit:radius'],
            'a shadow' => ['shadow', 'lg', 'lg'],
            'no shadow' => ['shadow', 'none', 'none'],
            'opacity' => ['opacity', '0.5', '0.5'],
            'opacity as a number' => ['opacity', 1, '1'],
        ];
    }

    #[DataProvider('goodValues')]
    public function test_it_keeps_a_good_value(string $key, mixed $value, string $expected): void
    {
        $this->assertSame(['desktop' => [$key => $expected]], StyleBag::clean(['desktop' => [$key => $value]]));
    }

    /**
     * @return array<string, array{0: string, 1: mixed}>
     */
    public static function badValues(): array
    {
        return [
            'breaking out of the style tag' => ['color', '#fff</style><script>alert(1)</script>'],
            'a closing style tag as a length' => ['padding_top', '1px</style>'],
            'javascript' => ['background_color', 'javascript:alert(1)'],
            'an expression' => ['width', 'expression(alert(1))'],
            'a url' => ['background_color', 'url(https://evil.example/x.png)'],
            'a second declaration' => ['color', '#fff; background: red'],
            'an odd unit' => ['padding_top', '12pt'],
            'another odd unit' => ['width', '20ch'],
            'no unit' => ['padding_top', '24'],
            'too many decimals' => ['padding_top', '1.23456px'],
            'huge px' => ['padding_top', '2001px'],
            'huge rem' => ['font_size', '201rem'],
            'huge percent' => ['width', '101%'],
            'huge viewport' => ['min_height', '150vh'],
            'a huge number' => ['padding_top', '99999999999999999999px'],
            'negative padding' => ['padding_top', '-4px'],
            'negative width' => ['width', '-10%'],
            'negative font size' => ['font_size', '-1rem'],
            'a calc' => ['width', 'calc(100% - 2rem)'],
            'a colour name' => ['color', 'red'],
            'a five digit hex' => ['color', '#abcde'],
            'rgb' => ['color', 'rgb(0 0 0)'],
            'a bad kit key' => ['color', 'kit:Bad Key'],
            'a kit key too long' => ['color', 'kit:'.str_repeat('a', 31)],
            'the theme font' => ['font_family', 'theme'],
            'an unknown font' => ['font_family', 'comic-sans'],
            'a raw font stack' => ['font_family', 'Arial, sans-serif'],
            'a weight between steps' => ['font_weight', '350'],
            'a weight too heavy' => ['font_weight', '1000'],
            'bold' => ['font_weight', 'bold'],
            'a line height too tall' => ['line_height', '5'],
            'a line height too small' => ['line_height', '0.5'],
            'opacity above one' => ['opacity', '2'],
            'negative opacity' => ['opacity', '-0.1'],
            'an unknown transform' => ['text_transform', 'blink'],
            'an unknown shadow' => ['shadow', 'huge'],
            'a raw shadow' => ['shadow', '0 0 4px red'],
            'an array' => ['padding_top', ['24px']],
            'null' => ['color', null],
            'true' => ['opacity', true],
            'an unknown key' => ['position', 'fixed'],
            'another unknown key' => ['behavior', 'url(x.htc)'],
        ];
    }

    #[DataProvider('badValues')]
    public function test_it_drops_a_bad_value(string $key, mixed $value): void
    {
        $this->assertSame([], StyleBag::clean(['desktop' => [$key => $value]]));
    }

    public function test_hover_only_allows_the_colour_shadow_and_opacity_keys(): void
    {
        $clean = StyleBag::clean(['hover' => [
            'color' => '#ffffff',
            'background_color' => 'kit:primary',
            'border_color' => '#000',
            'shadow' => 'md',
            'opacity' => '0.9',
            'padding_top' => '10px',
            'font_size' => '2rem',
        ]]);

        $this->assertSame(['hover' => [
            'color' => '#ffffff',
            'background_color' => 'kit:primary',
            'border_color' => '#000',
            'shadow' => 'md',
            'opacity' => '0.9',
        ]], $clean);
    }

    public function test_it_keeps_the_known_variants_in_order_and_leaves_empty_ones_out(): void
    {
        $clean = StyleBag::clean([
            'hover' => ['color' => '#fff'],
            'phone' => ['padding_top' => '12px'],
            'tablet' => ['padding_top' => 'nonsense'],
            'desktop' => ['padding_top' => '24px'],
            'print' => ['color' => '#000'],
        ]);

        $this->assertSame([
            'desktop' => ['padding_top' => '24px'],
            'phone' => ['padding_top' => '12px'],
            'hover' => ['color' => '#fff'],
        ], $clean);
    }

    public function test_a_value_that_is_not_a_style_bag_is_empty(): void
    {
        $this->assertSame([], StyleBag::clean('padding: 10px'));
        $this->assertSame([], StyleBag::clean(null));
        $this->assertSame([], StyleBag::clean(['desktop' => 'padding: 10px']));
        $this->assertSame([], StyleBag::clean([['padding_top' => '10px']]));
    }
}
