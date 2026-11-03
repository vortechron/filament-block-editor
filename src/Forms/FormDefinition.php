<?php

namespace Vortechron\FilamentBlockEditor\Forms;

use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * A form block's form: its fields, its button, its success message and what
 * happens after a visitor sends it. The block keeps it as a JSON string in
 * its `form` prop (BlockNote props are plain values):
 *
 *     ['name' => 'Borang pertanyaan',
 *      'fields' => [['id' => 'f1', 'type' => 'text', 'name' => 'nama', 'label' => 'Nama',
 *                    'placeholder' => '', 'required' => true, 'width' => 'half'], ...],
 *      'submit' => ['text' => 'Hantar', 'align' => 'left'],
 *      'success' => 'Terima kasih.',
 *      'actions' => [['type' => 'email', 'to' => '@site.email', 'subject' => '...'], ...]]
 *
 * normalize() cleans every part. The package draws the form (FormRenderer);
 * the host saves what visitors send and runs the actions, always from the
 * stored form, never from the request.
 */
final class FormDefinition
{
    public const FIELD_TYPES = ['text', 'email', 'tel', 'number', 'date', 'textarea', 'select', 'radio', 'checkboxes', 'consent'];

    public const CHOICE_TYPES = ['select', 'radio', 'checkboxes'];

    public const ACTIONS = ['email', 'whatsapp', 'redirect', 'webhook'];

    public const ALIGNS = ['left', 'center', 'right', 'full'];

    public const MAX_FIELDS = 30;

    public const MAX_OPTIONS = 30;

    public const MAX_LABEL = 200;

    /**
     * The longest each piece of text may be, in characters.
     */
    public const NAME_LENGTH = 100;

    public const SUBMIT_LENGTH = 60;

    public const SUCCESS_LENGTH = 500;

    public const SUBJECT_LENGTH = 200;

    public const MESSAGE_LENGTH = 1000;

    public const EMAIL_LENGTH = 200;

    public const WEBHOOK_LENGTH = 500;

    /**
     * A textarea's height in rows: from MIN_ROWS to MAX_ROWS, DEFAULT_ROWS
     * when it has none.
     */
    public const MIN_ROWS = 2;

    public const MAX_ROWS = 12;

    public const DEFAULT_ROWS = 4;

    /**
     * @param  array<string, mixed>  $form  a normalized form
     */
    private function __construct(private readonly array $form) {}

    /**
     * The form of a form block, from its props (`form` is the JSON string).
     *
     * @param  array<mixed>  $props
     */
    public static function fromProps(array $props): self
    {
        return new self(self::normalize(self::decode($props['form'] ?? null)));
    }

    /**
     * @return array<mixed>
     */
    public static function decode(mixed $json): array
    {
        $form = is_string($json) && $json !== '' ? json_decode($json, true) : null;

        return is_array($form) && ! array_is_list($form) ? $form : [];
    }

    /**
     * @param  array<string, mixed>  $form
     */
    public static function encode(array $form): string
    {
        return (string) json_encode($form, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Every part cleaned: known field types, unique field names, labels and
     * options cut to size, and at most one action of each kind with a safe
     * address. Words are kept as written; the renderer escapes them.
     *
     * @return array{name: string, fields: list<array<string, mixed>>, submit: array{text: string, align: string}, success: string, actions: list<array<string, string>>}
     */
    public static function normalize(mixed $raw): array
    {
        $raw = is_array($raw) ? $raw : [];
        $submit = is_array($raw['submit'] ?? null) ? $raw['submit'] : [];

        return [
            'name' => self::words($raw['name'] ?? null, self::NAME_LENGTH),
            'fields' => FormFields::clean($raw['fields'] ?? null),
            'submit' => [
                'text' => self::words($submit['text'] ?? null, self::SUBMIT_LENGTH),
                'align' => in_array($submit['align'] ?? null, self::ALIGNS, true) ? $submit['align'] : 'left',
            ],
            'success' => self::words($raw['success'] ?? null, self::SUCCESS_LENGTH),
            'actions' => self::cleanActions($raw['actions'] ?? null),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fields(): array
    {
        return $this->form['fields'];
    }

    /**
     * @return list<array<string, string>>
     */
    public function actions(): array
    {
        return $this->form['actions'];
    }

    /**
     * @return array<string, string>|null
     */
    public function action(string $type): ?array
    {
        foreach ($this->form['actions'] as $action) {
            if ($action['type'] === $type) {
                return $action;
            }
        }

        return null;
    }

    public function name(): string
    {
        return $this->form['name'];
    }

    /**
     * @return array{text: string, align: string}
     */
    public function submit(): array
    {
        return $this->form['submit'];
    }

    public function success(): string
    {
        return $this->form['success'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->form;
    }

    /**
     * Validation rules for what a visitor sends, by field name.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $rules = [];

        foreach ($this->form['fields'] as $field) {
            $presence = $field['required'] ? 'required' : 'nullable';
            $options = $field['options'] ?? [];

            $rules[$field['name']] = match ($field['type']) {
                'email' => [$presence, 'email', 'max:200'],
                'tel' => [$presence, 'string', 'max:40', 'regex:/^[0-9+()\s.-]*$/'],
                'number' => [$presence, 'numeric'],
                'date' => [$presence, 'date'],
                'textarea' => [$presence, 'string', 'max:5000'],
                'select', 'radio' => [$presence, 'string', Rule::in($options)],
                'checkboxes' => [$presence, 'array', 'max:'.max(1, count($options))],
                'consent' => $field['required'] ? ['accepted'] : ['nullable', 'in:1,on,yes,true'],
                default => [$presence, 'string', 'max:500'],
            };

            if ($field['type'] === 'checkboxes') {
                $rules[$field['name'].'.*'] = ['string', Rule::in($options)];
            }
        }

        return $rules;
    }

    /**
     * Plain words, trimmed and cut to `$max` characters.
     */
    public static function words(mixed $value, int $max): string
    {
        return is_string($value) ? Str::limit(trim($value), $max, '') : '';
    }

    /**
     * @return list<array<string, string>>
     */
    private static function cleanActions(mixed $actions): array
    {
        $clean = [];

        foreach (is_array($actions) ? $actions : [] as $action) {
            $type = is_array($action) ? ($action['type'] ?? null) : null;

            if (! in_array($type, self::ACTIONS, true) || isset($clean[$type])) {
                continue;
            }

            $action = self::cleanAction($type, $action);

            if ($action !== null) {
                $clean[$type] = $action;
            }
        }

        return array_values($clean);
    }

    /**
     * @param  array<mixed>  $action
     * @return array<string, string>|null
     */
    private static function cleanAction(string $type, array $action): ?array
    {
        $to = is_string($action['to'] ?? null) ? trim($action['to']) : '';
        $url = $action['url'] ?? null;

        return match ($type) {
            'email' => ($to = self::email($to)) === null ? null : ['type' => 'email', 'to' => $to, 'subject' => self::words($action['subject'] ?? null, self::SUBJECT_LENGTH)],
            'whatsapp' => ($to = self::phone($to)) === null ? null : ['type' => 'whatsapp', 'to' => $to, 'message' => self::words($action['message'] ?? null, self::MESSAGE_LENGTH)],
            'redirect' => ($url = Urls::link($url) ?? DynamicValues::reference($url)) === null ? null : ['type' => 'redirect', 'url' => $url],
            'webhook' => ($url = self::webhook($url)) === null ? null : ['type' => 'webhook', 'url' => $url],
        };
    }

    /**
     * An email address, or a dynamic value such as `@site.email`.
     */
    private static function email(string $to): ?string
    {
        return DynamicValues::reference($to) ?? (strlen($to) <= self::EMAIL_LENGTH && filter_var($to, FILTER_VALIDATE_EMAIL) !== false ? $to : null);
    }

    /**
     * A phone number (8 to 15 digits, a leading + kept), or a dynamic value.
     */
    private static function phone(string $to): ?string
    {
        $number = (string) preg_replace('/[\s().-]/', '', $to);

        return DynamicValues::reference($to) ?? (preg_match('/^\+?\d{8,15}$/', $number) === 1 ? $number : null);
    }

    /**
     * Webhooks are https only. Developer only (Content\PageValue::guard()).
     */
    private static function webhook(mixed $url): ?string
    {
        return is_string($url) && strlen($url) <= self::WEBHOOK_LENGTH && str_starts_with($url, 'https://') && filter_var($url, FILTER_VALIDATE_URL) !== false ? $url : null;
    }
}
