<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Illuminate\Support\MessageBag;
use Illuminate\Support\ViewErrorBag;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Forms\FormEndpoint;
use Vortechron\FilamentBlockEditor\Forms\FormTimestamp;
use Vortechron\FilamentBlockEditor\Forms\NullFormEndpoint;
use Vortechron\FilamentBlockEditor\Rendering\PageRenderer;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Tests\Support\BlockHelpers;
use Vortechron\FilamentBlockEditor\Tests\TestCase;
use Vortechron\FilamentBlockEditor\Tests\Unit\FormDefinitionTest;

class FormRenderTest extends TestCase
{
    use BlockHelpers;

    private function connect(): void
    {
        $this->app->instance(FormEndpoint::class, new class implements FormEndpoint
        {
            public function action(RenderContext $context): ?string
            {
                return 'https://shop.example/_cms/forms/7';
            }

            public function hiddenFields(RenderContext $context): array
            {
                return ['_page' => 'home "page"'];
            }
        });
    }

    /**
     * @param  array<string, mixed>  $form
     */
    private function render(array $form = [], ?RenderContext $context = null): string
    {
        $block = ['id' => 'blk1', ...Blocks::form($form === [] ? FormDefinitionTest::example() : $form)];

        return app(PageRenderer::class)->render([['id' => 'sec1', 'type' => 'rich', 'data' => ['document' => [$block]]]], $context ?? new RenderContext);
    }

    public function test_it_draws_every_field_with_its_label_and_the_hidden_fields(): void
    {
        $this->connect();
        $this->startSession();

        $html = $this->render();
        $form = $this->first($html, 'form.fbe-form');

        $this->assertSame('form-blk1', $form->getAttribute('id'));
        $this->assertSame('post', $form->getAttribute('method'));
        $this->assertSame('https://shop.example/_cms/forms/7', $form->getAttribute('action'));
        $this->assertSame('sec1.blk1', $this->first($html, 'input[name="_form"]')->getAttribute('value'));
        $this->assertSame(csrf_token(), $this->first($html, 'input[name="_token"]')->getAttribute('value'));
        $this->assertNotNull(FormTimestamp::age($this->first($html, 'input[name="_t"]')->getAttribute('value')));
        $this->assertSame('home "page"', $this->first($html, 'input[name="_page"]')->getAttribute('value'));
        $this->assertSame('-1', $this->first($html, '.fbe-hp input[name="_website"]')->getAttribute('tabindex'));
        $this->assertSame(['Nama *', 'Telefon *', 'Servis', 'Mesej'], array_map(trim(...), $this->texts($html, 'label.fbe-label')));
        $this->assertCount(2, $this->select($html, 'label.fbe-label .fbe-required[aria-hidden="true"]'));
        $this->assertSame('text', $this->first($html, 'input[name="nama"]')->getAttribute('type'));
        $this->assertTrue($this->first($html, 'input[name="nama"]')->hasAttribute('required'));
        $this->assertSame('tel', $this->first($html, 'input[name="telefon"]')->getAttribute('type'));
        $this->assertSame(['', 'Fotostat', 'Parcel'], array_map(fn ($o) => $o->getAttribute('value'), $this->select($html, 'select[name="servis"] option')));
        $this->assertSame('4', $this->first($html, 'textarea[name="mesej"]')->getAttribute('rows'));
        $this->assertSame('checkbox', $this->first($html, 'input[name="setuju"]')->getAttribute('type'));
        $this->assertCount(2, $this->select($html, '.fbe-field-half'));
        $this->assertSame('Hantar', trim($this->first($html, 'button[type="submit"]')->textContent));
        $this->assertFalse($this->first($html, 'button[type="submit"]')->hasAttribute('disabled'));
        $this->assertSame([], $this->select($html, '.fbe-form-note'));
    }

    public function test_choices_checkboxes_and_radios_get_their_options(): void
    {
        $html = $this->render(['fields' => [
            ['type' => 'checkboxes', 'name' => 'hari', 'label' => 'Hari', 'options' => ['Isnin', 'Selasa']],
            ['type' => 'radio', 'name' => 'saiz', 'label' => 'Saiz', 'options' => ['S', 'M'], 'required' => true],
            ['type' => 'email', 'name' => 'emel', 'label' => 'E-mel', 'placeholder' => 'anda@contoh.com'],
            ['type' => 'date', 'name' => 'tarikh', 'label' => 'Tarikh'],
            ['type' => 'number', 'name' => 'jumlah', 'label' => 'Jumlah'],
        ]]);

        $this->assertCount(2, $this->select($html, 'input[type="checkbox"][name="hari[]"]'));
        $this->assertCount(2, $this->select($html, 'input[type="radio"][name="saiz"][required]'));
        $this->assertSame(['Hari', 'Saiz *'], array_map(trim(...), $this->texts($html, 'fieldset legend')));
        $this->assertSame('anda@contoh.com', $this->first($html, 'input[type="email"]')->getAttribute('placeholder'));
        $this->assertCount(1, $this->select($html, 'input[type="date"][name="tarikh"]'));
        $this->assertCount(1, $this->select($html, 'input[type="number"][name="jumlah"]'));
    }

    public function test_without_an_endpoint_the_button_is_disabled_and_the_builder_says_so(): void
    {
        app()->setLocale('ms');
        $this->assertInstanceOf(NullFormEndpoint::class, app(FormEndpoint::class));

        $visitor = $this->render();
        $builder = $this->render(context: new RenderContext(forBuilder: true, isPreview: true));

        $this->assertTrue($this->first($visitor, 'button[type="submit"]')->hasAttribute('disabled'));
        $this->assertFalse($this->first($visitor, 'form')->hasAttribute('action'));
        $this->assertSame([], $this->select($visitor, '.fbe-form-note'));
        $this->assertSame(['Borang belum disambung'], $this->texts($builder, '.fbe-form-note'));
    }

    public function test_the_success_message_shows_after_a_send(): void
    {
        $this->app['request']->query->set('form_sent', 'blk1');
        $byQuery = $this->render();
        $this->app['request']->query->set('form_sent', 'other');
        $otherForm = $this->render();
        $this->app['request']->query->remove('form_sent');

        $this->startSession();
        session()->flash('filament-cms.form_sent', 'blk1');
        $byFlash = $this->render();

        $this->assertSame(['Terima kasih. Kami akan hubungi anda.'], array_map(trim(...), $this->texts($byQuery, '#form-blk1 .fbe-form-success')));
        $this->assertSame([], $this->select($byQuery, 'input[name="nama"]'));
        $this->assertCount(1, $this->select($otherForm, 'input[name="nama"]'));
        $this->assertCount(1, $this->select($byFlash, '.fbe-form-success'));
    }

    public function test_errors_show_under_their_fields_and_the_sent_values_come_back(): void
    {
        $this->startSession();
        session()->put('errors', (new ViewErrorBag)->put('default', new MessageBag(['form.blk1.nama' => ['Nama diperlukan.'], 'form.other.nama' => ['Not this form.']])));
        session()->put('_old_input', ['_form' => 'sec1.blk1', 'telefon' => '0123', 'servis' => 'Parcel', 'mesej' => 'Hai <b>', 'setuju' => '1']);

        $html = $this->render();

        $this->assertSame(['Nama diperlukan.'], array_map(trim(...), $this->texts($html, '.fbe-field-error')));
        $this->assertSame('form-blk1-nama-error', $this->first($html, 'input[name="nama"]')->getAttribute('aria-describedby'));
        $this->assertSame('0123', $this->first($html, 'input[name="telefon"]')->getAttribute('value'));
        $this->assertTrue($this->first($html, 'option[value="Parcel"]')->hasAttribute('selected'));
        $this->assertSame('Hai <b>', $this->first($html, 'textarea[name="mesej"]')->textContent);
        $this->assertTrue($this->first($html, 'input[name="setuju"]')->hasAttribute('checked'));
    }

    public function test_the_values_another_form_sent_do_not_come_back(): void
    {
        $this->startSession();
        session()->put('_old_input', ['_form' => 'sec9.other', 'telefon' => '0123']);

        $this->assertSame('', $this->first($this->render(), 'input[name="telefon"]')->getAttribute('value'));
    }

    public function test_labels_and_words_are_escaped(): void
    {
        $html = $this->render([
            'fields' => [['type' => 'text', 'name' => 'nama', 'label' => '<script>alert(1)</script>', 'placeholder' => '"><img src=x onerror=alert(1)>']],
            'submit' => ['text' => '<b>Go</b>'],
        ]);

        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('<img', $html);
        $this->assertStringNotContainsString('<b>', $html);
        $this->assertSame('<script>alert(1)</script>', trim($this->first($html, 'label.fbe-label')->textContent));
    }

    public function test_an_empty_submit_text_uses_the_page_language(): void
    {
        app()->setLocale('en');

        $this->assertSame('Send', trim($this->first($this->render(['fields' => [['type' => 'text', 'name' => 'a']]]), 'button')->textContent));
    }
}
