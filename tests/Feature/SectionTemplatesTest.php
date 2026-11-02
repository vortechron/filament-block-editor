<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Templates\SectionTemplates;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class SectionTemplatesTest extends TestCase
{
    use BlockHelpers;

    protected function tearDown(): void
    {
        SectionTemplates::flushRegistered();

        parent::tearDown();
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function locales(): array
    {
        return ['Malay' => ['ms'], 'English' => ['en']];
    }

    #[DataProvider('locales')]
    public function test_every_template_has_a_key_a_label_a_category_and_a_valid_section(string $locale): void
    {
        $templates = SectionTemplates::all($locale);

        $this->assertGreaterThanOrEqual(20, count($templates));
        $this->assertSame(array_unique(array_column($templates, 'key')), array_column($templates, 'key'));

        foreach ($templates as $template) {
            $this->assertNotSame('', $template['label'], $template['key']);
            $this->assertNotSame('', $template['category'], $template['key']);
            $this->assertSame('rich', $template['section']['type'], $template['key']);
            $this->assertSame(
                [$template['section']],
                PageContent::normalize([$template['section']]),
                "The [{$template['key']}] template is not a section normalize() leaves alone.",
            );
        }
    }

    #[DataProvider('locales')]
    public function test_the_templates_cover_every_layout(string $locale): void
    {
        $layouts = array_unique(array_map(fn (array $template): string => $template['section']['data']['layout'], SectionTemplates::all($locale)));

        foreach (SectionLayout::cases() as $layout) {
            $this->assertContains($layout->value, $layouts, "No template uses the [{$layout->value}] layout.");
        }
    }

    public function test_it_has_a_section_for_every_main_job(): void
    {
        $keys = array_column(SectionTemplates::all('en'), 'key');

        foreach (['hero', 'feature', 'cover', 'testimonials', 'stats', 'compare', 'steps', 'faq', 'contact', 'cta', 'text', 'blank'] as $key) {
            $this->assertContains($key, $keys);
        }
    }

    public function test_both_languages_offer_the_same_templates_with_their_own_words(): void
    {
        $malay = SectionTemplates::all('ms');
        $english = SectionTemplates::all('en');

        $this->assertSame(array_column($english, 'key'), array_column($malay, 'key'));
        $this->assertSame('Hero', $english[0]['label']);
        $this->assertStringContainsString('apa yang anda buat', BlockNoteDocument::text($malay[0]['section']['data']['document']));
        $this->assertStringContainsString('what you do', BlockNoteDocument::text($english[0]['section']['data']['document']));
        $this->assertSame('Skrin pertama', $malay[0]['category']);
        $this->assertSame('First screen', $english[0]['category']);
    }

    public function test_a_language_it_does_not_know_is_english(): void
    {
        $this->assertSame(SectionTemplates::all('en')[0]['label'], SectionTemplates::all('fr')[0]['label']);
    }

    #[DataProvider('locales')]
    public function test_the_copy_has_no_selling_words(string $locale): void
    {
        $text = collect(SectionTemplates::all($locale))
            ->flatMap(fn (array $template): array => [$template['label'], $template['category'], $template['description'], BlockNoteDocument::text($template['section']['data']['document'])])
            ->implode("\n");

        $this->assertDoesNotMatchRegularExpression(
            '/\b(order|orders|price|prices|pricing|buy|buyer|buyers|purchase|product|products|shop|checkout|sale|sell|seller|discount|cart|harga|beli|pembeli|produk|pesan|pesanan|jual|penjual|tempah|diskaun|troli)\b/iu',
            $text,
        );
    }

    public function test_the_templates_use_the_new_blocks_and_none_of_the_removed_ones(): void
    {
        $types = [];
        $walk = function (array $blocks) use (&$walk, &$types): void {
            foreach ($blocks as $block) {
                $types[] = $block['type'];
                $walk($block['children'] ?? []);
            }
        };

        foreach (SectionTemplates::all('en') as $template) {
            $walk($template['section']['data']['document']);
        }

        $this->assertContains(Blocks::BUTTON, $types);
        $this->assertContains(Blocks::GALLERY, $types);
        $this->assertSame([], array_intersect($types, ['orderButton', 'priceTag', 'countdown', 'enquiryForm']));
    }

    #[DataProvider('locales')]
    public function test_every_template_draws_for_visitors_and_in_the_builder(string $locale): void
    {
        $renderer = app(PageRenderer::class);

        foreach (SectionTemplates::all($locale) as $template) {
            $visitor = $renderer->render([$template['section']], new RenderContext);
            $builder = $renderer->render([$template['section']], new RenderContext(forBuilder: true, isPreview: true));

            $this->assertStringContainsString('data-block-id', $visitor, $template['key']);

            if ($template['key'] !== 'blank') {
                $this->assertStringContainsString('<section', $visitor, $template['key']);
                $this->assertStringContainsString('sf-layout-'.$template['section']['data']['layout'], $visitor, $template['key']);
            }
        }
    }

    public function test_a_template_that_has_a_photo_spot_shows_it_to_the_builder_and_not_to_visitors(): void
    {
        app()->setLocale('en');
        $hero = collect(SectionTemplates::all('en'))->firstWhere('key', 'hero');

        $builder = app(PageRenderer::class)->render([$hero['section']], new RenderContext(forBuilder: true));
        $visitor = app(PageRenderer::class)->render([$hero['section']], new RenderContext);

        $this->assertStringContainsString('data-empty-media="photo"', $builder);
        $this->assertStringContainsString('sf-hero-split', $builder);
        $this->assertStringNotContainsString('data-empty-media', $visitor);
        $this->assertStringNotContainsString('sf-hero-split', $visitor);
    }

    public function test_each_call_gives_sections_new_ids(): void
    {
        $this->assertNotSame(SectionTemplates::all('en')[0]['section']['id'], SectionTemplates::all('en')[0]['section']['id']);
    }

    public function test_a_host_can_register_its_own_template(): void
    {
        SectionTemplates::register('menu-board', 'Menu board', 'Our sections', [
            'type' => 'rich',
            'data' => ['document' => [Blocks::ownBlock('menu-board', ['heading' => 'Menu'])], 'layout' => 'plain', 'width' => 'full', 'padding' => 'none'],
        ], 'The menu from the Menu screen.');

        $template = collect(SectionTemplates::all('en'))->firstWhere('key', 'menu-board');

        $this->assertSame('Menu board', $template['label']);
        $this->assertSame('Our sections', $template['category']);
        $this->assertSame('The menu from the Menu screen.', $template['description']);
        $this->assertSame('full', $template['section']['data']['width']);
        $this->assertSame([$template['section']], PageContent::normalize([$template['section']]));
        $this->assertSame('menu-board', collect(SectionTemplates::all('ms'))->last()['key']);
    }

    public function test_a_registered_template_can_be_made_per_language(): void
    {
        SectionTemplates::register('hello', 'Hello', 'Ours', fn (string $locale): array => [
            'type' => 'rich',
            'data' => ['document' => [Blocks::paragraph($locale === 'ms' ? 'Salam' : 'Hi')]],
        ]);

        $this->assertSame('Salam', BlockNoteDocument::text(collect(SectionTemplates::all('ms'))->firstWhere('key', 'hello')['section']['data']['document']));
        $this->assertSame('Hi', BlockNoteDocument::text(collect(SectionTemplates::all('en'))->firstWhere('key', 'hello')['section']['data']['document']));
    }

    public function test_registering_a_key_again_replaces_it_and_a_built_in_key_can_be_replaced(): void
    {
        SectionTemplates::register('hero', 'My hero', 'Ours', ['type' => 'rich', 'data' => ['document' => [Blocks::paragraph('Mine')]]]);
        SectionTemplates::register('hero', 'My hero 2', 'Ours', ['type' => 'rich', 'data' => ['document' => [Blocks::paragraph('Mine 2')]]]);

        $heroes = array_values(array_filter(SectionTemplates::all('en'), fn (array $template): bool => $template['key'] === 'hero'));

        $this->assertCount(1, $heroes);
        $this->assertSame('My hero 2', $heroes[0]['label']);
    }

    public function test_it_refuses_a_template_that_is_not_a_section(): void
    {
        $this->expectException(InvalidArgumentException::class);

        SectionTemplates::register('bad', 'Bad', 'Ours', ['type' => 'script', 'data' => []]);
    }

    public function test_the_list_is_json_ready(): void
    {
        $this->assertJson(json_encode(SectionTemplates::all('ms'), JSON_THROW_ON_ERROR));
    }
}
