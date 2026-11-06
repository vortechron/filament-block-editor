<?php

namespace Vortechron\FilamentBlockEditor\Tests\Filament;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Content\TextTranslations;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;
use Workbench\App\Filament\Pages\DemoBuilder;

class PageBuilderPageTest extends FilamentTestCase
{
    public function test_the_builder_page_loads_the_builder_full_screen(): void
    {
        $this->signIn();

        $this->get(DemoBuilder::getUrl())
            ->assertOk()
            ->assertSee('page-builder.js', false)
            ->assertSee('page-builder.css', false)
            ->assertSee('mountPageBuilder', false)
            ->assertDontSee('fi-sidebar', false);
    }

    public function test_the_builder_gets_the_page_own_blocks_and_templates(): void
    {
        $this->signIn();

        $options = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();

        $this->assertSame('ms', $options['locale']);
        $this->assertSame('ms', $options['contentLocale']);
        $this->assertSame('Demo page', $options['title']);
        $this->assertNotEmpty($options['value']['sections']);
        $this->assertContains('notice', array_column($options['blocks'], 'kind'));
        $this->assertNotEmpty($options['templates']);
        $this->assertSame(url('/admin'), $options['backUrl']);
        $this->assertArrayNotHasKey('viewUrl', $options);
    }

    public function test_an_english_panel_for_a_malay_site_gets_english_words_and_malay_sections(): void
    {
        $this->signIn();
        app()->setLocale('en');
        config(['filament-block-editor.content_locale' => 'ms']);

        $options = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();
        $hero = collect($options['templates'])->firstWhere('key', 'hero');

        $this->assertSame('en', $options['locale']);
        $this->assertSame('ms', $options['contentLocale']);
        $this->assertSame('Hero', $hero['label']);
        $this->assertStringContainsString('Hubungi kami', json_encode($hero['section']));
    }

    public function test_document_language_controls_lazy_custom_defaults_without_changing_panel_labels(): void
    {
        $this->signIn();
        app()->setLocale('en');
        config(['filament-block-editor.content_locale' => 'ms']);
        app(BlockRegistry::class)->register(OwnBlock::make('translated-notice')->fields([
            Field::text('heading')->label('Heading')->default(fn (): string => ContentLocale::site() === 'ms' ? 'Selamat datang' : 'Welcome'),
        ]));
        DemoBuilder::$contentLocale = 'en';
        $english = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();
        $definition = collect($english['blocks'])->firstWhere('kind', 'translated-notice');

        $this->assertSame('en', $english['contentLocale']);
        $this->assertSame('Heading', $definition['fields'][0]['label']);
        $this->assertSame('Welcome', $definition['defaults']['heading']);

        DemoBuilder::$contentLocale = 'ms';
        $malay = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();
        $definition = collect($malay['blocks'])->firstWhere('kind', 'translated-notice');

        $this->assertSame('Heading', $definition['fields'][0]['label']);
        $this->assertSame('Selamat datang', $definition['defaults']['heading']);
        $this->assertSame('en', app()->getLocale());
    }

    public function test_core_defaults_and_templates_follow_the_selected_document_with_english_panel_labels(): void
    {
        $this->signIn();
        app()->setLocale('en');
        config(['filament-block-editor.content_locale' => 'ms']);
        // Boot the shared registry before choosing either document.
        app(BlockRegistry::class)->definitions();

        DemoBuilder::$contentLocale = 'ms';
        $malay = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();
        $faq = collect($malay['blocks'])->firstWhere('kind', 'fbe-faq');
        $this->assertSame('Heading', $faq['fields'][0]['label']);
        $this->assertSame('Soalan lazim', $faq['defaults']['heading']);
        $this->assertStringContainsString('Hubungi kami', json_encode(collect($malay['templates'])->firstWhere('key', 'hero')['section']));

        DemoBuilder::$contentLocale = 'en';
        $english = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();
        $faq = collect($english['blocks'])->firstWhere('kind', 'fbe-faq');
        $this->assertSame('Heading', $faq['fields'][0]['label']);
        $this->assertSame('Frequently asked questions', $faq['defaults']['heading']);
        $this->assertStringContainsString('Get in touch', json_encode(collect($english['templates'])->firstWhere('key', 'hero')['section']));
    }

    public function test_preview_uses_the_document_language_and_restores_the_site_and_panel(): void
    {
        $this->signIn();
        app()->setLocale('en');
        config(['filament-block-editor.content_locale' => 'ms']);
        DemoBuilder::$contentLocale = 'en';
        $value = ['sections' => [['id' => 'form1', 'type' => 'rich', 'data' => ['document' => [
            ['type' => 'form', 'props' => ['form' => '{"fields":[],"submit":{"text":""}}']],
        ]]]]];

        $html = Livewire::test(DemoBuilder::class)->call('previewPageBuilder', $value)->effects['returns'][0];

        $this->assertStringContainsString('>Send</button>', $html);
        $this->assertStringNotContainsString('>Hantar</button>', $html);
        $this->assertStringContainsString('This form is not connected yet', $html);
        $this->assertSame('ms', ContentLocale::site());
        $this->assertSame('en', app()->getLocale());
    }

    public function test_save_normalizes_missing_custom_block_values_in_the_documents_language(): void
    {
        $this->signIn();
        app()->setLocale('en');
        config(['filament-block-editor.content_locale' => 'ms']);
        DemoBuilder::$contentLocale = 'en';
        app(BlockRegistry::class)->register(OwnBlock::make('translated-notice')->fields([
            Field::text('heading')->default(fn (): string => ContentLocale::site() === 'en' ? 'Welcome' : 'Selamat datang'),
        ]));
        $value = ['sections' => [['id' => 'notice1', 'type' => 'rich', 'data' => ['document' => [
            ['type' => 'ownBlock', 'props' => ['kind' => 'translated-notice', 'values' => '{}']],
        ]]]]];

        Livewire::test(DemoBuilder::class)->call('savePageBuilder', $value)->assertReturned(['ok' => true]);

        $saved = DemoBuilder::$saved['sections'][0]['data']['document'][0]['props']['values'];
        $this->assertSame('Welcome', json_decode($saved, true)['heading']);
        $this->assertSame('ms', ContentLocale::site());
    }

    public function test_saving_cleans_the_sections_and_hands_them_to_the_page(): void
    {
        $this->signIn();
        $section = ['id' => 'abc12345', 'type' => 'rich', 'data' => ['document' => [], 'padding' => 'nonsense', 'extra' => 'dropped']];

        Livewire::test(DemoBuilder::class)
            ->call('savePageBuilder', ['sections' => [$section]])
            ->assertReturned(['ok' => true]);

        $this->assertSame(PageContent::normalize([$section]), DemoBuilder::$saved['sections']);
        $this->assertSame('md', DemoBuilder::$saved['sections'][0]['data']['padding']);
        $this->assertArrayNotHasKey('extra', DemoBuilder::$saved['sections'][0]['data']);
    }

    /**
     * @return array<string, mixed>
     */
    private function storedWithDeveloperData(): array
    {
        return ['version' => 2, 'sections' => [
            ['id' => 'lockme', 'type' => 'rich', 'lock' => ['move' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { color: red; }']]],
            ['id' => 'other1', 'type' => 'rich', 'data' => ['document' => []]],
        ]];
    }

    public function test_a_non_developer_save_keeps_the_stored_locks_and_custom_css(): void
    {
        $this->signIn();
        DemoBuilder::$saved = $this->storedWithDeveloperData();

        Livewire::test(DemoBuilder::class)
            ->call('savePageBuilder', ['version' => 2, 'sections' => [
                ['id' => 'other1', 'type' => 'rich', 'lock' => ['remove' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { display: none; }']]],
                ['id' => 'lockme', 'type' => 'rich', 'data' => ['document' => []]],
                ['id' => 'added1', 'type' => 'rich', 'lock' => ['content' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { display: none; }']]],
            ]])
            ->assertReturned(['ok' => true]);

        [$locked, $other, $added] = DemoBuilder::$saved['sections'];

        $this->assertSame(2, DemoBuilder::$saved['version']);
        $this->assertSame(['lockme', 'other1', 'added1'], array_column(DemoBuilder::$saved['sections'], 'id'));
        $this->assertSame(['move' => true], $locked['lock']);
        $this->assertSame(['css' => 'selector { color: red; }'], $locked['data']['advanced']);
        $this->assertArrayNotHasKey('lock', $other);
        $this->assertArrayNotHasKey('advanced', $other['data']);
        $this->assertArrayNotHasKey('lock', $added);
        $this->assertArrayNotHasKey('advanced', $added['data']);
    }

    public function test_a_developer_save_keeps_the_new_locks_and_custom_css(): void
    {
        $this->signIn();
        DemoBuilder::$saved = $this->storedWithDeveloperData();
        DemoBuilder::$developer = true;

        Livewire::test(DemoBuilder::class)
            ->call('savePageBuilder', ['version' => 2, 'sections' => [
                ['id' => 'added1', 'type' => 'rich', 'lock' => ['content' => true], 'data' => ['document' => [], 'advanced' => ['css' => 'selector { display: none; }']]],
            ]])
            ->assertReturned(['ok' => true]);

        $this->assertSame(['content' => true], DemoBuilder::$saved['sections'][0]['lock']);
        $this->assertSame(['css' => 'selector { display: none; }'], DemoBuilder::$saved['sections'][0]['data']['advanced']);
    }

    public function test_saving_too_many_sections_is_refused_with_a_reason(): void
    {
        $this->signIn();
        $sections = array_fill(0, PageContent::MAX_SECTIONS + 1, ['type' => 'rich', 'data' => []]);

        $component = Livewire::test(DemoBuilder::class)->call('savePageBuilder', ['sections' => $sections]);

        $this->assertFalse($component->effects['returns'][0]['ok']);
        $this->assertArrayHasKey('sections', $component->effects['returns'][0]['errors']);
        $this->assertNull(DemoBuilder::$saved);
    }

    public function test_the_preview_is_the_page_drawn_for_the_builder(): void
    {
        $this->signIn();
        $section = ['id' => 'prev1234', 'type' => 'rich', 'data' => ['document' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hello builder', 'styles' => []]]]]]];

        $html = Livewire::test(DemoBuilder::class)->call('previewPageBuilder', ['sections' => [$section]])->effects['returns'][0];

        $this->assertStringContainsString('data-block-id="prev1234"', $html);
        $this->assertStringContainsString('Hello builder', $html);
    }

    public function test_an_uploaded_photo_is_stored_and_its_address_returned(): void
    {
        Storage::fake('public');
        $this->signIn();

        $component = Livewire::test(DemoBuilder::class)
            ->set('pageBuilderUpload', UploadedFile::fake()->image('kedai.jpg', 400, 300))
            ->call('storePageBuilderUpload', 'image');

        $result = $component->effects['returns'][0];
        $this->assertSame('kedai.jpg', $result['name']);
        $this->assertStringStartsWith('/storage/block-editor/', $result['url']);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $result['url']));
    }

    public function test_an_svg_cannot_be_uploaded_as_a_photo(): void
    {
        Storage::fake('public');
        $this->signIn();

        Livewire::test(DemoBuilder::class)
            ->set('pageBuilderUpload', UploadedFile::fake()->createWithContent('x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))
            ->call('storePageBuilderUpload', 'image')
            ->assertHasErrors(['pageBuilderUpload']);
    }

    public function test_every_builder_call_checks_access_first(): void
    {
        $this->signIn();
        $component = Livewire::test(DemoBuilder::class);
        DemoBuilder::$denied = true;

        $component->call('savePageBuilder', ['sections' => []])->assertForbidden();
        $this->assertNull(DemoBuilder::$saved);

        DemoBuilder::$denied = false;
    }

    public function test_a_client_can_save_other_words_while_a_translated_block_definition_is_missing(): void
    {
        $this->signIn();
        $registry = app(BlockRegistry::class);
        $definition = $registry->get('fbe-faq');
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'h', 'type' => 'heading', 'content' => [['type' => 'text', 'text' => 'Selamat', 'styles' => []]]],
            ['id' => 'faq', 'type' => 'ownBlock', 'props' => ['kind' => 'fbe-faq', 'values' => '{"heading":"Soalan Melayu","items":[{"_id":"q1","question":"Boleh?","answer":"Boleh."}],"open_first":true}']],
        ]]]]]);
        $english = $base;
        $english['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Welcome';
        $english['sections'][0]['data']['document'][1]['props']['values'] = '{"heading":"Questions","items":[{"_id":"q1","question":"Can I?","answer":"Yes."}],"open_first":true}';
        $stored = PageValue::normalize([...$base, 'translations' => ['en' => TextTranslations::extract($base, $english)]]);
        $english['sections'][0]['data']['document'][0]['content'][0]['text'] = 'New welcome';
        $newHeading = TextTranslations::extract($base, $english)['block:h/rich'];
        DemoBuilder::$saved = $stored;
        $registry->forget('fbe-faq');
        try {
            $component = Livewire::test(DemoBuilder::class);
            $loaded = $component->instance()->getPageBuilderOptions()['value'];
            $draft = $loaded;
            $draft['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Selamat baharu';
            $draft['sections'][0]['data']['document'][1]['props']['values'] = '{"heading":"Injected base","extra":"not permitted"}';
            $draft['translations']['en'] = ['block:h/rich' => $newHeading, 'block:faq/values/heading' => 'Injected English', 'block:faq/values/privileged' => 'Injected extra'];
            $result = $component->call('savePageBuilder', $draft)->effects['returns'][0];
            $this->assertTrue($result['ok'], json_encode($result));
            $saved = DemoBuilder::$saved;
            $this->assertSame($stored['translations']['en']['block:faq/values/heading'], $loaded['translations']['en']['block:faq/values/heading']);
            $this->assertSame($stored['sections'][0]['data']['document'][1], $saved['sections'][0]['data']['document'][1]);
            $this->assertSame('Selamat baharu', $saved['sections'][0]['data']['document'][0]['content'][0]['text']);
            foreach ($stored['translations']['en'] as $key => $text) {
                if (str_starts_with($key, 'block:faq/')) {
                    $this->assertSame($text, $saved['translations']['en'][$key]);
                }
            }
            $this->assertArrayNotHasKey('block:faq/values/privileged', $saved['translations']['en']);
        } finally {
            $registry->register($definition);
        }
        $resolved = TextTranslations::apply($saved, $saved['translations']['en']);
        $this->assertSame('New welcome', $resolved['sections'][0]['data']['document'][0]['content'][0]['text']);
        $faq = json_decode($resolved['sections'][0]['data']['document'][1]['props']['values'], true);
        $this->assertSame('Questions', $faq['heading']);
        $this->assertSame('Can I?', $faq['items'][0]['question']);
        $this->assertSame('Yes.', $faq['items'][0]['answer']);
    }

    public function test_a_missing_definition_does_not_relax_locked_or_developer_word_guards(): void
    {
        $this->signIn();
        $registry = app(BlockRegistry::class);
        $definition = $registry->get('fbe-faq');
        $registry->register(OwnBlock::make('private-words')->fields([Field::text('public'), Field::text('private')->developerOnly()]));
        $base = TextTranslations::ensureIds(['sections' => [
            ['id' => 's', 'type' => 'rich', 'data' => ['document' => [
                ['id' => 'private', 'type' => 'ownBlock', 'props' => ['kind' => 'private-words', 'values' => '{"public":"Awam","private":"Dalaman"}']],
                ['id' => 'faq', 'type' => 'ownBlock', 'props' => ['kind' => 'fbe-faq', 'values' => '{"heading":"Soalan Melayu","items":[]}']],
            ]]],
            ['id' => 'locked', 'type' => 'rich', 'lock' => ['content' => true], 'data' => ['document' => [
                ['id' => 'locked-heading', 'type' => 'heading', 'content' => [['type' => 'text', 'text' => 'Dikunci', 'styles' => []]]],
            ]]],
        ]]);
        $english = $base;
        $english['sections'][0]['data']['document'][0]['props']['values'] = '{"public":"Public","private":"Internal"}';
        $english['sections'][0]['data']['document'][1]['props']['values'] = '{"heading":"Questions","items":[]}';
        $english['sections'][1]['data']['document'][0]['content'][0]['text'] = 'Locked';
        $stored = PageValue::normalize([...$base, 'translations' => ['en' => TextTranslations::extract($base, $english)]]);
        $english['sections'][0]['data']['document'][0]['props']['values'] = '{"public":"New public","private":"Injected English"}';
        $english['sections'][1]['data']['document'][0]['content'][0]['text'] = 'Injected locked English';
        $posted = [...$base, 'translations' => ['en' => TextTranslations::extract($base, $english)]];
        $posted['sections'][0]['data']['document'][0]['props']['values'] = '{"public":"Awam baharu","private":"Injected base"}';
        $posted['sections'][1]['data']['document'][0]['content'][0]['text'] = 'Injected locked base';
        unset($posted['sections'][1]['lock']);
        DemoBuilder::$saved = $stored;
        $registry->forget('fbe-faq');
        try {
            $result = Livewire::test(DemoBuilder::class)->call('savePageBuilder', $posted)->effects['returns'][0];
            $this->assertTrue($result['ok'], json_encode($result));
            $saved = DemoBuilder::$saved;
            $values = json_decode($saved['sections'][0]['data']['document'][0]['props']['values'], true);
            $this->assertSame('Awam baharu', $values['public']);
            $this->assertSame('Dalaman', $values['private']);
            $this->assertSame('New public', $saved['translations']['en']['block:private/values/public']);
            $this->assertSame('Internal', $saved['translations']['en']['block:private/values/private']);
            $this->assertSame($stored['sections'][1], $saved['sections'][1]);
            $this->assertSame($stored['translations']['en']['block:locked-heading/rich'], $saved['translations']['en']['block:locked-heading/rich']);
            $this->assertSame($stored['translations']['en']['block:faq/values/heading'], $saved['translations']['en']['block:faq/values/heading']);
        } finally {
            $registry->register($definition);
        }
    }

    public function test_invalid_rich_words_refuse_the_save_with_a_useful_error(): void
    {
        $this->signIn();
        app()->setLocale('en');
        $value = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', 'type' => 'paragraph', 'content' => []],
        ]]]], 'translations' => ['en' => ['block:p/rich' => 'not JSON']]];
        $result = Livewire::test(DemoBuilder::class)->call('savePageBuilder', $value)->effects['returns'][0];
        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('Rich words', $result['errors']['value']);
        $this->assertNull(DemoBuilder::$saved);
    }

    public function test_malformed_web_links_refuse_the_public_rich_save(): void
    {
        $this->signIn();
        app()->setLocale('en');
        $value = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', 'type' => 'paragraph', 'content' => []],
        ]]]], 'translations' => ['en' => ['block:p/rich' => json_encode(['version' => 1, 'content' => [
            ['type' => 'link', 'href' => 'https:///en/stationery?source=field-qa#items', 'content' => [
                ['type' => 'text', 'text' => 'Send', 'styles' => (object) []],
            ]],
        ]])]]];
        $result = Livewire::test(DemoBuilder::class)->call('savePageBuilder', $value)->effects['returns'][0];
        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('link is unsafe or invalid', $result['errors']['value']);
        $this->assertNull(DemoBuilder::$saved);
    }

    public function test_rich_save_errors_use_malay_panel_words_even_for_english_content(): void
    {
        $this->signIn();
        app()->setLocale('ms');
        DemoBuilder::$contentLocale = 'en';
        $value = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', 'type' => 'paragraph', 'content' => []],
        ]]]], 'translations' => ['en' => ['block:p/rich' => 'not JSON']]];
        $result = Livewire::test(DemoBuilder::class)->call('savePageBuilder', $value)->effects['returns'][0];
        $this->assertFalse($result['ok']);
        $this->assertSame('Teks berformat bukan JSON yang sah. Muat semula ruangan dan cuba lagi.', $result['errors']['value']);
        $this->assertNull(DemoBuilder::$saved);
    }
}
