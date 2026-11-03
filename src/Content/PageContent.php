<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Closure;
use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Enums\SectionFont;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Styling\Advanced;
use Vortechron\FilamentBlockEditor\Styling\StyleBag;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * The sections a page is built from. Each one is a "free design" section: a
 * BlockNote document, and the look of the section around it. The builder,
 * the public page and any writer share this shape:
 *
 *     [['id' => 'a1b2c3d4', 'type' => 'rich', 'data' => [...]], ...]
 *
 * A section the author hid also has 'hidden' => true. It stays in the
 * builder but is left off the public page. A developer may lock a section
 * ('lock' => ['move' => true, ...], see LOCKS); PageValue::guard() keeps
 * the lock when someone else saves.
 *
 * A synced section is a reference to a section kept somewhere else (see
 * SectionResolver). It has no data of its own:
 *
 *     ['id' => 'k9x8', 'type' => 'ref', 'ref' => 12]
 *
 * normalize() is the only way content should reach your storage. It keeps
 * known fields and drops anything else, and gives a block whose id is
 * already used earlier on the page a new one (UniqueBlockIds).
 */
final class PageContent
{
    public const MAX_SECTIONS = 30;

    public const TYPE = 'rich';

    public const REF = 'ref';

    /**
     * What a lock can stop: moving the section, removing or hiding it,
     * changing its document, and changing its look (the look fields,
     * `style` and `advanced`).
     */
    public const LOCKS = ['move', 'remove', 'content', 'style'];

    /**
     * The longest an id or an anchor may be.
     */
    public const MAX_NAME_LENGTH = 40;

    /**
     * Field specs of a section. "enum:a,b" allows listed values (the first is
     * the default). `layout` is a Enums\SectionLayout and `font` an
     * Enums\SectionFont. `image` is the background picture: a web address or
     * a path on this site. A null `text_color` picks dark or white text by
     * itself. `anchor` is the id the section can be linked to with "#anchor".
     *
     * @var array<string, string>
     */
    private const FIELDS = [
        'document' => 'blocknote',
        'layout' => 'layout',
        'background' => 'enum:none,color,image',
        'background_color' => 'color',
        'image' => 'image',
        'tint' => 'percent',
        'card' => 'boolean',
        'padding' => 'enum:md,none,sm,lg,xl',
        'font' => 'font',
        'align' => 'enum:auto,left,center',
        'text_color' => 'color',
        'corners' => 'enum:theme,square,soft,round',
        'button' => 'enum:theme,solid,outline,pill,shadow',
        'width' => 'enum:normal,full',
        'anchor' => 'anchor',
    ];

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return [self::TYPE, self::REF];
    }

    /**
     * Request validation for the raw sections array. Field-level cleaning
     * happens in normalize(), so these rules only guard the outer shape.
     *
     * @return array<string, list<string|Closure>>
     */
    public static function rules(string $attribute = 'sections'): array
    {
        return [
            $attribute => ['present', 'array', 'max:'.self::MAX_SECTIONS],
            "{$attribute}.*" => ['array', function (string $attribute, mixed $value, Closure $fail): void {
                if (is_array($value) && ($value['type'] ?? null) === self::REF && self::ref($value['ref'] ?? null) === null) {
                    $fail(__('filament-block-editor::builder.errors.ref_needed'));
                }
            }],
            "{$attribute}.*.type" => ['required', 'string', 'in:'.implode(',', self::types())],
            "{$attribute}.*.data" => ['nullable', 'array'],
            "{$attribute}.*.data.document" => ['sometimes', 'nullable', 'array', function (string $attribute, mixed $value, Closure $fail): void {
                if (BlockNoteDocument::isTooBig($value)) {
                    $fail(__('filament-block-editor::page.section_too_long'));
                }
            }],
            "{$attribute}.*.hidden" => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @param  array<mixed>  $sections
     * @return list<array<string, mixed>>
     */
    public static function normalize(array $sections): array
    {
        $normalized = [];

        foreach (array_slice(array_values($sections), 0, self::MAX_SECTIONS) as $section) {
            $clean = is_array($section) ? self::section($section) : null;

            if ($clean !== null) {
                $normalized[] = $clean;
            }
        }

        return UniqueBlockIds::apply($normalized);
    }

    /**
     * One section cleaned, or null when it is not one.
     *
     * @param  array<mixed>  $section
     * @return array<string, mixed>|null
     */
    private static function section(array $section): ?array
    {
        $type = $section['type'] ?? null;

        if ($type !== self::TYPE && $type !== self::REF) {
            return null;
        }

        $id = is_string($section['id'] ?? null) ? (string) preg_replace('/[^A-Za-z0-9_-]/', '', $section['id']) : '';
        $id = $id !== '' ? Str::limit($id, self::MAX_NAME_LENGTH, '') : self::newId();
        $hidden = filter_var($section['hidden'] ?? false, FILTER_VALIDATE_BOOLEAN) ? ['hidden' => true] : [];

        if ($type === self::REF) {
            $ref = self::ref($section['ref'] ?? null);

            return $ref === null ? null : ['id' => $id, 'type' => self::REF, 'ref' => $ref, ...$hidden];
        }

        $lock = self::lock($section['lock'] ?? null);

        return [
            'id' => $id,
            'type' => self::TYPE,
            'data' => self::cleanFields(is_array($section['data'] ?? null) ? $section['data'] : []),
            ...$hidden,
            ...($lock === [] ? [] : ['lock' => $lock]),
        ];
    }

    /**
     * The id of a synced section: a positive whole number, or an id of
     * letters, digits, dashes and underscores (MAX_NAME_LENGTH at most).
     * A string of digits is read as a number.
     */
    public static function ref(mixed $ref): int|string|null
    {
        if (is_int($ref)) {
            return $ref > 0 ? $ref : null;
        }

        if (! is_string($ref) || preg_match('/^[A-Za-z0-9_-]{1,'.self::MAX_NAME_LENGTH.'}$/', $ref) !== 1) {
            return null;
        }

        return ctype_digit($ref) ? ((int) $ref > 0 ? (int) $ref : null) : $ref;
    }

    /**
     * The lock keys that are true, in LOCKS order.
     *
     * @return array<string, true>
     */
    public static function lock(mixed $lock): array
    {
        if (! is_array($lock)) {
            return [];
        }

        $clean = [];

        foreach (self::LOCKS as $key) {
            if (filter_var($lock[$key] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                $clean[$key] = true;
            }
        }

        return $clean;
    }

    /**
     * The sections people see.
     *
     * @param  list<array<string, mixed>>  $sections
     * @return list<array<string, mixed>>
     */
    public static function visible(array $sections): array
    {
        return array_values(array_filter($sections, fn (array $section): bool => ! ($section['hidden'] ?? false)));
    }

    public static function newId(): string
    {
        return Str::lower(Str::random(8));
    }

    /**
     * The fields, then `style` (Styling\StyleBag) and `advanced`
     * (Styling\Advanced) when they hold anything: on top of the simple
     * look fields, and winning over them when both set the same thing.
     *
     * @param  array<mixed>  $data
     * @return array<string, mixed>
     */
    private static function cleanFields(array $data): array
    {
        $clean = [];

        foreach (self::FIELDS as $name => $spec) {
            $clean[$name] = self::cleanValue($spec, $data[$name] ?? null);
        }

        $style = StyleBag::clean($data['style'] ?? null);
        $advanced = Advanced::clean($data['advanced'] ?? null);

        return [
            ...$clean,
            ...($style === [] ? [] : ['style' => $style]),
            ...($advanced === [] ? [] : ['advanced' => $advanced]),
        ];
    }

    private static function cleanValue(string $spec, mixed $value): mixed
    {
        if (str_starts_with($spec, 'enum:')) {
            $allowed = explode(',', substr($spec, 5));

            return in_array($value, $allowed, true) ? $value : $allowed[0];
        }

        return match ($spec) {
            'image' => Urls::media($value),
            'percent' => is_numeric($value) ? max(0, min(100, (int) $value)) : 40,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'color' => self::color($value),
            'anchor' => self::anchor($value),
            'blocknote' => BlockNoteDocument::clean($value),
            'layout' => (is_string($value) ? SectionLayout::tryFrom($value) : null)->value ?? SectionLayout::Plain->value,
            'font' => (is_string($value) ? SectionFont::tryFrom($value) : null)->value ?? SectionFont::Theme->value,
            default => null,
        };
    }

    /**
     * A lowercase "#rrggbb", or null.
     */
    private static function color(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^#[0-9a-f]{6}$/i', trim($value)) === 1 ? strtolower(trim($value)) : null;
    }

    /**
     * A slug a "#anchor" link can point to: lowercase words joined by single
     * dashes, at most MAX_NAME_LENGTH characters. Spaces become dashes; a
     * value that is still not a slug is null.
     */
    private static function anchor(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $slug = (string) preg_replace('/\s+/u', '-', mb_strtolower(trim($value)));

        return strlen($slug) <= self::MAX_NAME_LENGTH && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1 ? $slug : null;
    }
}
