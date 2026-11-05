<?php

namespace Vortechron\FilamentBlockEditor\Blocks;

use Closure;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * One field of an own block (OwnBlock). The builder draws a form input for
 * it; clean() enforces its type on the PHP side before the block is drawn.
 *
 *     Field::text('heading')->label('Heading')->default('Stationery')
 *     Field::list('items')->fields([Field::text('name')])->maxItems(6)
 *     Field::select('category')->options(fn (): array => Category::pluck('name', 'id')->all())
 */
final class Field
{
    public const TYPES = ['text', 'textarea', 'select', 'toggle', 'number', 'image', 'link', 'list'];

    private string $label;

    private mixed $default = null;

    /**
     * @var list<array{value: string, label: string}>
     */
    private array $options = [];

    /**
     * Reads the choices when they are needed, such as from the database.
     */
    private ?Closure $optionsFrom = null;

    /**
     * Draws each choice of a select as a picture in the builder.
     */
    private ?Closure $icons = null;

    /**
     * @var list<Field>
     */
    private array $fields = [];

    private ?int $maxItems = null;

    private int|float|null $min = null;

    private int|float|null $max = null;

    private bool $developerOnly = false;

    private function __construct(public readonly string $name, public readonly string $type)
    {
        if (preg_match('/^[A-Za-z0-9_-]+$/', $name) !== 1) {
            throw new InvalidArgumentException("A field name may only hold letters, digits, dashes and underscores. Got [{$name}].");
        }

        $this->label = Str::headline($name);
    }

    public static function text(string $name): self
    {
        return new self($name, 'text');
    }

    public static function textarea(string $name): self
    {
        return new self($name, 'textarea');
    }

    public static function select(string $name): self
    {
        return new self($name, 'select');
    }

    public static function toggle(string $name): self
    {
        return new self($name, 'toggle');
    }

    public static function number(string $name): self
    {
        return new self($name, 'number');
    }

    /**
     * A picture: a web address or a path on this site, from the builder's upload.
     */
    public static function image(string $name): self
    {
        return new self($name, 'image');
    }

    /**
     * A link, with the same allow-list as the button block: http(s), mailto:,
     * tel:, "#anchor" and paths on this site.
     */
    public static function link(string $name): self
    {
        return new self($name, 'link');
    }

    /**
     * A repeating group of fields, such as a list of items.
     */
    public static function list(string $name): self
    {
        return new self($name, 'list');
    }

    public function label(string $label): self
    {
        $this->label = $label;

        return $this;
    }

    public function default(mixed $default): self
    {
        $this->default = $default;

        return $this;
    }

    /**
     * The choices of a select: `['value' => 'Label']` (`[8 => 'Pens']` too,
     * keyed by id), or a list of
     * `['value' => ..., 'label' => ...]`, or a list of plain strings. A
     * closure returning one of those is read each time the choices are
     * needed (the builder opens, a block is saved or drawn), so choices
     * from the database, like the shop's categories, are always current.
     *
     * @param  array<int|string, mixed>|Closure(): array<int|string, mixed>  $options
     */
    public function options(array|Closure $options): self
    {
        $this->optionsFrom = $options instanceof Closure ? $options : null;
        $this->options = $options instanceof Closure ? [] : self::normalOptions($options);

        return $this;
    }

    /**
     * Shows each choice of a select as a picture in the builder, so the
     * owner sees the icon instead of its name: the closure gets a choice's
     * value and returns an inline `<svg>`, or null for none. The builder
     * keeps only plain shapes from it (no scripts, links or styles).
     *
     *     Field::select('icon')->options(Icons::choices())->icons(fn (string $name) => Icons::svg($name))
     *
     * @param  Closure(string): ?string  $svg
     */
    public function icons(Closure $svg): self
    {
        $this->icons = $svg;

        return $this;
    }

    /**
     * @param  array<int|string, mixed>  $options
     * @return list<array{value: string, label: string}>
     */
    private static function normalOptions(array $options): array
    {
        $normal = [];
        // `[8 => 'Pens']` keys by id; only a plain list is a list of values.
        $plain = array_is_list($options);

        foreach ($options as $key => $option) {
            $normal[] = match (true) {
                is_array($option) && isset($option['value']) => ['value' => (string) $option['value'], 'label' => (string) ($option['label'] ?? $option['value'])],
                $plain && is_scalar($option) => ['value' => (string) $option, 'label' => (string) $option],
                default => ['value' => (string) $key, 'label' => is_scalar($option) ? (string) $option : (string) $key],
            };
        }

        return $normal;
    }

    /**
     * The choices with their picture, for the builder.
     *
     * @return list<array{value: string, label: string, svg?: string}>
     */
    private function choicesWithIcons(): array
    {
        if ($this->icons === null) {
            return $this->choices();
        }

        return array_map(function (array $option): array {
            $svg = ($this->icons)($option['value']);

            return is_string($svg) && str_starts_with(ltrim($svg), '<svg') ? [...$option, 'svg' => trim($svg)] : $option;
        }, $this->choices());
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function choices(): array
    {
        if ($this->optionsFrom === null) {
            return $this->options;
        }

        $options = ($this->optionsFrom)();

        return is_array($options) ? self::normalOptions($options) : [];
    }

    /**
     * The fields of each item of a list. A field inside a list may not be
     * developerOnly(): the guard keeps developer-only values by block, not
     * by list row. Make the whole list developer only instead.
     *
     * @param  list<Field>  $fields
     *
     * @throws InvalidArgumentException when one of the fields is developer only
     */
    public function fields(array $fields): self
    {
        foreach ($fields as $field) {
            if ($field instanceof self && $field->developerOnly) {
                throw new InvalidArgumentException("The [{$field->name}] field is inside the [{$this->name}] list, so it cannot be developerOnly(). Make the whole list developerOnly() instead.");
            }
        }

        $this->fields = array_values($fields);

        return $this;
    }

    public function maxItems(?int $maxItems): self
    {
        $this->maxItems = $maxItems;

        return $this;
    }

    public function min(int|float|null $min): self
    {
        $this->min = $min;

        return $this;
    }

    public function max(int|float|null $max): self
    {
        $this->max = $max;

        return $this;
    }

    /**
     * Only developers may see and change this field. The builder hides it
     * from everyone else, and Content\PageValue::guard() keeps its stored
     * value when someone else saves (a new block gets the default). Only a
     * top-level field of a block may be developer only, a whole list
     * included; one inside a list is refused (see fields()).
     */
    public function developerOnly(bool $developerOnly = true): self
    {
        $this->developerOnly = $developerOnly;

        return $this;
    }

    public function isDeveloperOnly(): bool
    {
        return $this->developerOnly;
    }

    /**
     * What the builder gets for this field.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $default = $this->defaultValue();

        return [
            'name' => $this->name,
            'label' => $this->label,
            'type' => $this->type,
            ...($this->type === 'select' ? ['options' => $this->choicesWithIcons()] : []),
            ...($this->type === 'list' ? ['fields' => array_map(fn (Field $field): array => $field->toArray(), $this->fields)] : []),
            ...($this->type === 'list' && $this->maxItems !== null ? ['maxItems' => $this->maxItems] : []),
            ...($this->type === 'number' && $this->min !== null ? ['min' => $this->min] : []),
            ...($this->type === 'number' && $this->max !== null ? ['max' => $this->max] : []),
            ...($default !== null ? ['default' => $default] : []),
            ...($this->developerOnly ? ['developerOnly' => true] : []),
        ];
    }

    /**
     * The value used when none is given, or none is valid.
     */
    public function defaultValue(): mixed
    {
        return match ($this->type) {
            'text', 'textarea' => $this->scalarText($this->default) ?? '',
            'select' => $this->selectDefault(),
            'toggle' => filter_var($this->default, FILTER_VALIDATE_BOOLEAN),
            'number' => $this->clean($this->default, useDefault: false),
            'image' => Urls::media($this->default),
            'link' => Urls::link($this->default),
            'list' => is_array($this->default) ? $this->clean($this->default, useDefault: false) : [],
        };
    }

    /**
     * The value cleaned to this field's type. Anything that does not fit
     * becomes the field's default.
     */
    public function clean(mixed $value, bool $useDefault = true): mixed
    {
        $fallback = fn (): mixed => $useDefault ? $this->defaultValue() : null;

        return match ($this->type) {
            'text', 'textarea' => $this->scalarText($value) ?? $fallback(),
            'select' => $this->cleanSelect($value) ?? $fallback(),
            'toggle' => is_bool($value) || is_scalar($value) ? filter_var($value, FILTER_VALIDATE_BOOLEAN) : $fallback(),
            'number' => $this->cleanNumber($value) ?? $fallback(),
            'image' => Urls::mediaOrReference($value) ?? $fallback(),
            'link' => Urls::linkOrReference($value) ?? $fallback(),
            'list' => is_array($value) ? $this->cleanList($value) : $fallback(),
        };
    }

    /**
     * A cleaned value with its dynamic values resolved for drawing: an
     * `@key` link or picture becomes the value it points at (checked by
     * the address rules, or null), and each `{key}` short code in a text or
     * textarea becomes its text (DynamicValues::fill()), in lists too.
     */
    public function resolve(mixed $value, RenderContext $context): mixed
    {
        return match ($this->type) {
            'text', 'textarea' => is_string($value) ? app(DynamicValues::class)->fill($value, $context) : $value,
            'image' => app(DynamicValues::class)->media($value, $context),
            'link' => app(DynamicValues::class)->link($value, $context),
            'list' => is_array($value) ? array_map(fn (mixed $item): mixed => is_array($item) ? self::resolveFields($this->fields, $item, $context) : $item, $value) : $value,
            default => $value,
        };
    }

    /**
     * @param  list<Field>  $fields
     * @param  array<string, mixed>  $values  cleaned values
     * @return array<string, mixed>
     */
    public static function resolveFields(array $fields, array $values, RenderContext $context): array
    {
        foreach ($fields as $field) {
            if (array_key_exists($field->name, $values)) {
                $values[$field->name] = $field->resolve($values[$field->name], $context);
            }
        }

        return $values;
    }

    private function scalarText(mixed $value): ?string
    {
        return is_string($value) ? $value : (is_int($value) || is_float($value) ? (string) $value : null);
    }

    private function selectDefault(): ?string
    {
        $default = $this->cleanSelect($this->default);

        return $default ?? ($this->choices()[0]['value'] ?? null);
    }

    private function cleanSelect(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value)) {
            return null;
        }

        foreach ($this->choices() as $option) {
            if ($option['value'] === (string) $value) {
                return $option['value'];
            }
        }

        return null;
    }

    private function cleanNumber(mixed $value): int|float|null
    {
        if (! is_numeric($value)) {
            return null;
        }

        $number = $value + 0;

        if (is_float($number) && ! is_finite($number)) {
            return null;
        }

        if ($this->min !== null) {
            $number = max($this->min, $number);
        }

        if ($this->max !== null) {
            $number = min($this->max, $number);
        }

        return $number;
    }

    /**
     * @param  array<mixed>  $items
     * @return list<array<string, mixed>>
     */
    private function cleanList(array $items): array
    {
        $clean = [];

        foreach (array_values($items) as $item) {
            if ($this->maxItems !== null && count($clean) >= $this->maxItems) {
                break;
            }

            if (! is_array($item)) {
                continue;
            }

            $clean[] = self::cleanFields($this->fields, $item);
        }

        return $clean;
    }

    /**
     * The values of a group of fields: the declared fields only, in
     * their order, each cleaned.
     *
     * @param  list<Field>  $fields
     * @param  array<mixed>  $values
     * @return array<string, mixed>
     */
    public static function cleanFields(array $fields, array $values): array
    {
        $clean = [];

        foreach ($fields as $field) {
            $clean[$field->name] = array_key_exists($field->name, $values) ? $field->clean($values[$field->name]) : $field->defaultValue();
        }

        return $clean;
    }
}
