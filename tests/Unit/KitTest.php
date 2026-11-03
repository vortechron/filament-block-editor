<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Illuminate\Support\Facades\Validator;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class KitTest extends TestCase
{
    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);
        $app['config']->set('filament-block-editor.fonts', [
            'inter' => ['label' => 'Inter', 'stack' => "'Inter', sans-serif", 'href' => 'https://fonts.bunny.net/css?family=inter'],
            'bad;font' => ['stack' => 'x'],
            'evil' => ['stack' => 'x; } body { display: none'],
            'serif' => ['stack' => 'Comic Sans MS'],
        ]);
    }

    public function test_the_package_defaults_are_todays_look(): void
    {
        $kit = Kit::defaults();

        $this->assertSame(1, $kit['version']);
        $this->assertSame('#2563eb', $kit['colors']['primary']);
        $this->assertSame('#0f172a', $kit['colors']['secondary']);
        $this->assertSame('#475569', $kit['colors']['text']);
        $this->assertSame(['heading' => 'theme', 'body' => 'theme'], $kit['fonts']);
        $this->assertSame('1.25rem', $kit['radius']);
        $this->assertSame([], $kit['custom_colors']);
        $this->assertSame(['style' => 'solid', 'radius' => '0.75rem', 'size' => 'md', 'text_transform' => 'none', 'font_weight' => '800'], $kit['buttons']);
        $this->assertSame(['style' => 'outline', 'radius' => '0.75rem', 'labels' => 'above'], $kit['forms']);
    }

    public function test_the_config_kit_is_merged_over_the_package_defaults_and_cleaned(): void
    {
        config()->set('filament-block-editor.kit', ['colors' => ['primary' => '#C59D6E', 'text' => 'brown'], 'radius' => '4px']);

        $kit = Kit::defaults();

        $this->assertSame('#c59d6e', $kit['colors']['primary']);
        $this->assertSame('#475569', $kit['colors']['text']);
        $this->assertSame('4px', $kit['radius']);
        $this->assertSame('#0f172a', $kit['colors']['secondary']);
    }

    public function test_normalize_keeps_good_values_and_puts_the_defaults_in_place_of_bad_ones(): void
    {
        $kit = Kit::normalize([
            'version' => 7,
            'colors' => ['primary' => '#111', 'accent' => '</style><script>', 'muted' => 'kit:primary', 'evil' => '#fff'],
            'custom_colors' => [
                ['key' => 'gold', 'label' => 'Emas', 'value' => '#C59D6E'],
                ['key' => 'gold', 'label' => 'Again', 'value' => '#000000'],
                ['key' => 'primary', 'label' => 'Clash', 'value' => '#000000'],
                ['key' => 'Bad Key', 'value' => '#000000'],
                ['key' => 'wa', 'value' => 'green'],
                ['key' => 'whatsapp', 'value' => '#25d366'],
            ],
            'fonts' => ['heading' => 'inter', 'body' => 'comic-sans'],
            'text' => ['base_size' => '18px', 'heading_weight' => '350'],
            'radius' => '9000px',
            'buttons' => ['style' => 'pill', 'radius' => 'round', 'size' => 'xl', 'text_transform' => 'uppercase', 'font_weight' => 600],
            'forms' => ['style' => 'underline', 'radius' => '0', 'labels' => 'floating'],
            'extra' => 'dropped',
        ]);

        $this->assertSame(1, $kit['version']);
        $this->assertSame('#111', $kit['colors']['primary']);
        $this->assertSame('#f59e0b', $kit['colors']['accent']);
        $this->assertSame('#64748b', $kit['colors']['muted']);
        $this->assertArrayNotHasKey('evil', $kit['colors']);
        $this->assertSame([
            ['key' => 'gold', 'label' => 'Emas', 'value' => '#c59d6e'],
            ['key' => 'whatsapp', 'label' => 'Whatsapp', 'value' => '#25d366'],
        ], $kit['custom_colors']);
        $this->assertSame(['heading' => 'inter', 'body' => 'theme'], $kit['fonts']);
        $this->assertSame(['base_size' => '18px', 'heading_weight' => '800'], $kit['text']);
        $this->assertSame('1.25rem', $kit['radius']);
        $this->assertSame(['style' => 'pill', 'radius' => '0.75rem', 'size' => 'md', 'text_transform' => 'uppercase', 'font_weight' => '600'], $kit['buttons']);
        $this->assertSame(['style' => 'underline', 'radius' => '0', 'labels' => 'above'], $kit['forms']);
        $this->assertArrayNotHasKey('extra', $kit);
    }

    public function test_at_most_twelve_custom_colours_are_kept(): void
    {
        $colors = array_map(fn (int $i): array => ['key' => "c{$i}", 'value' => '#000000'], range(1, 15));

        $this->assertCount(12, Kit::normalize(['custom_colors' => $colors])['custom_colors']);
    }

    public function test_the_css_of_the_default_kit_writes_the_kit_variables_and_changes_nothing_else(): void
    {
        $css = Kit::css(Kit::defaults());

        $this->assertStringStartsWith('.sf-page{', $css);
        $this->assertStringContainsString('--kit-color-primary:#2563eb;', $css);
        $this->assertStringContainsString('--kit-color-border:#e2e8f0;', $css);
        $this->assertStringContainsString('--kit-font-heading:var(--sf-heading-font);', $css);
        $this->assertStringContainsString('--kit-font-body:var(--sf-body-font);', $css);
        $this->assertStringContainsString('--kit-radius:1.25rem;', $css);
        $this->assertStringContainsString('--kit-shadow-md:', $css);
        $this->assertStringContainsString('--kit-button-radius:0.75rem;', $css);
        $this->assertStringContainsString('--kit-form-radius:0.75rem', $css);
        $this->assertStringNotContainsString('--sf-', str_replace(['var(--sf-heading-font)', 'var(--sf-body-font)'], '', $css));
        $this->assertStringNotContainsString('.bn-button', $css);
        $this->assertStringNotContainsString('.fbe-form', $css);
    }

    public function test_a_changed_kit_maps_the_old_variables_so_every_layout_follows_it(): void
    {
        $css = Kit::css(Kit::normalize([
            'colors' => ['primary' => '#fde047', 'secondary' => '#111111', 'text' => '#222222', 'background' => '#fffbeb', 'surface' => '#fef3c7', 'border' => '#cccccc'],
            'fonts' => ['heading' => 'serif', 'body' => 'inter'],
            'text' => ['heading_weight' => '600', 'base_size' => '18px'],
            'radius' => '4px',
        ]));

        foreach ([
            '--sf-accent:var(--kit-color-primary)',
            '--sf-accent-ink:#0f172a',
            '--sf-ink:var(--kit-color-secondary)',
            '--sf-text:var(--kit-color-text)',
            '--sf-surface:var(--kit-color-background)',
            '--sf-card:var(--kit-color-background)',
            '--sf-alt:var(--kit-color-surface)',
            '--sf-card-line:1px solid var(--kit-color-border)',
            "--kit-font-heading:var(--font-bodoni-moda, 'Bodoni Moda'), 'Didot', Georgia, serif",
            '--sf-heading-font:var(--kit-font-heading)',
            "--kit-font-body:'Inter', sans-serif",
            '--sf-body-font:var(--kit-font-body)',
            '--sf-heading-weight:var(--kit-heading-weight)',
            '--sf-radius:var(--kit-radius)',
            '.sf-page .sf-rich{font-size:var(--kit-text-base)}',
        ] as $expected) {
            $this->assertStringContainsString($expected, $css);
        }
    }

    public function test_a_dark_primary_colour_keeps_white_words_on_it(): void
    {
        $this->assertStringContainsString('--sf-accent-ink:#ffffff', Kit::css(Kit::normalize(['colors' => ['primary' => '#14532d']])));
    }

    public function test_changed_buttons_and_forms_get_their_rules(): void
    {
        $css = Kit::css(Kit::normalize([
            'buttons' => ['style' => 'outline', 'radius' => '0', 'size' => 'lg', 'text_transform' => 'uppercase', 'font_weight' => '600'],
            'forms' => ['style' => 'underline', 'labels' => 'hidden'],
        ]));

        $this->assertStringContainsString('.sf-page .bn-button{border-radius:var(--kit-button-radius);font-weight:var(--kit-button-weight);text-transform:var(--kit-button-transform);min-height:3.75rem;padding:.95rem 2.25rem;font-size:1.1875rem}', $css);
        $this->assertStringContainsString('.sf-page .bn-button-solid{border-color:currentColor;background:transparent;box-shadow:none;color:var(--sf-heading, var(--sf-ink))}', $css);
        $this->assertStringContainsString('.sf-page .fbe-form .fbe-input{border-width:0 0 2px;border-radius:0;background:transparent;padding-inline:0}', $css);
        $this->assertStringContainsString('.sf-page .fbe-form .fbe-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}', $css);
    }

    public function test_custom_colours_become_kit_variables(): void
    {
        $css = Kit::css(Kit::normalize(['custom_colors' => [['key' => 'gold', 'value' => '#c59d6e']]]));

        $this->assertStringContainsString('--kit-color-gold:#c59d6e;', $css);
    }

    public function test_the_css_cleans_the_kit_first_so_nothing_can_break_out_of_the_style_tag(): void
    {
        $css = Kit::css(['colors' => ['primary' => '#fff;}</style><script>alert(1)</script>'], 'custom_colors' => [['key' => 'x', 'value' => '</style>']], 'radius' => '1px}</style>']);

        $this->assertStringNotContainsString('<', $css);
        $this->assertStringContainsString('--kit-color-primary:#2563eb;', $css);
    }

    public function test_fonts_lists_the_section_fonts_and_the_valid_host_fonts(): void
    {
        $fonts = Kit::fonts();

        $this->assertSame(['grotesk', 'condensed', 'serif', 'poster', 'geometric', 'mono', 'inter'], array_keys($fonts));
        $this->assertSame(['label' => 'Inter', 'stack' => "'Inter', sans-serif", 'href' => 'https://fonts.bunny.net/css?family=inter'], $fonts['inter']);
        $this->assertSame('Luxury', $fonts['serif']['label']);
        $this->assertNull($fonts['serif']['href']);
    }

    public function test_the_rules_guard_the_outer_shape_of_a_kit(): void
    {
        $this->assertTrue(Validator::make(['kit' => Kit::defaults()], Kit::rules())->passes());
        $this->assertTrue(Validator::make(['kit' => 'blue'], Kit::rules())->fails());
        $this->assertTrue(Validator::make(['kit' => ['custom_colors' => array_fill(0, 13, [])]], Kit::rules())->fails());
        $this->assertTrue(Validator::make(['kit' => ['colors' => 'red']], Kit::rules())->fails());
    }
}
