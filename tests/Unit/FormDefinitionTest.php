<?php

namespace Vortechron\FilamentBlockEditor\Tests\Unit;

use Illuminate\Support\Facades\Validator;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Forms\FormDefinition;
use Vortechron\FilamentBlockEditor\Forms\FormTimestamp;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

class FormDefinitionTest extends TestCase
{
    /**
     * The contract's example form (docs/v2-plan.md, section 7).
     *
     * @return array<string, mixed>
     */
    public static function example(): array
    {
        return [
            'name' => 'Borang pertanyaan',
            'fields' => [
                ['id' => 'f1', 'type' => 'text', 'name' => 'nama', 'label' => 'Nama', 'placeholder' => '', 'required' => true, 'width' => 'half'],
                ['id' => 'f2', 'type' => 'tel', 'name' => 'telefon', 'label' => 'Telefon', 'required' => true, 'width' => 'half'],
                ['id' => 'f3', 'type' => 'select', 'name' => 'servis', 'label' => 'Servis', 'options' => ['Fotostat', 'Parcel']],
                ['id' => 'f4', 'type' => 'textarea', 'name' => 'mesej', 'label' => 'Mesej', 'rows' => 4],
                ['id' => 'f5', 'type' => 'consent', 'name' => 'setuju', 'label' => 'Saya setuju dihubungi.', 'required' => true],
            ],
            'submit' => ['text' => 'Hantar', 'align' => 'left'],
            'success' => 'Terima kasih. Kami akan hubungi anda.',
            'actions' => [
                ['type' => 'email', 'to' => '@site.email', 'subject' => 'Pertanyaan baru dari website'],
                ['type' => 'whatsapp', 'to' => '@site.whatsapp_number', 'message' => 'Hai, saya {nama}. {mesej}'],
                ['type' => 'redirect', 'url' => '/terima-kasih'],
                ['type' => 'webhook', 'url' => 'https://hooks.example.com/x'],
            ],
        ];
    }

    public function test_it_keeps_a_good_form_and_fills_in_every_field_key(): void
    {
        $form = FormDefinition::normalize(self::example());

        $this->assertSame('Borang pertanyaan', $form['name']);
        $this->assertSame(['id' => 'f1', 'type' => 'text', 'name' => 'nama', 'label' => 'Nama', 'placeholder' => '', 'required' => true, 'width' => 'half'], $form['fields'][0]);
        $this->assertSame(['id' => 'f3', 'type' => 'select', 'name' => 'servis', 'label' => 'Servis', 'placeholder' => '', 'required' => false, 'width' => 'full', 'options' => ['Fotostat', 'Parcel']], $form['fields'][2]);
        $this->assertSame(4, $form['fields'][3]['rows']);
        $this->assertSame(['text' => 'Hantar', 'align' => 'left'], $form['submit']);
        $this->assertSame('Terima kasih. Kami akan hubungi anda.', $form['success']);
        $this->assertSame(self::example()['actions'], $form['actions']);
        $this->assertSame($form, FormDefinition::normalize($form));
    }

    public function test_bad_fields_are_cleaned(): void
    {
        $form = FormDefinition::normalize(['fields' => [
            ['type' => 'password', 'name' => 'Nama Penuh!', 'label' => 'Nama penuh', 'width' => 'third', 'required' => 'yes'],
            ['type' => 'email', 'name' => 'nama_penuh', 'label' => str_repeat('a', 250), 'placeholder' => ['x']],
            ['type' => 'text', 'label' => '<b>Bandar</b>'],
            ['type' => 'textarea', 'name' => '9lives', 'rows' => 99],
            ['type' => 'text', 'options' => ['a'], 'rows' => 3],
            ['type' => 'radio', 'name' => 'pilih', 'options' => ['A', 'A', '', ['x'], 'B', ...array_fill(0, 40, 'C')]],
            'not a field',
        ]]);

        [$name, $email, $city, $text, $plain, $radio] = $form['fields'];

        $this->assertSame(['text', 'nama_penuh', 'full', true], [$name['type'], $name['name'], $name['width'], $name['required']]);
        $this->assertSame('nama_penuh_2', $email['name']);
        $this->assertSame(200, mb_strlen($email['label']));
        $this->assertSame('', $email['placeholder']);
        $this->assertSame('bbandarb', $city['name']);
        $this->assertSame('<b>Bandar</b>', $city['label']);
        $this->assertSame('field', $text['name']);
        $this->assertSame(12, $text['rows']);
        $this->assertArrayNotHasKey('options', $plain);
        $this->assertArrayNotHasKey('rows', $plain);
        $this->assertSame(['A', 'B', 'C'], $radio['options']);
        $this->assertMatchesRegularExpression('/^[a-z0-9]{8}$/', $name['id']);
        $this->assertCount(6, $form['fields']);
    }

    public function test_a_form_keeps_at_most_thirty_fields(): void
    {
        $fields = array_map(fn (int $i): array => ['type' => 'text', 'name' => "f{$i}"], range(1, 35));

        $this->assertCount(30, FormDefinition::normalize(['fields' => $fields])['fields']);
    }

    public function test_actions_are_checked_and_kept_at_most_once_each(): void
    {
        $actions = FormDefinition::normalize(['actions' => [
            ['type' => 'email', 'to' => 'not an email'],
            ['type' => 'email', 'to' => 'owner@example.com', 'subject' => ['x']],
            ['type' => 'email', 'to' => 'second@example.com'],
            ['type' => 'whatsapp', 'to' => '+60 12-345 6789', 'message' => 'Hai {nama}'],
            ['type' => 'redirect', 'url' => 'javascript:alert(1)'],
            ['type' => 'webhook', 'url' => 'http://hooks.example.com/x'],
            ['type' => 'webhook', 'url' => 'https://hooks.example.com/ok'],
            ['type' => 'script', 'url' => 'https://x.example'],
        ]])['actions'];

        $this->assertSame([
            ['type' => 'email', 'to' => 'owner@example.com', 'subject' => ''],
            ['type' => 'whatsapp', 'to' => '+60123456789', 'message' => 'Hai {nama}'],
            ['type' => 'webhook', 'url' => 'https://hooks.example.com/ok'],
        ], $actions);
    }

    public function test_from_props_reads_the_json_prop_and_anything_else_is_an_empty_form(): void
    {
        $form = FormDefinition::fromProps(['form' => json_encode(self::example())]);

        $this->assertSame(['nama', 'telefon', 'servis', 'mesej', 'setuju'], array_column($form->fields(), 'name'));
        $this->assertSame('whatsapp', $form->action('whatsapp')['type']);
        $this->assertNull(FormDefinition::fromProps([])->action('email'));
        $this->assertSame([], FormDefinition::fromProps(['form' => 'nope'])->fields());
        $this->assertSame([], FormDefinition::fromProps(['form' => ['fields' => []]])->actions());
    }

    public function test_the_rules_check_the_visitors_input(): void
    {
        $rules = FormDefinition::fromProps(['form' => json_encode([...self::example(), 'fields' => [
            ...self::example()['fields'],
            ['type' => 'email', 'name' => 'emel', 'label' => 'E-mel'],
            ['type' => 'checkboxes', 'name' => 'hari', 'options' => ['Isnin', 'Selasa']],
            ['type' => 'number', 'name' => 'umur'],
        ]])])->rules();

        $good = ['nama' => 'Ali', 'telefon' => '+60 12-345 6789', 'servis' => 'Parcel', 'mesej' => 'Hai', 'setuju' => '1', 'emel' => 'ali@example.com', 'hari' => ['Isnin'], 'umur' => '30'];

        $this->assertTrue(Validator::make($good, $rules)->passes());
        $this->assertTrue(Validator::make(['nama' => 'Ali', 'telefon' => '0123', 'setuju' => '1'], $rules)->passes());

        foreach ([
            'a missing required field' => ['nama' => null],
            'consent not given' => ['setuju' => null],
            'a choice not on the list' => ['servis' => 'Hack'],
            'a box not on the list' => ['hari' => ['Ahad']],
            'a bad email' => ['emel' => 'nope'],
            'letters in a phone' => ['telefon' => 'call me'],
            'a word for a number' => ['umur' => 'thirty'],
            'a huge text' => ['nama' => str_repeat('a', 501)],
        ] as $case => $change) {
            $this->assertTrue(Validator::make([...$good, ...$change], $rules)->fails(), $case);
        }
    }

    public function test_the_document_cleans_the_form_prop_and_gives_the_block_an_id(): void
    {
        $clean = BlockNoteDocument::clean([
            ['type' => 'form', 'props' => ['form' => json_encode(['fields' => [['type' => 'evil', 'name' => 'x']], 'actions' => [['type' => 'redirect', 'url' => 'javascript:x']]])]],
            Blocks::form(self::example()),
        ]);

        $form = json_decode($clean[0]['props']['form'], true);

        $this->assertSame('text', $form['fields'][0]['type']);
        $this->assertSame([], $form['actions']);
        $this->assertMatchesRegularExpression('/^[a-z0-9]{8}$/', $clean[0]['id']);
        $this->assertSame(FormDefinition::normalize(self::example()), json_decode($clean[1]['props']['form'], true));
    }

    public function test_the_time_field_is_signed(): void
    {
        $this->travelTo(now()->setTimestamp(1_800_000_000));
        $value = FormTimestamp::issue();
        $this->travel(5)->seconds();

        $this->assertSame(5, FormTimestamp::age($value));
        $this->assertNull(FormTimestamp::age('1800000000.forged'));
        $this->assertNull(FormTimestamp::age(str_replace('1800000000', '1700000000', $value)));
        $this->assertNull(FormTimestamp::age(['x']));
    }
}
