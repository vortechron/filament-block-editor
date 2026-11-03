<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Vortechron\FilamentBlockEditor\Styling\StyleSheet;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class StyleSheetTest extends TestCase
{
    public function test_a_section_rule_targets_the_section_class_inside_the_page(): void
    {
        $sheet = new StyleSheet;
        $sheet->section('a1', ['desktop' => ['padding_top' => '24px', 'background_color' => 'kit:primary']], []);

        $this->assertSame('.sf-page .fbe-s-a1{padding-top:24px;background-color:var(--kit-color-primary)}', $sheet->css());
    }

    public function test_tablet_and_phone_values_go_into_media_queries_after_the_base_and_hover_after_the_base(): void
    {
        $sheet = new StyleSheet;
        $sheet->block('b1', [
            'desktop' => ['padding_top' => '24px'],
            'tablet' => ['padding_top' => '16px'],
            'phone' => ['padding_top' => '12px'],
            'hover' => ['shadow' => 'md', 'opacity' => '0.9'],
        ], []);

        $this->assertSame(
            '.sf-page .fbe-b-b1{padding-top:24px}'
            .'.sf-page .fbe-b-b1:hover{box-shadow:var(--kit-shadow-md);opacity:0.9}'
            .'@media (max-width: 1024px){.sf-page .fbe-b-b1{padding-top:16px}}'
            .'@media (max-width: 767px){.sf-page .fbe-b-b1{padding-top:12px}}',
            $sheet->css(),
        );
    }

    public function test_a_colour_also_sets_the_word_colours_and_a_section_font_size_reaches_its_words(): void
    {
        $sheet = new StyleSheet;
        $sheet->section('s1', ['desktop' => ['color' => '#ffffff', 'font_size' => '1.25rem']], []);

        $this->assertSame(
            '.sf-page .fbe-s-s1{color:#ffffff;--sf-words:#ffffff;--sf-heading:#ffffff;font-size:1.25rem}'
            .'.sf-page .fbe-s-s1 .sf-rich{font-size:1.25rem}',
            $sheet->css(),
        );
    }

    public function test_hide_on_hides_the_element_at_those_widths(): void
    {
        $sheet = new StyleSheet;
        $sheet->section('s1', [], ['hide_on' => ['desktop', 'tablet', 'phone']]);

        $this->assertSame(
            '@media (min-width: 1025px){.sf-page .fbe-s-s1{display:none}}'
            .'@media (min-width: 768px) and (max-width: 1024px){.sf-page .fbe-s-s1{display:none}}'
            .'@media (max-width: 767px){.sf-page .fbe-s-s1{display:none}}',
            $sheet->css(),
        );
    }

    public function test_in_the_builder_an_element_hidden_on_a_device_is_dimmed_so_it_can_still_be_picked(): void
    {
        $sheet = new StyleSheet;
        $sheet->section('s1', [], ['hide_on' => ['phone']], forBuilder: true);

        $this->assertSame('@media (max-width: 767px){.sf-page .fbe-s-s1{opacity:.35;outline:2px dashed #94a3b8;outline-offset:-2px}}', $sheet->css());
    }

    public function test_custom_css_comes_last_with_selector_replaced(): void
    {
        $sheet = new StyleSheet;
        $sheet->section('s1', [], ['css' => 'selector .bn-button{letter-spacing:.1em}']);
        $sheet->block('b2', ['desktop' => ['color' => '#000']], ['css' => 'color: red']);

        $this->assertSame(
            '.sf-page .fbe-b-b2{color:#000;--sf-words:#000;--sf-heading:#000}'
            .'.sf-page .fbe-s-s1 .bn-button{letter-spacing:.1em}'
            .'.sf-page .fbe-b-b2{color: red}',
            $sheet->css(),
        );
    }

    public function test_the_values_are_cleaned_again_before_they_are_written(): void
    {
        $sheet = new StyleSheet;
        $sheet->section('s"1</style>', ['desktop' => ['color' => '#fff;}</style><script>', 'padding_top' => '4px']], ['css' => '</style><script>alert(1)</script>']);

        $this->assertSame('.sf-page .fbe-s-s1style{padding-top:4px}', $sheet->css());
    }

    public function test_the_html_is_one_style_tag_or_nothing(): void
    {
        $sheet = new StyleSheet;
        $this->assertSame('', $sheet->toHtml());
        $this->assertTrue($sheet->isEmpty());

        $sheet->section('a1', ['desktop' => ['opacity' => '0.5']], []);
        $this->assertSame('<style data-fbe-style>.sf-page .fbe-s-a1{opacity:0.5}</style>', $sheet->toHtml());
    }

    public function test_collect_puts_one_style_tag_before_the_html_of_the_outermost_draw(): void
    {
        $html = StyleSheet::collect(function (): string {
            StyleSheet::current()->section('a1', ['desktop' => ['opacity' => '0.5']], []);

            $inner = StyleSheet::collect(function (): string {
                StyleSheet::current()->block('b1', ['desktop' => ['opacity' => '0.25']], []);

                return '<p>inner</p>';
            });

            return '<section>'.$inner.'</section>';
        });

        $this->assertSame(
            '<style data-fbe-style>.sf-page .fbe-s-a1{opacity:0.5}.sf-page .fbe-b-b1{opacity:0.25}</style><section><p>inner</p></section>',
            $html,
        );
        $this->assertNull(StyleSheet::current());
    }

    public function test_collect_adds_nothing_when_no_rule_was_written(): void
    {
        $this->assertSame('<p>x</p>', StyleSheet::collect(fn (): string => '<p>x</p>'));
    }
}
