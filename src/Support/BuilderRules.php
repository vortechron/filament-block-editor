<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Content\PageContent;
use Vortechron\FilamentBlockEditor\Content\PageValue;
use Vortechron\FilamentBlockEditor\Design\Kit;
use Vortechron\FilamentBlockEditor\Enums\DocumentKind;
use Vortechron\FilamentBlockEditor\Forms\FormDefinition;
use Vortechron\FilamentBlockEditor\Forms\FormFields;
use Vortechron\FilamentBlockEditor\Styling\Advanced;
use Vortechron\FilamentBlockEditor\Styling\CssValue;
use Vortechron\FilamentBlockEditor\Styling\CustomCss;
use Vortechron\FilamentBlockEditor\Styling\StyleBag;

/**
 * Every limit and list of words the builder checks before it sends a
 * value, taken from the classes that clean it here. PHP stays the
 * authority; the builder imports this table so the two never drift:
 *
 *     php84 bin/export-rules.php
 *
 * writes builder/src/generated/rules.json (the data) and rules.d.json.ts
 * (its exact type, so TypeScript gets every word as a literal). A test
 * fails when the committed files differ from all().
 */
final class BuilderRules
{
    /**
     * @return array<string, mixed>
     */
    public static function all(): array
    {
        return [
            'page' => [
                'version' => PageValue::VERSION,
                'max_sections' => PageContent::MAX_SECTIONS,
                'max_name_length' => PageContent::MAX_NAME_LENGTH,
                'max_title_length' => PageContent::MAX_TITLE_LENGTH,
            ],
            'style' => [
                'variants' => StyleBag::VARIANTS,
                'keys' => array_map(fn (array $key): string => $key[1], StyleBag::KEYS),
                'non_negative' => StyleBag::NON_NEGATIVE,
                'hover_keys' => StyleBag::HOVER_KEYS,
                'choices' => StyleBag::CHOICES,
                'shadows' => StyleBag::SHADOWS,
                'font_weights' => CssValue::FONT_WEIGHTS,
                'length_units' => CssValue::LENGTH_UNITS,
                'line_height' => ['min' => StyleBag::LINE_HEIGHT_MIN, 'max' => StyleBag::LINE_HEIGHT_MAX],
                'opacity' => ['min' => StyleBag::OPACITY_MIN, 'max' => StyleBag::OPACITY_MAX],
                'kit_key' => CssValue::KIT_KEY,
            ],
            'advanced' => [
                'class_name' => Advanced::CLASS_NAME,
                'reserved_class_prefix' => Advanced::RESERVED_CLASS_PREFIX,
                'max_classes' => Advanced::MAX_CLASSES,
                'devices' => Advanced::DEVICES,
                'max_css_length' => CustomCss::MAX_LENGTH,
            ],
            'form' => [
                'field_types' => FormDefinition::FIELD_TYPES,
                'choice_types' => FormDefinition::CHOICE_TYPES,
                'action_types' => FormDefinition::ACTIONS,
                'submit_aligns' => FormDefinition::ALIGNS,
                'max_fields' => FormDefinition::MAX_FIELDS,
                'max_options' => FormDefinition::MAX_OPTIONS,
                'field_name' => FormFields::NAME,
                'field_name_length' => FormFields::NAME_LENGTH,
                'field_id_length' => FormFields::ID_LENGTH,
                'label_length' => FormDefinition::MAX_LABEL,
                'placeholder_length' => FormDefinition::MAX_LABEL,
                'name_length' => FormDefinition::NAME_LENGTH,
                'submit_length' => FormDefinition::SUBMIT_LENGTH,
                'success_length' => FormDefinition::SUCCESS_LENGTH,
                'subject_length' => FormDefinition::SUBJECT_LENGTH,
                'message_length' => FormDefinition::MESSAGE_LENGTH,
                'email_length' => FormDefinition::EMAIL_LENGTH,
                'webhook_length' => FormDefinition::WEBHOOK_LENGTH,
                'rows' => ['min' => FormDefinition::MIN_ROWS, 'max' => FormDefinition::MAX_ROWS, 'default' => FormDefinition::DEFAULT_ROWS],
            ],
            'locks' => PageContent::LOCKS,
            'kit' => [
                'version' => Kit::VERSION,
                'colors' => Kit::COLORS,
                'max_custom_colors' => Kit::MAX_CUSTOM_COLORS,
                'custom_label_length' => Kit::CUSTOM_LABEL_LENGTH,
                'button_styles' => Kit::BUTTON_STYLES,
                'button_sizes' => Kit::BUTTON_SIZES,
                'form_styles' => Kit::FORM_STYLES,
                'form_labels' => Kit::FORM_LABELS,
                'text_transforms' => Kit::TEXT_TRANSFORMS,
                'defaults' => Kit::PACKAGE_DEFAULTS,
            ],
            'document_kinds' => DocumentKind::values(),
            'part_kinds' => array_map(fn (DocumentKind $kind): string => $kind->value, DocumentKind::parts()),
            'dynamic_key' => DynamicValues::KEY,
        ];
    }

    /**
     * The table as builder/src/generated/rules.json holds it.
     */
    public static function json(): string
    {
        return json_encode(self::all(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
    }

    /**
     * The exact type of rules.json, for TypeScript (rules.d.json.ts): every
     * word, number and list as a literal.
     */
    public static function typeDeclaration(): string
    {
        return "// Written by bin/export-rules.php from Support\\BuilderRules. Do not edit.\n"
            .'declare const rules: '.self::type(self::all(), '').";\n\nexport default rules;\n";
    }

    private static function type(mixed $value, string $indent): string
    {
        if (! is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }

        if (array_is_list($value)) {
            return 'readonly ['.implode(', ', array_map(fn (mixed $item): string => self::type($item, $indent), $value)).']';
        }

        $inner = $indent.'    ';
        $lines = array_map(
            fn (string|int $key, mixed $item): string => $inner.'readonly '.json_encode((string) $key, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).': '.self::type($item, $inner).';',
            array_keys($value),
            $value,
        );

        return "{\n".implode("\n", $lines)."\n".$indent.'}';
    }
}
