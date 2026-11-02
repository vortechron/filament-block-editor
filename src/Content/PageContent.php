<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Closure;
use Illuminate\Support\Str;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\Enums\SectionFont;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * The sections a page is built from. Each one is a "free design" section: a
 * BlockNote document, and the look of the section around it. The builder,
 * the public page and any writer share this shape:
 *
 *     [['id' => 'a1b2c3d4', 'type' => 'rich', 'data' => [...]], ...]
 *
 * A section the author hid also has 'hidden' => true. It stays in the
 * builder but is left off the public page.
 *
 * normalize() is the only way content should reach your storage. It keeps
 * known fields and drops anything else.
 */
final class PageContent
{
    public const MAX_SECTIONS = 30;

    public const TYPE = 'rich';

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
        return [self::TYPE];
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
            "{$attribute}.*" => ['array'],
            "{$attribute}.*.type" => ['required', 'string', 'in:'.self::TYPE],
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
     * @return list<array{id: string, type: string, data: array<string, mixed>, hidden?: true}>
     */
    public static function normalize(array $sections): array
    {
        $normalized = [];

        foreach (array_slice(array_values($sections), 0, self::MAX_SECTIONS) as $section) {
            if (! is_array($section) || ($section['type'] ?? null) !== self::TYPE) {
                continue;
            }

            $id = is_string($section['id'] ?? null) ? preg_replace('/[^A-Za-z0-9_-]/', '', $section['id']) : '';
            $data = is_array($section['data'] ?? null) ? $section['data'] : [];
            $isHidden = filter_var($section['hidden'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $normalized[] = [
                'id' => $id !== '' && $id !== null ? Str::limit($id, self::MAX_NAME_LENGTH, '') : self::newId(),
                'type' => self::TYPE,
                'data' => self::cleanFields($data),
                ...($isHidden ? ['hidden' => true] : []),
            ];
        }

        return $normalized;
    }

    /**
     * The sections people see.
     *
     * @param  list<array{id: string, type: string, data: array<string, mixed>, hidden?: true}>  $sections
     * @return list<array{id: string, type: string, data: array<string, mixed>, hidden?: true}>
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
     * @param  array<mixed>  $data
     * @return array<string, mixed>
     */
    private static function cleanFields(array $data): array
    {
        $clean = [];

        foreach (self::FIELDS as $name => $spec) {
            $clean[$name] = self::cleanValue($spec, $data[$name] ?? null);
        }

        return $clean;
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
