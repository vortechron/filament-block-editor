<?php

namespace Vortechron\FilamentBlockEditor\Forms;

use Illuminate\Support\Str;

/**
 * Cleans the fields of a form (FormDefinition). A field of an unknown type
 * is dropped. Each field comes out with every key: `id` (unique in the
 * form), `type`, `name`, `label`, `placeholder`, `required`, `width`, plus
 * `options` for a choice and `rows` for a textarea.
 *
 * A name is `[a-z][a-z0-9_]{0,39}`. A missing or bad one is made from the
 * label; a name used twice gets `_2`, `_3`, ... so every name is unique.
 */
final class FormFields
{
    /**
     * A field name: what a visitor's answer is sent and stored under.
     */
    public const NAME = '[a-z][a-z0-9_]{0,39}';

    public const NAME_LENGTH = 40;

    /**
     * A field id: letters, digits, dashes and underscores.
     */
    public const ID_LENGTH = 40;

    /**
     * @return list<array<string, mixed>>
     */
    public static function clean(mixed $fields): array
    {
        $clean = [];
        $names = [];
        $ids = [];
        $known = array_filter(is_array($fields) ? $fields : [], fn (mixed $field): bool => is_array($field) && in_array($field['type'] ?? null, FormDefinition::FIELD_TYPES, true));

        foreach (array_slice(array_values($known), 0, FormDefinition::MAX_FIELDS) as $field) {
            $type = $field['type'];
            $label = FormDefinition::words($field['label'] ?? null, FormDefinition::MAX_LABEL);
            $name = self::uniqueName(self::name($field['name'] ?? null, $label), $names);
            $names[] = $name;
            $id = self::uniqueId($field['id'] ?? null, $ids);
            $ids[] = $id;

            $clean[] = [
                'id' => $id,
                'type' => $type,
                'name' => $name,
                'label' => $label,
                'placeholder' => FormDefinition::words($field['placeholder'] ?? null, FormDefinition::MAX_LABEL),
                'required' => filter_var($field['required'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'width' => ($field['width'] ?? null) === 'half' ? 'half' : 'full',
                ...(in_array($type, FormDefinition::CHOICE_TYPES, true) ? ['options' => self::options($field['options'] ?? null, isset($field['option_ids']))] : []),
                ...(isset($field['option_ids']) && is_array($field['option_ids']) && in_array($type, FormDefinition::CHOICE_TYPES, true) ? ['option_ids' => array_values(array_map(fn ($id) => is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/D', $id) ? $id : '', array_slice($field['option_ids'], 0, count(self::options($field['options'] ?? null, isset($field['option_ids']))))))] : []),
                ...($type === 'textarea' ? ['rows' => self::rows($field['rows'] ?? null)] : []),
            ];
        }

        return $clean;
    }

    /**
     * The field's id when it is usable and not taken yet, else a new one.
     *
     * @param  list<string>  $taken
     */
    private static function uniqueId(mixed $id, array $taken): string
    {
        $id = is_string($id) ? substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', $id), 0, self::ID_LENGTH) : '';

        while ($id === '' || in_array($id, $taken, true)) {
            $id = Str::lower(Str::random(8));
        }

        return $id;
    }

    private static function rows(mixed $rows): int
    {
        return is_numeric($rows) ? max(FormDefinition::MIN_ROWS, min(FormDefinition::MAX_ROWS, (int) $rows)) : FormDefinition::DEFAULT_ROWS;
    }

    private static function name(mixed $name, string $label): string
    {
        if (is_string($name) && preg_match('/^'.self::NAME.'$/', $name) === 1) {
            return $name;
        }

        $fromLabel = substr(Str::slug(is_string($name) && $name !== '' ? $name : $label, '_'), 0, self::NAME_LENGTH);

        return preg_match('/^'.self::NAME.'$/', $fromLabel) === 1 ? $fromLabel : 'field';
    }

    /**
     * @param  list<string>  $taken
     */
    private static function uniqueName(string $name, array $taken): string
    {
        $unique = $name;

        for ($number = 2; in_array($unique, $taken, true); $number++) {
            $unique = substr($name, 0, self::NAME_LENGTH - strlen("_{$number}"))."_{$number}";
        }

        return $unique;
    }

    /**
     * @return list<string>
     */
    private static function options(mixed $options, bool $identified = false): array
    {
        $clean = [];

        foreach (is_array($options) ? $options : [] as $option) {
            $option = FormDefinition::words($option, FormDefinition::MAX_LABEL);

            if ($identified || ($option !== '' && ! in_array($option, $clean, true))) {
                $clean[] = $option;
            }
        }

        return array_slice($clean, 0, FormDefinition::MAX_OPTIONS);
    }
}
