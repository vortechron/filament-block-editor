<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Content\TextTranslations;
use Vortechron\FilamentBlockEditor\Rendering\ContentLocale;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class TextTranslationsTest extends TestCase
{
    private function page(): array
    {
        return ['sections' => [['id' => 'intro', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'welcome', 'type' => 'paragraph', 'content' => [
                ['type' => 'text', 'text' => 'Selamat ', 'styles' => ['bold' => true]],
                ['type' => 'link', 'href' => '/contact', 'content' => [['type' => 'text', 'text' => 'datang', 'styles' => []]]],
                ['type' => 'dynamic', 'props' => ['key' => 'site.name']],
            ]],
            ['id' => 'cta', 'type' => 'button', 'props' => ['text' => 'Hubungi', 'url' => '/contact']],
        ]]]]];
    }

    public function test_saved_translations_render_selected_words_and_keep_links_and_formatting(): void
    {
        $base = TextTranslations::ensureIds($this->page());
        $english = $base;
        $english['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Welcome ';
        $english['sections'][0]['data']['document'][0]['content'][1]['content'][0]['text'] = 'here';
        $english['sections'][0]['data']['document'][1]['props']['text'] = '';
        $value = PageValue::normalize([...$base, 'translations' => ['en' => TextTranslations::extract($base, $english)]]);
        $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($value, new RenderContext));
        $this->assertStringContainsString('Welcome ', $html);
        $this->assertStringContainsString('<strong>', $html);
        $this->assertStringContainsString('href="/contact"', $html);
        $this->assertStringContainsString('here', $html);
        $this->assertSame('', TextTranslations::apply($base, $value['translations']['en'])['sections'][0]['data']['document'][1]['props']['text']);
        $this->assertStringNotContainsString('Selamat', $html);
    }

    public function test_locked_words_cannot_be_changed_through_translation_overrides(): void
    {
        $base = TextTranslations::ensureIds($this->page());
        $base['sections'][0]['lock'] = ['content' => true];
        $other = $base;
        $other['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Changed';
        $stored = [...$base, 'translations' => ['en' => TextTranslations::extract($base, $base)]];
        $posted = [...$base, 'translations' => ['en' => TextTranslations::extract($base, $other)]];
        $guarded = PageValue::guard($posted, $stored);
        $this->assertSame($stored['translations'], $guarded['translations']);
    }

    public function test_conversion_stays_strict_when_a_custom_definition_is_missing(): void
    {
        $registry = app(BlockRegistry::class);
        $definition = $registry->get('fbe-faq');
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'faq', 'type' => 'ownBlock', 'props' => ['kind' => 'fbe-faq', 'values' => '{"heading":"Soalan","items":[]}']],
        ]]]]]);
        $registry->forget('fbe-faq');
        try {
            $this->expectException(InvalidArgumentException::class);
            $this->expectExceptionMessage('Unknown custom block cannot be converted.');
            TextTranslations::extract($base, $base);
        } finally {
            $registry->register($definition);
        }
    }

    public function test_ordinary_translated_edits_freeze_missing_blocks_and_keep_their_opaque_maps(): void
    {
        $registry = app(BlockRegistry::class);
        $definition = $registry->get('fbe-faq');
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', 'type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Selamat', 'styles' => []]]],
            ['id' => 'faq', 'type' => 'ownBlock', 'props' => ['kind' => 'fbe-faq', 'values' => '{"heading":"Soalan","items":[]}']],
        ]]]]]);
        $english = $base;
        $english['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Welcome';
        $english['sections'][0]['data']['document'][1]['props']['values'] = '{"heading":"Questions","items":[]}';
        $stored = TextTranslations::extract($base, $english);
        $registry->forget('fbe-faq');
        try {
            $draft = TextTranslations::apply($base, $stored);
            $draft['sections'][0]['data']['document'][0]['content'][0]['text'] = 'New welcome';
            $draft['sections'][0]['data']['document'][1]['props']['values'] = '{"heading":"Injected","privileged":"not allowed"}';
            $map = TextTranslations::extractForEdit($base, $draft, $stored);
            $this->assertSame($stored['block:faq/values/heading'], $map['block:faq/values/heading']);
            $this->assertArrayNotHasKey('block:faq/values/privileged', $map);
        } finally {
            $registry->register($definition);
        }
        $resolved = TextTranslations::apply($base, $map);
        $this->assertSame('New welcome', $resolved['sections'][0]['data']['document'][0]['content'][0]['text']);
        $this->assertSame('Questions', json_decode($resolved['sections'][0]['data']['document'][1]['props']['values'], true)['heading']);
    }

    public function test_an_explicit_blank_own_field_survives_resolution_normalization_extraction_and_rendering(): void
    {
        view()->addNamespace('text-presence-test', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(OwnBlock::make('presence-title')->fields([Field::text('title')])->view('text-presence-test::text-presence'));
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'own', 'type' => 'ownBlock', 'props' => ['kind' => 'presence-title', 'values' => '{"title":""}']],
        ]]]]]);
        $selected = TextTranslations::apply($base, ['block:own/values/title' => '']);
        $this->assertTrue(TextTranslations::isExplicitlyBlank($selected['sections'][0]['data']['document'][0], 'title'));
        $selected = PageValue::normalize(PageValue::normalize($selected));
        $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($selected, new RenderContext));
        $this->assertStringContainsString('<h3></h3>', $html);
        $copy = TextTranslations::apply($base, TextTranslations::extract($base, $selected));
        $this->assertTrue(TextTranslations::isExplicitlyBlank($copy['sections'][0]['data']['document'][0], 'title'));
        $this->assertSame('', TextTranslations::extractForEdit($base, $selected, [])['block:own/values/title']);
        $fallback = TextTranslations::apply($base, []);
        $this->assertFalse(TextTranslations::isExplicitlyBlank($fallback['sections'][0]['data']['document'][0], 'title'));
        $this->assertArrayNotHasKey('block:own/values/title', TextTranslations::extractForEdit($base, $fallback, []));
        $html = ContentLocale::with('ms', fn () => app(PageRenderer::class)->render($fallback, new RenderContext));
        $this->assertStringContainsString('<h3>Category name</h3>', $html);
    }

    public function test_deliberately_cleared_default_and_english_form_words_render_blank_but_legacy_empty_words_keep_defaults(): void
    {
        $base = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'f', 'type' => 'form', 'props' => ['form' => '{"fields":[],"submit":{"text":""},"success":"","actions":[],"_translated_empty":["submit","success","unsafe"]}']],
        ]]]], 'translations' => ['en' => ['block:f/form/submit' => '', 'block:f/form/success' => '']]];
        $saved = PageValue::normalize($base);
        $form = json_decode($saved['sections'][0]['data']['document'][0]['props']['form'], true);
        $this->assertSame(['submit', 'success'], $form['_translated_empty']);
        foreach (['ms', 'en'] as $locale) {
            $html = ContentLocale::with($locale, fn () => app(PageRenderer::class)->render($saved, new RenderContext));
            $this->assertMatchesRegularExpression('/<button[^>]*><\/button>/', $html);
            $this->app['request']->query->set('form_sent', 'f');
            try {
                $html = ContentLocale::with($locale, fn () => app(PageRenderer::class)->render($saved, new RenderContext));
                $this->assertSame('', trim(strip_tags($html)));
            } finally {
                $this->app['request']->query->remove('form_sent');
            }
        }
        $legacy = $base;
        unset($legacy['translations']);
        $legacy['sections'][0]['data']['document'][0]['props']['form'] = '{"submit":{"text":""},"success":""}';
        foreach (['ms', 'en'] as $locale) {
            $html = ContentLocale::with($locale, fn () => app(PageRenderer::class)->render($legacy, new RenderContext));
            $this->assertStringContainsString('>'.__('filament-block-editor::page.form.submit', [], $locale).'</button>', $html);
            $this->app['request']->query->set('form_sent', 'f');
            try {
                $html = ContentLocale::with($locale, fn () => app(PageRenderer::class)->render($legacy, new RenderContext));
                $this->assertStringContainsString(__('filament-block-editor::page.form.success', [], $locale), $html);
            } finally {
                $this->app['request']->query->remove('form_sent');
            }
        }
        $legacy['sections'][0]['data']['document'][0]['props']['form'] = '{"submit":{"text":"Send"},"success":"Thanks","_translated_empty":["submit","success"]}';
        $clean = PageValue::normalize($legacy);
        $this->assertArrayNotHasKey('_translated_empty', json_decode($clean['sections'][0]['data']['document'][0]['props']['form'], true));
    }

    public function test_declared_legacy_empty_fallback_stays_dynamic_and_a_new_explicit_blank_replaces_it(): void
    {
        view()->addNamespace('text-presence-test', __DIR__.'/../fixtures/views');
        app(BlockRegistry::class)->register(OwnBlock::make('fallback-title')->fields([Field::text('title')->emptyFallback()])->view('text-presence-test::text-presence'));
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'own', 'type' => 'ownBlock', 'props' => ['kind' => 'fallback-title', 'values' => '{"title":"Tajuk Melayu"}']],
        ]]]]]);
        $legacy = $base;
        $legacy['sections'][0]['data']['document'][0]['props']['values'] = '{"title":""}';
        $map = TextTranslations::extract($base, $legacy);
        $this->assertSame(['block:own/values/title' => '', 'block:own/values/title/_empty_fallback' => '1'], $map);
        $selected = TextTranslations::apply($base, $map);
        $this->assertFalse(TextTranslations::isExplicitlyBlank($selected['sections'][0]['data']['document'][0], 'title'));
        $this->assertSame($map, TextTranslations::extractForEdit($base, $selected, $map));
        foreach (['Category one', 'Renamed category'] as $name) {
            $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($selected, new RenderContext(values: ['fallback_name' => $name])));
            $this->assertStringContainsString('<h3>'.$name.'</h3>', $html);
        }
        $blank = TextTranslations::apply($base, ['block:own/values/title' => '']);
        $cleared = TextTranslations::extractForEdit($base, $blank, $map);
        $this->assertSame(['block:own/values/title' => ''], $cleared);
        $this->assertSame($cleared, TextTranslations::extract($base, $blank));
    }

    public function test_restore_overrides_restores_exact_known_presence_but_freezes_current_missing_definition_words(): void
    {
        $registry = app(BlockRegistry::class);
        $definition = OwnBlock::make('missing-fallback')->fields([Field::text('title')->emptyFallback()]);
        $registry->register($definition);
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', 'type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Selamat', 'styles' => []]]],
            ['id' => 'own', 'type' => 'ownBlock', 'props' => ['kind' => 'missing-fallback', 'values' => '{"title":"Tajuk"}']],
        ]]]]]);
        $english = $base;
        $english['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Welcome';
        $english['sections'][0]['data']['document'][1]['props']['values'] = '{"title":""}';
        $current = TextTranslations::extract($base, $english);
        $registry->forget('missing-fallback');
        try {
            $restored = TextTranslations::restoreOverrides($base, [], $current);
            $this->assertArrayNotHasKey('block:p/rich', $restored);
            $this->assertSame('', $restored['block:own/values/title']);
            $this->assertSame('1', $restored['block:own/values/title/_empty_fallback']);
            $desired = ['block:own/values/title' => 'Historical rewrite', 'block:own/values/injected' => 'New unknown'];
            $this->assertSame($restored, TextTranslations::restoreOverrides($base, $desired, $current));
        } finally {
            $registry->register($definition);
        }
    }

    public function test_legacy_empty_form_conversion_keeps_automatic_defaults_until_an_explicit_clear(): void
    {
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'f', 'type' => 'form', 'props' => ['form' => '{"submit":{"text":"Hantar asal"},"success":"Mesej asal","fields":[],"actions":[]}']],
        ]]]]]);
        $legacy = $base;
        $form = json_decode($legacy['sections'][0]['data']['document'][0]['props']['form'], true);
        $form['submit']['text'] = '';
        $form['success'] = '';
        $legacy['sections'][0]['data']['document'][0]['props']['form'] = json_encode($form);
        $automatic = TextTranslations::extract($base, $legacy);
        $this->assertSame('1', $automatic['block:f/form/submit/_empty_fallback']);
        $this->assertSame('1', $automatic['block:f/form/success/_empty_fallback']);
        $resolved = TextTranslations::apply($base, $automatic);
        $this->assertArrayNotHasKey('_translated_empty', json_decode($resolved['sections'][0]['data']['document'][0]['props']['form'], true));
        $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($resolved, new RenderContext));
        $this->assertStringContainsString('>Send</button>', $html);
        $this->app['request']->query->set('form_sent', 'f');
        try {
            $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($resolved, new RenderContext));
            $this->assertStringContainsString(__('filament-block-editor::page.form.success', [], 'en'), $html);
        } finally {
            $this->app['request']->query->remove('form_sent');
        }
        $form['_translated_empty'] = ['submit', 'success'];
        $cleared = $legacy;
        $cleared['sections'][0]['data']['document'][0]['props']['form'] = json_encode($form);
        $expected = ['block:f/form/success' => '', 'block:f/form/submit' => ''];
        $this->assertSame($expected, TextTranslations::extract($base, $cleared));
        $this->assertSame($expected, TextTranslations::extractForEdit($base, $cleared, $automatic));
    }

    public function test_presence_and_automatic_companions_cannot_bypass_declared_fields_locks_or_developer_guards(): void
    {
        app(BlockRegistry::class)->register(OwnBlock::make('protected-presence')->fields([
            Field::text('title')->emptyFallback(),
            Field::text('private')->emptyFallback()->developerOnly(),
            Field::text('fact')->translatable(false)->emptyFallback(),
            Field::list('rows')->fields([Field::text('title')->emptyFallback()])->developerOnly(),
        ]));
        $block = ['id' => 'own', 'type' => 'ownBlock', 'props' => ['kind' => 'protected-presence', 'values' => '{"title":"","private":"","fact":"","rows":[{"_id":"one","title":""}]}']];
        $base = TextTranslations::ensureIds(['sections' => [
            ['id' => 's', 'type' => 'rich', 'data' => ['document' => [$block]]],
            ['id' => 'locked', 'type' => 'rich', 'lock' => ['content' => true], 'data' => ['document' => [[...$block, 'id' => 'locked-own']]]],
        ]]);
        $stored = [...$base, 'translations' => ['en' => TextTranslations::extract($base, $base)]];
        $posted = $stored;
        $posted['sections'][0]['data']['document'][0]['_translated_empty'] = ['title', 'private', 'fact', 'rows/row:one/title', 'unknown'];
        $posted['sections'][1]['data']['document'][0]['_translated_empty'] = ['title'];
        foreach (array_keys($posted['translations']['en']) as $key) {
            if (str_ends_with($key, '/_empty_fallback')) {
                unset($posted['translations']['en'][$key]);
            }
        }
        $posted['translations']['en']['block:own/values/fact/_empty_fallback'] = '1';
        $guarded = PageValue::guard($posted, $stored);
        $own = $guarded['sections'][0]['data']['document'][0];
        $this->assertSame(['title'], $own['_translated_empty']);
        $this->assertFalse(TextTranslations::isExplicitlyBlank($own, 'private'));
        $this->assertFalse(TextTranslations::isExplicitlyBlank($own, 'fact'));
        $this->assertFalse(TextTranslations::isExplicitlyBlank($own, 'rows/row:one/title'));
        $this->assertArrayNotHasKey('block:own/values/title/_empty_fallback', $guarded['translations']['en']);
        foreach (['block:own/values/private', 'block:own/values/rows/row:one/title', 'block:locked-own/values/title'] as $key) {
            $this->assertSame('1', $guarded['translations']['en'][$key.'/_empty_fallback']);
        }
        $this->assertArrayNotHasKey('block:own/values/fact/_empty_fallback', $guarded['translations']['en']);
        $this->assertSame($stored['sections'][1], $guarded['sections'][1]);
        $resolved = TextTranslations::apply($guarded, $guarded['translations']['en']);
        $this->assertTrue(TextTranslations::isExplicitlyBlank($resolved['sections'][0]['data']['document'][0], 'title'));
        $this->assertFalse(TextTranslations::isExplicitlyBlank($resolved['sections'][0]['data']['document'][0], 'private'));
    }

    public function test_tolerant_editing_still_refuses_shared_layout_media_and_action_target_changes(): void
    {
        $registry = app(BlockRegistry::class);
        $definition = $registry->get('fbe-faq');
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'faq', 'type' => 'ownBlock', 'props' => ['kind' => 'fbe-faq', 'values' => '{"heading":"Soalan","items":[]}']],
            ['id' => 'b', 'type' => 'button', 'props' => ['text' => 'Hubungi', 'url' => '/contact']],
            ['id' => 'f', 'type' => 'form', 'props' => ['form' => '{"fields":[],"actions":[{"type":"email","to":"hello@example.com"}]}']],
        ]]]]]);
        $registry->forget('fbe-faq');
        try {
            foreach (['layout', 'style', 'media', 'target', 'form-target'] as $change) {
                $draft = $base;
                if ($change === 'layout') {
                    $draft['sections'][0]['data']['layout'] = 'banner';
                }
                if ($change === 'style') {
                    $draft['sections'][0]['data']['padding'] = 'lg';
                }
                if ($change === 'media') {
                    $draft['sections'][0]['data']['image'] = '/other.jpg';
                }
                if ($change === 'target') {
                    $draft['sections'][0]['data']['document'][1]['props']['url'] = '/other';
                }
                if ($change === 'form-target') {
                    $draft['sections'][0]['data']['document'][2]['props']['form'] = '{"fields":[],"actions":[{"type":"email","to":"changed@example.com"}]}';
                }
                try {
                    TextTranslations::extractForEdit($base, $draft, []);
                    $this->fail('The '.$change.' change must be refused.');
                } catch (InvalidArgumentException $error) {
                    $this->assertStringContainsString('shared structure', $error->getMessage());
                }
            }
        } finally {
            $registry->register($definition);
        }
    }

    public function test_layout_changes_are_refused_by_the_conversion_interface(): void
    {
        $base = $this->page();
        $translated = $base;
        $translated['sections'][0]['data']['document'][1]['props']['url'] = '/other';
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::extract($base, $translated);
    }

    public function test_reordered_repeater_words_keep_their_row_and_form_options_keep_identity(): void
    {
        app(BlockRegistry::class)->register(
            OwnBlock::make('offers')->fields([
                Field::list('items')->fields([
                    Field::text('title'),
                    Field::text('code')->translatable(false),
                ]),
            ])->view('blocks.blank')
        );
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['type' => 'ownBlock', 'props' => ['kind' => 'offers', 'values' => json_encode(['items' => [['title' => 'Satu', 'code' => 'ONE'], ['title' => 'Dua', 'code' => 'TWO']]])]],
        ]]]]]);
        $translated = $base;
        $rows = json_decode($base['sections'][0]['data']['document'][0]['props']['values'], true);
        $rows['items'][0]['title'] = 'One';
        $rows['items'][1]['title'] = 'Two';
        $translated['sections'][0]['data']['document'][0]['props']['values'] = json_encode($rows);
        $overrides = TextTranslations::extract($base, $translated);
        $baseRows = json_decode($base['sections'][0]['data']['document'][0]['props']['values'], true);
        $baseRows['items'] = array_reverse($baseRows['items']);
        $base['sections'][0]['data']['document'][0]['props']['values'] = json_encode($baseRows);
        $saved = PageValue::normalize([...$base, 'translations' => ['en' => $overrides]]);
        $resolved = TextTranslations::apply($saved, $saved['translations']['en']);
        $this->assertSame(['Two', 'One'], array_column(json_decode($resolved['sections'][0]['data']['document'][0]['props']['values'], true)['items'], 'title'));
    }

    public function test_an_empty_legacy_rich_document_is_an_intentional_blank_translation(): void
    {
        $base = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', ...Blocks::paragraph('Same')],
        ]]]]];
        $translated = $base;
        $translated['sections'][0]['data']['document'][0]['content'] = [];
        $root = TextTranslations::ensureIds($base);
        $overrides = TextTranslations::extract($root, $translated);
        $resolved = TextTranslations::apply($root, $overrides);
        $this->assertSame([], $resolved['sections'][0]['data']['document'][0]['content']);
    }

    public function test_form_text_round_trips_with_option_identity_and_keeps_the_internal_keys(): void
    {
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'form1', 'type' => 'form', 'props' => ['form' => json_encode([
                'name' => 'Office inbox', 'fields' => [['id' => 'service', 'type' => 'select', 'name' => 'servis', 'label' => 'Servis', 'placeholder' => 'Pilih', 'options' => ['Cetak', 'Pos']]],
                'submit' => ['text' => 'Hantar'], 'success' => 'Terima kasih', 'actions' => [['type' => 'whatsapp', 'to' => '60123456789', 'message' => 'Pilihan {servis}']],
            ])]],
        ]]]]]);
        $english = $base;
        $form = json_decode($english['sections'][0]['data']['document'][0]['props']['form'], true);
        $form['fields'][0]['label'] = 'Service';
        $form['fields'][0]['options'] = ['Print', 'Post'];
        $form['submit']['text'] = 'Send';
        $form['success'] = 'Thank you';
        $form['actions'][0]['message'] = 'Choice {servis}';
        $english['sections'][0]['data']['document'][0]['props']['form'] = json_encode($form);
        $overrides = TextTranslations::extract($base, $english);
        $saved = PageValue::normalize([...$base, 'translations' => ['en' => $overrides]]);
        $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($saved, new RenderContext));
        $this->assertStringContainsString('Service', $html);
        $this->assertStringContainsString('Print', $html);
        $this->assertStringContainsString('name="servis"', $html);
        $this->assertStringContainsString('Send', $html);
        $this->assertSame($overrides, $saved['translations']['en']);
    }

    public function test_conversion_refuses_raw_unknown_form_data_instead_of_silently_dropping_it(): void
    {
        $base = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'f', 'type' => 'form', 'props' => ['form' => '{"fields":[],"custom_delivery":"courier"}']],
        ]]]]];
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::extract($base, $base);
    }

    public function test_an_intentionally_blank_form_button_stays_blank_for_visitors(): void
    {
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'f', 'type' => 'form', 'props' => ['form' => '{"fields":[],"submit":{"text":"Hantar"},"success":"Terima kasih"}']],
        ]]]]]);
        $english = $base;
        $form = json_decode($english['sections'][0]['data']['document'][0]['props']['form'], true);
        $form['submit']['text'] = '';
        $form['_translated_empty'] = ['submit'];
        $english['sections'][0]['data']['document'][0]['props']['form'] = json_encode($form);
        $value = [...$base, 'translations' => ['en' => TextTranslations::extract($base, $english)]];
        $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($value, new RenderContext));
        $this->assertStringNotContainsString('>Send</button>', $html);
        $this->assertMatchesRegularExpression('/<button[^>]*><\/button>/', $html);
    }

    public function test_conversion_refuses_changes_to_the_type_of_unknown_raw_props(): void
    {
        $base = $this->page();
        $base['sections'][0]['data']['document'][0]['props']['external_key'] = 1;
        $other = $base;
        $other['sections'][0]['data']['document'][0]['props']['external_key'] = '1';
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::extract($base, $other);
    }

    public function test_conversion_refuses_an_unknown_english_section_before_cleaning(): void
    {
        $base = $this->page();
        $english = $base;
        $english['sections'][] = ['id' => 'future', 'type' => 'future-layout', 'data' => ['words' => 'Keep me']];
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::extract($base, $english);
    }

    public function test_conversion_refuses_unknown_section_data_before_cleaning(): void
    {
        $base = $this->page();
        $english = $base;
        $english['sections'][0]['data']['future_words'] = 'Keep me';
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::extract($base, $english);
    }

    public function test_conversion_refuses_unknown_layout_values_before_cleaning(): void
    {
        $base = $this->page();
        $english = $base;
        $english['sections'][0]['data']['layout'] = 'future-layout';
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::extract($base, $english);
    }

    public function test_clearing_base_rich_words_keeps_the_saved_english_value(): void
    {
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'p', 'type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Selamat', 'styles' => []]]],
        ]]]]]);
        $english = $base;
        $english['sections'][0]['data']['document'][0]['content'][0]['text'] = 'Welcome';
        $map = TextTranslations::extract($base, $english);
        $base['sections'][0]['data']['document'][0]['content'] = [];
        $saved = PageValue::normalize([...$base, 'translations' => ['en' => $map]]);
        $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($saved, new RenderContext));
        $this->assertStringContainsString('Welcome', $html);
    }

    public function test_inline_merges_and_splits_do_not_change_the_english_rich_value_or_link(): void
    {
        $base = TextTranslations::ensureIds($this->page());
        $en = $base;
        $en['sections'][0]['data']['document'][0]['content'] = [
            ['type' => 'text', 'text' => 'Open ', 'styles' => ['bold' => true]],
            ['type' => 'link', 'href' => '/english-contact', 'content' => [['type' => 'text', 'text' => 'today', 'styles' => []]]],
        ];
        $map = TextTranslations::extract($base, $en);
        foreach ([
            [['type' => 'text', 'text' => 'Buka hari ini', 'styles' => []]],
            [['type' => 'text', 'text' => 'Buka ', 'styles' => ['italic' => true]], ['type' => 'text', 'text' => 'hari ini', 'styles' => []]],
        ] as $content) {
            $base['sections'][0]['data']['document'][0]['content'] = $content;
            $saved = PageValue::normalize([...$base, 'translations' => ['en' => $map]]);
            $html = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($saved, new RenderContext));
            $this->assertStringContainsString('<strong>Open </strong>', $html);
            $this->assertStringContainsString('href="/english-contact"', $html);
            $this->assertStringContainsString('today', $html);
            $this->assertSame($map, $saved['translations']['en']);
        }
    }

    public function test_oversized_rich_json_is_refused_instead_of_truncated(): void
    {
        $base = TextTranslations::ensureIds($this->page());
        $map = ['block:welcome/rich' => json_encode(['version' => 1, 'content' => [['type' => 'text', 'text' => str_repeat('a', 100000), 'styles' => (object) []]]])];
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::normalizeOverrides($base, $map);
    }

    public function test_rich_overrides_cannot_add_unsafe_links_or_privileged_chip_data(): void
    {
        $base = TextTranslations::ensureIds($this->page());
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::apply($base, ['block:welcome/rich' => '{"version":1,"content":[{"type":"dynamic","props":{"key":"site.name","secret":"private"}}]}']);
    }

    public function test_unsafe_locale_inline_links_are_refused(): void
    {
        $base = TextTranslations::ensureIds($this->page());
        $this->expectException(InvalidArgumentException::class);
        TextTranslations::apply($base, ['block:welcome/rich' => '{"version":1,"content":[{"type":"link","href":"javascript:alert(1)","content":[]}]}']);
    }

    public function test_identified_table_cells_keep_words_on_reorder_and_refuse_lost_identity(): void
    {
        $base = TextTranslations::ensureIds(['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 't', 'type' => 'table', 'content' => ['type' => 'tableContent', 'rows' => [['cells' => [
                ['type' => 'tableCell', '_id' => 'one', 'content' => [['type' => 'text', 'text' => 'Satu', 'styles' => []]]],
                ['type' => 'tableCell', '_id' => 'two', 'content' => [['type' => 'text', 'text' => 'Dua', 'styles' => []]]],
            ]]]]],
        ]]]]]);
        $english = $base;
        $english['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'][0]['content'][0]['text'] = 'One';
        $english['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'][1]['content'][0]['text'] = 'Two';
        $map = TextTranslations::extract($base, $english);
        $base['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'] = array_reverse($base['sections'][0]['data']['document'][0]['content']['rows'][0]['cells']);
        $resolved = TextTranslations::apply($base, $map);
        $this->assertSame('Two', $resolved['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'][0]['content'][0]['text']);
        unset($base['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'][0]['_id']);
        $this->expectException(InvalidArgumentException::class);
        PageValue::normalize([...$base, 'translations' => ['en' => $map]]);
    }

    public function test_saved_identified_cell_words_render_independent_blanks_fallback_and_marks_and_obey_content_locks(): void
    {
        $cell = fn (string $id, string $text) => ['type' => 'tableCell', '_id' => $id, 'content' => [['type' => 'text', 'text' => $text, 'styles' => []]]];
        $base = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 't', 'type' => 'table', 'content' => ['type' => 'tableContent', 'rows' => [['cells' => [$cell('one', 'Nama'), $cell('two', 'Harga'), $cell('three', 'Buku')]]]]],
        ]]]]];
        $map = [
            'block:t/rich-cell:one' => '{"version":1,"content":[{"type":"link","href":"/en/contact","content":[{"type":"text","text":"Name","styles":{"bold":true}}]}]}',
            'block:t/rich-cell:two' => '{"version":1,"content":[]}',
        ];
        $saved = PageValue::normalize([...$base, 'translations' => ['en' => $map]]);
        $saved['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'][0]['content'] = [];
        $saved = PageValue::normalize($saved);
        $this->assertSame($map, $saved['translations']['en']);
        $english = ContentLocale::with('en', fn () => app(PageRenderer::class)->render($saved, new RenderContext));
        $malay = ContentLocale::with('ms', fn () => app(PageRenderer::class)->render($saved, new RenderContext));
        $this->assertStringContainsString('<strong>Name</strong>', $english);
        $this->assertStringContainsString('href="/en/contact"', $english);
        $this->assertStringNotContainsString('Harga', $english);
        $this->assertStringContainsString('Buku', $english);
        $this->assertStringNotContainsString('Nama', $malay);
        $this->assertStringContainsString('Harga', $malay);
        $saved['sections'][0]['lock'] = ['content' => true];
        $posted = $saved;
        $posted['sections'][0]['data']['document'][0]['content']['rows'][0]['cells'][0]['content'] = [['type' => 'text', 'text' => 'Changed', 'styles' => []]];
        $posted['translations']['en']['block:t/rich-cell:one'] = '{"version":1,"content":[{"type":"text","text":"Changed","styles":{}}]}';
        $this->assertSame($saved, PageValue::guard($posted, $saved));
    }

    public function test_rich_values_cannot_overflow_the_existing_section_document_limit(): void
    {
        $base = ['sections' => [['id' => 's', 'type' => 'rich', 'data' => ['document' => [
            ['id' => 'one', 'type' => 'paragraph', 'content' => []],
            ['id' => 'two', 'type' => 'paragraph', 'content' => []],
        ]]]]];
        $rich = json_encode(['version' => 1, 'content' => [['type' => 'text', 'text' => str_repeat('a', 50000), 'styles' => (object) []]]]);
        $this->expectException(InvalidArgumentException::class);
        PageValue::normalize([...$base, 'translations' => ['en' => ['block:one/rich' => $rich, 'block:two/rich' => $rich]]]);
    }
}
