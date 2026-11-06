<?php

namespace Vortechron\FilamentBlockEditor\Tests\Filament;

use Livewire\Livewire;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Design\KitSource;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Workbench\App\Filament\Pages\DemoBuilder;
use Workbench\App\Filament\Pages\FullDemoBuilder;

class PageBuilderHooksTest extends FilamentTestCase
{
    public function test_a_host_that_overrides_no_hook_gets_safe_defaults(): void
    {
        $this->signIn();
        app(DynamicValues::class)->register('site.phone', 'Telefon', fn (): string => '012');

        $page = Livewire::test(DemoBuilder::class)->instance();
        $options = $page->getPageBuilderOptions();

        $this->assertSame(2, $options['value']['version']);
        $this->assertFalse($options['developer']);
        // The kit and its defaults always go, for the colour and font pickers.
        $this->assertSame(Kit::defaults(), $options['kit']);
        $this->assertSame(Kit::defaults(), $options['kitDefaults']);
        $this->assertArrayNotHasKey('siteInfo', $options);
        $this->assertArrayNotHasKey('pages', $options);
        $this->assertArrayNotHasKey('pageMenu', $options);
        $this->assertSame([], $options['syncedSections']);
        $this->assertSame([], $options['parts']);
        $this->assertSame('page', $options['kind']);
        $this->assertContains('serif', array_column($options['fonts'], 'value'));
        $this->assertSame(['key' => 'site.phone', 'label' => 'Telefon', 'type' => 'text', 'group' => 'Site', 'preview' => '012'], $options['dynamicValues'][0]);
        $this->assertSame(['saveKit' => false, 'saveSection' => false, 'saveSiteInfo' => false], $page->getPageBuilderSupports());
    }

    public function test_the_kit_defaults_hold_the_hosts_config(): void
    {
        $this->signIn();
        config()->set('filament-block-editor.kit', ['colors' => ['primary' => '#c59d6e'], 'radius' => '8px']);

        $options = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();

        $this->assertSame('#c59d6e', $options['kitDefaults']['colors']['primary']);
        $this->assertSame('8px', $options['kitDefaults']['radius']);
        $this->assertSame('#475569', $options['kitDefaults']['colors']['text']);
        $this->assertSame($options['kitDefaults'], $options['kit']);
    }

    public function test_the_hosts_own_dynamic_values_join_the_registered_ones_and_win_on_the_same_key(): void
    {
        $this->signIn();
        app(DynamicValues::class)
            ->register('site.phone', 'Telefon', fn (): string => '012')
            ->register('site.email', 'Emel', fn (): string => 'a@b.c', settings: 'contact');

        $values = Livewire::test(FullDemoBuilder::class)->instance()->getPageBuilderOptions()['dynamicValues'];

        $this->assertSame([
            ['key' => 'site.email', 'label' => 'Emel', 'type' => 'text', 'group' => 'Site', 'preview' => 'a@b.c', 'settings' => 'contact'],
            ['key' => 'page.title', 'label' => 'Tajuk halaman', 'type' => 'text', 'group' => 'Halaman', 'preview' => 'Laman Utama'],
            ['key' => 'site.phone', 'label' => 'Nombor kedai', 'type' => 'text', 'group' => 'Site', 'preview' => '019', 'settings' => 'contact'],
        ], $values);
    }

    public function test_the_preview_draws_with_the_hosts_render_values_and_then_forgets_them(): void
    {
        $this->signIn();
        app(DynamicValues::class)->register('page.title', 'Tajuk', fn (): ?string => null);
        $document = [['type' => 'paragraph', 'content' => [['type' => 'dynamic', 'props' => ['key' => 'page.title']]]]];

        $html = Livewire::test(FullDemoBuilder::class)
            ->call('previewPageBuilder', ['version' => 2, 'sections' => [['id' => 'p1', 'type' => 'rich', 'data' => ['document' => $document]]]])
            ->effects['returns'][0];

        $this->assertStringContainsString('Laman Utama', $html);
        $this->assertNull(app(DynamicValues::class)->resolve('page.title', new RenderContext));
        $this->assertSame(['page.title' => 'Laman Utama', 'site.phone' => '019'], Livewire::test(FullDemoBuilder::class)->instance()->previewContextValues());
    }

    public function test_the_preview_draws_the_short_codes_in_an_own_blocks_words(): void
    {
        $this->signIn();
        $notice = ['type' => 'ownBlock', 'props' => ['kind' => 'notice', 'values' => json_encode(['title' => 'Selamat datang ke {page.title}', 'text' => 'Hubungi {site.phone}'])]];

        $html = Livewire::test(FullDemoBuilder::class)
            ->call('previewPageBuilder', ['version' => 2, 'sections' => [['id' => 'p1', 'type' => 'rich', 'data' => ['document' => [$notice]]]]])
            ->effects['returns'][0];

        $this->assertStringContainsString('<strong>Selamat datang ke Laman Utama</strong>', $html);
        $this->assertStringContainsString('<p>Hubungi 019</p>', $html);
    }

    public function test_a_refusal_is_in_the_language_of_the_panel(): void
    {
        $this->signIn();

        app()->setLocale('ms');
        $this->assertSame(
            ['kit' => 'Reka bentuk tidak boleh disimpan di sini.'],
            Livewire::test(DemoBuilder::class)->call('saveKitFromPageBuilder', Kit::defaults())->effects['returns'][0]['errors'],
        );

        app()->setLocale('en');
        $component = Livewire::test(FullDemoBuilder::class);
        $this->assertSame(['title' => 'A title is needed.'], $component->call('saveSectionFromPageBuilder', ['type' => 'rich', 'data' => []], ' ', false)->effects['returns'][0]['errors']);
        $this->assertSame(['section' => 'Only a section of its own can be saved.'], $component->call('saveSectionFromPageBuilder', ['type' => 'ref', 'ref' => 4], 'Hero', false)->effects['returns'][0]['errors']);
    }

    public function test_a_hook_the_host_did_not_override_is_refused(): void
    {
        $this->signIn();
        $component = Livewire::test(DemoBuilder::class);

        foreach ([['saveKitFromPageBuilder', [Kit::defaults()]], ['saveSectionFromPageBuilder', [['type' => 'rich', 'data' => []], 'Hero', false]], ['saveSiteInfoFromPageBuilder', [[]]]] as [$method, $arguments]) {
            $result = $component->call($method, ...$arguments)->effects['returns'][0];

            $this->assertFalse($result['ok'], $method);
            $this->assertNotEmpty($result['errors'], $method);
        }
    }

    public function test_a_host_that_overrides_the_hooks_passes_everything_to_the_builder(): void
    {
        $this->signIn();
        FullDemoBuilder::$developer = true;

        $page = Livewire::test(FullDemoBuilder::class)->instance();
        $options = $page->getPageBuilderOptions();

        $this->assertSame(['version' => 2, 'sections' => [['id' => 'one', 'type' => 'rich', 'data' => $options['value']['sections'][0]['data']]]], $options['value']);
        $this->assertTrue($options['developer']);
        $this->assertSame('#c59d6e', $options['kit']['colors']['primary']);
        $this->assertSame('#475569', $options['kit']['colors']['text']);
        $this->assertSame('header', $options['kind']);
        $this->assertSame([['key' => 'header', 'title' => 'Header', 'editUrl' => '/admin/parts/header']], $options['parts']);
        $this->assertCount(1, $options['syncedSections']);
        $this->assertSame(7, $options['syncedSections'][0]['id']);
        $this->assertSame('md', $options['syncedSections'][0]['section']['data']['padding']);
        $this->assertSame([['name' => 'phone', 'label' => 'Telefon', 'type' => 'text', 'default' => ''], ['name' => 'email', 'type' => 'text']], $options['siteInfo']['groups'][0]['fields']);
        $this->assertSame(['contact' => ['phone' => '012', 'email' => 'a@b.c']], $options['siteInfo']['values']);
        $this->assertSame(['saveKit' => true, 'saveSection' => true, 'saveSiteInfo' => true], $page->getPageBuilderSupports());
    }

    public function test_the_pages_a_link_can_point_to_are_cleaned_and_kept_in_order(): void
    {
        $this->signIn();

        $options = Livewire::test(FullDemoBuilder::class)->instance()->getPageBuilderOptions();

        $this->assertSame([
            ['title' => 'Stationery', 'url' => '/stationery'],
            ['title' => str_repeat('a', 120), 'url' => '/long'],
        ], $options['pages']);
    }

    public function test_the_pages_to_build_are_cleaned_for_the_title_menu(): void
    {
        $this->signIn();

        $options = Livewire::test(FullDemoBuilder::class)->instance()->getPageBuilderOptions();

        $this->assertSame([
            ['title' => 'Halaman utama', 'url' => '/admin/pages/1/build', 'current' => true],
            ['title' => 'Hubungi', 'url' => '/admin/pages/7/build', 'current' => false],
            ['title' => 'Twice current', 'url' => '/admin/pages/8/build', 'current' => false],
        ], $options['pageMenu']);
    }

    public function test_the_builder_offers_safe_unique_language_destinations_and_draft_creation(): void
    {
        $this->signIn();
        DemoBuilder::$languages = [
            ['locale' => 'ms', 'label' => ' Bahasa Melayu ', 'url' => '/admin/pages/1/build', 'current' => true],
            ['locale' => 'en', 'label' => 'English', 'url' => null, 'current' => false],
            ['locale' => 'en', 'label' => 'Duplicate', 'url' => '/wrong-record', 'current' => true],
            ['locale' => '../bad', 'label' => 'Bad locale', 'url' => null],
            ['locale' => 'de', 'label' => 'Unsafe', 'url' => 'javascript:alert(1)'],
            ['locale' => 'fr', 'label' => 'Missing URL'],
        ];

        $options = Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions();

        $this->assertSame([
            ['locale' => 'ms', 'label' => 'Bahasa Melayu', 'url' => '/admin/pages/1/build', 'current' => true],
            ['locale' => 'en', 'label' => 'English', 'url' => null, 'current' => false],
        ], $options['languages']);

        DemoBuilder::$languages = [DemoBuilder::$languages[0]];
        $this->assertArrayNotHasKey('languages', Livewire::test(DemoBuilder::class)->instance()->getPageBuilderOptions());
    }

    public function test_translation_creation_is_refused_by_default_and_wired_to_the_host(): void
    {
        $this->signIn();

        Livewire::test(DemoBuilder::class)->call('createPageBuilderTranslation', 'en')->assertForbidden();
        $html = $this->get(DemoBuilder::getUrl())->assertOk()->getContent();
        $this->assertStringContainsString('createTranslation: (locale) => wire.createPageBuilderTranslation(locale)', $html);
    }

    public function test_the_kit_is_saved_cleaned(): void
    {
        $this->signIn();

        Livewire::test(FullDemoBuilder::class)
            ->call('saveKitFromPageBuilder', ['colors' => ['primary' => '#000000', 'text' => '</style>']])
            ->assertReturned(['ok' => true]);

        $this->assertSame('#000000', FullDemoBuilder::$calls['kit']['colors']['primary']);
        $this->assertSame(Kit::defaults()['colors']['text'], FullDemoBuilder::$calls['kit']['colors']['text']);
    }

    public function test_a_kit_that_is_not_a_kit_is_refused(): void
    {
        $this->signIn();

        $result = Livewire::test(FullDemoBuilder::class)->call('saveKitFromPageBuilder', ['colors' => 'red'])->effects['returns'][0];

        $this->assertFalse($result['ok']);
        $this->assertArrayNotHasKey('kit', FullDemoBuilder::$calls);
    }

    public function test_a_saved_section_is_cleaned_and_loses_developer_data_from_a_non_developer(): void
    {
        $this->signIn();

        $result = Livewire::test(FullDemoBuilder::class)->call('saveSectionFromPageBuilder', [
            'id' => 's1', 'type' => 'rich', 'lock' => ['move' => true],
            'data' => ['padding' => 'huge', 'advanced' => ['css' => 'selector { color: red; }', 'class' => 'brand']],
        ], '  Kepala  ', false)->effects['returns'][0];

        [$section, $title, $synced] = FullDemoBuilder::$calls['section'];

        $this->assertSame(['ok' => true, 'id' => 41, 'template' => ['key' => 'saved-41', 'label' => 'Kepala', 'category' => 'saved', 'section' => $section]], $result);
        $this->assertSame('Kepala', $title);
        $this->assertFalse($synced);
        $this->assertSame('md', $section['data']['padding']);
        $this->assertArrayNotHasKey('lock', $section);
        $this->assertSame(['class' => 'brand'], $section['data']['advanced']);
    }

    public function test_a_section_save_needs_a_title_and_a_rich_section(): void
    {
        $this->signIn();
        $component = Livewire::test(FullDemoBuilder::class);

        $this->assertFalse($component->call('saveSectionFromPageBuilder', ['type' => 'rich', 'data' => []], '   ', true)->effects['returns'][0]['ok']);
        $this->assertFalse($component->call('saveSectionFromPageBuilder', ['type' => 'ref', 'ref' => 3], 'Ref', true)->effects['returns'][0]['ok']);
        $this->assertArrayNotHasKey('section', FullDemoBuilder::$calls);
    }

    public function test_site_info_is_saved_and_its_validation_errors_come_back(): void
    {
        $this->signIn();
        $component = Livewire::test(FullDemoBuilder::class);

        $saved = $component->call('saveSiteInfoFromPageBuilder', ['contact' => ['phone' => '0123']])->effects['returns'][0];
        $this->assertTrue($saved['ok']);
        $this->assertSame(['contact' => ['phone' => '0123']], FullDemoBuilder::$calls['siteInfo']);

        $bad = $component->call('saveSiteInfoFromPageBuilder', ['contact' => ['phone' => 'bad']])->effects['returns'][0];
        $this->assertSame(['ok' => false, 'errors' => ['contact.phone' => 'Telefon tidak sah.']], $bad);
    }

    public function test_a_shop_info_save_answers_with_the_values_read_again_so_the_builder_shows_the_new_ones(): void
    {
        $this->signIn();
        app(DynamicValues::class)->register('site.email', 'Emel', fn (): string => FullDemoBuilder::$calls['siteInfo']['contact']['email'] ?? 'lama@kedai.my', settings: 'contact');
        $component = Livewire::test(FullDemoBuilder::class);

        $this->assertSame('lama@kedai.my', $component->instance()->getPageBuilderOptions()['dynamicValues'][0]['preview']);

        $saved = $component->call('saveSiteInfoFromPageBuilder', ['contact' => ['email' => 'baru@kedai.my']])->effects['returns'][0];

        $this->assertTrue($saved['ok']);
        $this->assertSame(['key' => 'site.email', 'label' => 'Emel', 'type' => 'text', 'group' => 'Site', 'preview' => 'baru@kedai.my', 'settings' => 'contact'], $saved['dynamicValues'][0]);
        $this->assertSame(['page.title', 'site.phone'], array_column(array_slice($saved['dynamicValues'], 1), 'key'));

        $refused = $component->call('saveSiteInfoFromPageBuilder', ['contact' => ['phone' => 'bad']])->effects['returns'][0];

        $this->assertArrayNotHasKey('dynamicValues', $refused);
    }

    public function test_every_new_builder_call_checks_access_first(): void
    {
        $this->signIn();

        foreach ([
            'saveKitFromPageBuilder' => [Kit::defaults()],
            'saveSectionFromPageBuilder' => [['type' => 'rich', 'data' => []], 'Hero', false],
            'saveSiteInfoFromPageBuilder' => [[]],
            'previewPageBuilder' => [['sections' => []], ['colors' => ['primary' => '#000000']], ['contact' => ['email' => 'baru@kedai.my']]],
        ] as $method => $arguments) {
            // A refused call leaves the test component unusable, so each gets its own.
            FullDemoBuilder::$denied = false;
            $component = Livewire::test(FullDemoBuilder::class);
            FullDemoBuilder::$denied = true;

            $component->call($method, ...$arguments)->assertForbidden();
        }

        $this->assertSame([], FullDemoBuilder::$calls);
        $this->assertSame(Kit::defaults(), app(KitSource::class)->current());
    }

    public function test_the_preview_draws_with_an_unsaved_kit_and_then_forgets_it(): void
    {
        $this->signIn();

        $html = Livewire::test(FullDemoBuilder::class)
            ->call('previewPageBuilder', ['version' => 2, 'sections' => [['id' => 'p1', 'type' => 'rich', 'data' => ['document' => []]]]], ['colors' => ['primary' => '#14532d']])
            ->effects['returns'][0];

        $this->assertStringContainsString('--kit-color-primary:#14532d', $html);
        $this->assertStringContainsString('data-block-id="p1"', $html);
        $this->assertSame(Kit::defaults(), app(KitSource::class)->current());
    }

    public function test_the_preview_draws_with_unsaved_shop_info_through_the_hosts_hook_and_never_saves_it(): void
    {
        $this->signIn();
        app(DynamicValues::class)->register('site.email', 'Emel', fn (): string => 'lama@kedai.my', settings: 'contact');
        $document = [['type' => 'paragraph', 'content' => [['type' => 'dynamic', 'props' => ['key' => 'site.email']]]]];
        $value = ['version' => 2, 'sections' => [['id' => 'p1', 'type' => 'rich', 'data' => ['document' => $document]]]];
        $component = Livewire::test(FullDemoBuilder::class);

        $html = $component->call('previewPageBuilder', $value, null, ['contact' => ['email' => 'baru@kedai.my'], 'junk' => 'x'])->effects['returns'][0];

        $this->assertStringContainsString('baru@kedai.my', $html);
        $this->assertSame([['contact' => ['email' => 'baru@kedai.my']]], FullDemoBuilder::$calls['previewSiteInfo']);
        $this->assertArrayNotHasKey('siteInfo', FullDemoBuilder::$calls);

        // Without shop info, the hook is not called and the stored value is drawn.
        $plain = $component->call('previewPageBuilder', $value)->effects['returns'][0];

        $this->assertStringContainsString('lama@kedai.my', $plain);
        $this->assertCount(1, FullDemoBuilder::$calls['previewSiteInfo']);
    }

    public function test_by_default_the_preview_ignores_unsaved_shop_info(): void
    {
        $this->signIn();
        $value = ['version' => 2, 'sections' => [['id' => 'p1', 'type' => 'rich', 'data' => ['document' => []]]]];
        $component = Livewire::test(DemoBuilder::class);

        $this->assertSame(
            $component->call('previewPageBuilder', $value)->effects['returns'][0],
            $component->call('previewPageBuilder', $value, null, ['contact' => ['email' => 'baru@kedai.my']])->effects['returns'][0],
        );
    }

    public function test_the_value_saved_from_an_old_host_is_format_two(): void
    {
        $this->signIn();

        Livewire::test(FullDemoBuilder::class)->call('savePageBuilder', ['sections' => [['id' => 'one', 'type' => 'rich', 'data' => []]]])->assertReturned(['ok' => true]);

        $this->assertSame(2, FullDemoBuilder::$calls['value']['version']);
        $this->assertSame(['one'], array_column(FullDemoBuilder::$calls['value']['sections'], 'id'));
    }

    public function test_the_view_wires_only_the_supported_adapter_calls(): void
    {
        $this->signIn();

        $plain = $this->get(DemoBuilder::getUrl())->assertOk()->getContent();
        $full = $this->get(FullDemoBuilder::getUrl())->assertOk()->getContent();

        $this->assertStringContainsString('saveKitFromPageBuilder', $full);
        $this->assertStringContainsString('saveSectionFromPageBuilder', $full);
        $this->assertStringContainsString('saveSiteInfoFromPageBuilder', $full);
        $this->assertStringContainsString('\\u0022saveKit\\u0022:false', $plain);
        $this->assertStringContainsString('\\u0022saveKit\\u0022:true', $full);
        $this->assertStringContainsString('wire.previewPageBuilder(value, extra?.kit ?? null, extra?.siteInfo ?? null)', $plain);
    }
}
