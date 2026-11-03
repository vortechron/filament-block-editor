<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class DynamicValuesTest extends TestCase
{
    private function values(): DynamicValues
    {
        return app(DynamicValues::class);
    }

    public function test_it_is_one_registry_for_the_app(): void
    {
        $this->assertSame($this->values(), app(DynamicValues::class));
    }

    public function test_definitions_list_each_value_with_its_current_value_as_the_preview(): void
    {
        $this->values()
            ->register('site.phone', 'Telefon', fn (): string => '012-345 6789')
            ->register('site.whatsapp', 'WhatsApp', fn (): string => 'https://wa.me/60123456789', 'link', 'Hubungan')
            ->register('site.broken', 'Rosak', fn () => throw new RuntimeException('no settings'));

        $this->assertSame([
            ['key' => 'site.phone', 'label' => 'Telefon', 'type' => 'text', 'group' => 'Site', 'preview' => '012-345 6789'],
            ['key' => 'site.whatsapp', 'label' => 'WhatsApp', 'type' => 'link', 'group' => 'Hubungan', 'preview' => 'https://wa.me/60123456789'],
            ['key' => 'site.broken', 'label' => 'Rosak', 'type' => 'text', 'group' => 'Site', 'preview' => null],
        ], $this->values()->definitions());
    }

    public function test_a_value_can_name_the_settings_group_it_comes_from(): void
    {
        $this->values()
            ->register('site.phone', 'Telefon', fn (): string => '012', settings: 'contact')
            ->register('page.title', 'Tajuk', fn (): string => 'Utama');

        $this->assertSame([
            ['key' => 'site.phone', 'label' => 'Telefon', 'type' => 'text', 'group' => 'Site', 'preview' => '012', 'settings' => 'contact'],
            ['key' => 'page.title', 'label' => 'Tajuk', 'type' => 'text', 'group' => 'Site', 'preview' => 'Utama'],
        ], $this->values()->definitions());
    }

    public function test_a_bad_key_or_type_is_refused_when_registered(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->values()->register('Site Phone', 'x', fn (): string => '');
    }

    public function test_a_bad_type_is_refused_when_registered(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->values()->register('site.phone', 'x', fn (): string => '', 'html');
    }

    public function test_resolve_reads_the_registry_and_the_context_values_win(): void
    {
        $this->values()->register('entry.title', 'Tajuk', fn (RenderContext $context): string => $context->forBuilder ? 'builder' : 'registry');

        $this->assertSame('registry', $this->values()->resolve('entry.title', new RenderContext));
        $this->assertSame('builder', $this->values()->resolve('entry.title', new RenderContext(forBuilder: true)));
        $this->assertSame('Kopi', $this->values()->resolve('entry.title', (new RenderContext)->withValues(['entry.title' => 'Kopi'])));
        $this->assertSame('12', $this->values()->resolve('entry.price', (new RenderContext)->withValues(['entry.price' => 12])));
    }

    public function test_an_empty_or_unknown_value_is_null(): void
    {
        $this->values()->register('site.email', 'E-mel', fn (): ?string => null)->register('site.note', 'Nota', fn (): string => '  ');

        $context = (new RenderContext)->withValues(['entry.tags' => ['a', 'b']]);

        $this->assertNull($this->values()->resolve('site.email', $context));
        $this->assertNull($this->values()->resolve('site.note', $context));
        $this->assertNull($this->values()->resolve('site.nothing', $context));
        $this->assertNull($this->values()->resolve('entry.tags', $context));
    }

    public function test_with_values_keeps_who_the_page_is_for_and_merges(): void
    {
        $context = (new RenderContext(forBuilder: true, isPreview: true, values: ['a.b' => '1']))->withValues(['c.d' => '2']);

        $this->assertTrue($context->forBuilder);
        $this->assertTrue($context->isPreview);
        $this->assertSame(['a.b' => '1', 'c.d' => '2'], $context->values);
    }

    /**
     * @return array<string, array{0: mixed, 1: string|null}>
     */
    public static function references(): array
    {
        return [
            'two parts' => ['@site.phone', '@site.phone'],
            'four parts' => ['@entry.photo.large.webp', '@entry.photo.large.webp'],
            'digits and underscores' => ['@site.social_2', '@site.social_2'],
            'one part' => ['@site', null],
            'five parts' => ['@a.b.c.d.e', null],
            'capitals' => ['@Site.phone', null],
            'no at sign' => ['site.phone', null],
            'markup' => ['@site.phone"><script>', null],
            'a web address' => ['https://example.com', null],
            'not a string' => [['@site.phone'], null],
        ];
    }

    #[DataProvider('references')]
    public function test_a_reference_is_an_at_sign_and_a_dotted_key(mixed $value, ?string $expected): void
    {
        $this->assertSame($expected, DynamicValues::reference($value));
    }

    public function test_the_document_keeps_dynamic_text_and_references_in_links_and_pictures(): void
    {
        $clean = BlockNoteDocument::clean([
            ['type' => 'paragraph', 'props' => [], 'content' => [
                ['type' => 'text', 'text' => 'Telefon: ', 'styles' => []],
                ['type' => 'dynamic', 'props' => ['key' => 'site.phone', 'evil' => '<b>'], 'content' => 'x'],
                ['type' => 'dynamic', 'props' => ['key' => 'Bad Key']],
                ['type' => 'dynamic'],
                ['type' => 'link', 'href' => '@site.whatsapp', 'content' => [['type' => 'text', 'text' => 'WhatsApp', 'styles' => []]]],
                ['type' => 'link', 'href' => '@bad', 'content' => [['type' => 'text', 'text' => 'Bad', 'styles' => []]]],
            ], 'children' => []],
            Blocks::button('Hubungi', '@site.whatsapp'),
            Blocks::image('@entry.photo'),
            Blocks::video('@entry.video'),
            ['type' => 'audio', 'props' => ['url' => '@entry.audio']],
        ]);

        $this->assertSame([
            ['type' => 'text', 'text' => 'Telefon: ', 'styles' => []],
            ['type' => 'dynamic', 'props' => ['key' => 'site.phone']],
            ['type' => 'link', 'href' => '@site.whatsapp', 'content' => [['type' => 'text', 'text' => 'WhatsApp', 'styles' => []]]],
            ['type' => 'text', 'text' => 'Bad', 'styles' => []],
        ], $clean[0]['content']);
        $this->assertSame('@site.whatsapp', $clean[1]['props']['url']);
        $this->assertSame('@entry.photo', $clean[2]['props']['url']);
        $this->assertSame('@entry.video', $clean[3]['props']['url']);
        $this->assertSame('', $clean[4]['props']['url']);
    }

    public function test_own_block_link_and_image_fields_keep_references(): void
    {
        $this->assertSame('@site.whatsapp', Field::link('link')->clean('@site.whatsapp'));
        $this->assertSame('@entry.photo', Field::image('photo')->clean('@entry.photo'));
        $this->assertNull(Field::link('link')->clean('@nope'));
        $this->assertSame('@site.name', Field::text('t')->clean('@site.name'));
    }
}
