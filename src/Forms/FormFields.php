<?php

namespace Vortechron\FilamentBlockEditor\Forms;

use Illuminate\Support\Str;

/**
 * Cleans the fields of a form (FormDefinition). Each field comes out with
 * every key: `id`, `type`, `name`, `label`, `placeholder`, `required`,
 * `width`, plus `options` for a choice and `rows` for a textarea.
 *
 * A name is `[a-z][a-z0-9_]{0,39}`. A missing or bad one is made from the
 * label; a name used twice gets `_2`, `_3`, ... so every name is unique.
 */
final class FormFields
{
    private const NAME = '/^[a-z][a-z0-9_]{0,39}$/';

    /**
     * @return list<array<string, mixed>>
     */
    public static function clean(mixed $fields): array
    {
        $clean = [];
        $names = [];

        foreach (is_array($fields) ? array_values(array_filter($fields, is_array(...))) : [] as $field) {
            if (count($clean) >= FormDefinition::MAX_FIELDS) {
                break;
            }

            $type = in_array($field['type'] ?? null, FormDefinition::FIELD_TYPES, true) ? $field['type'] : 'text';
            $label = FormDefinition::words($field['label'] ?? null, FormDefinition::MAX_LABEL);
            $name = self::uniqueName(self::name($field['name'] ?? null, $label), $names);
            $names[] = $name;
            $id = is_string($field['id'] ?? null) ? substr((string) preg_replace('/[^A-Za-z0-9_-]/', '', $field['id']), 0, 40) : '';

            $clean[] = [
                'id' => $id !== '' ? $id : Str::lower(Str::random(8)),
                'type' => $type,
                'name' => $name,
                'label' => $label,
                'placeholder' => FormDefinition::words($field['placeholder'] ?? null, FormDefinition::MAX_LABEL),
                'required' => filter_var($field['required'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'width' => ($field['width'] ?? null) === 'half' ? 'half' : 'full',
                ...(in_array($type, FormDefinition::CHOICE_TYPES, true) ? ['options' => self::options($field['options'] ?? null)] : []),
                ...($type === 'textarea' ? ['rows' => is_numeric($field['rows'] ?? null) ? max(2, min(12, (int) $field['rows'])) : 4] : []),
            ];
        }

        return $clean;
    }

    private static function name(mixed $name, string $label): string
    {
        if (is_string($name) && preg_match(self::NAME, $name) === 1) {
            return $name;
        }

        $fromLabel = substr(Str::slug(is_string($name) && $name !== '' ? $name : $label, '_'), 0, 40);

        return preg_match(self::NAME, $fromLabel) === 1 ? $fromLabel : 'field';
    }

    /**
     * @param  list<string>  $taken
     */
    private static function uniqueName(string $name, array $taken): string
    {
        $unique = $name;

        for ($number = 2; in_array($unique, $taken, true); $number++) {
            $unique = substr($name, 0, 40 - strlen("_{$number}"))."_{$number}";
        }

        return $unique;
    }

    /**
     * @return list<string>
     */
    private static function options(mixed $options): array
    {
        $clean = [];

        foreach (is_array($options) ? $options : [] as $option) {
            $option = FormDefinition::words($option, FormDefinition::MAX_LABEL);

            if ($option !== '' && ! in_array($option, $clean, true)) {
                $clean[] = $option;
            }
        }

        return array_slice($clean, 0, FormDefinition::MAX_OPTIONS);
    }
}
