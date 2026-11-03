<?php

namespace Vortechron\FilamentBlockEditor\Content;

use Closure;
use InvalidArgumentException;
use Stringable;
use Throwable;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * Values that come from the site, the page or an entry when a page is
 * drawn, such as the shop's phone number. One registry for the app (a
 * singleton). A value is used three ways:
 *
 * - in text: the inline content `{ "type": "dynamic", "props": { "key": "site.phone" } }`;
 * - in links (button `url`, inline link `href`, own block `link` fields):
 *   `@site.whatsapp`, resolved, then checked by Urls::link();
 * - in pictures (image and video `url`, own block `image` fields):
 *   `@entry.photo`, resolved, then checked by Urls::media();
 * - in own block `text` and `textarea` fields: a short code `{site.phone}`
 *   anywhere in the words, replaced by fill() (a text value only).
 *
 *     app(DynamicValues::class)->register('site.phone', 'Telefon', fn (RenderContext $context) => $settings->phone, settings: 'contact');
 *
 * `settings` names the settings group the value comes from (the key of a
 * shop info group, such as `contact`), so the builder can show that group
 * of the shop info form wherever the value is used.
 *
 * Values in the RenderContext win over the registry (entries put
 * `entry.*` there). drawWith() adds values for one draw, under the
 * context's: the builder's preview uses it for the host's render values.
 */
final class DynamicValues
{
    /**
     * A key: a lowercase name and one to three more dotted parts.
     */
    public const KEY = '[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,3}';

    public const TYPES = ['text', 'link', 'image'];

    /**
     * @var array<string, array{label: string, resolve: Closure, type: string, group: string, settings: string|null}>
     */
    private array $values = [];

    /**
     * Values for the draw that is running now (drawWith()), by key.
     *
     * @var array<string, mixed>
     */
    private array $drawValues = [];

    /**
     * @param  Closure(RenderContext): mixed  $resolve  gets the RenderContext; returns the value (text) or null
     * @param  'text'|'link'|'image'  $type
     * @param  string|null  $settings  the shop info group the value comes from, such as `contact`
     */
    public function register(string $key, string $label, Closure $resolve, string $type = 'text', string $group = 'Site', ?string $settings = null): self
    {
        if (! self::isKey($key)) {
            throw new InvalidArgumentException("A dynamic value key is a lowercase name and one to three dotted parts, such as site.phone. Got [{$key}].");
        }

        if (! in_array($type, self::TYPES, true)) {
            throw new InvalidArgumentException("A dynamic value type is text, link or image. Got [{$type}].");
        }

        $this->values[$key] = ['label' => $label, 'resolve' => $resolve, 'type' => $type, 'group' => $group, 'settings' => $settings === '' ? null : $settings];

        return $this;
    }

    public function forget(string $key): self
    {
        unset($this->values[$key]);

        return $this;
    }

    public function has(string $key): bool
    {
        return isset($this->values[$key]);
    }

    public function label(string $key): ?string
    {
        return $this->values[$key]['label'] ?? null;
    }

    /**
     * What the builder gets: each value with its current value as `preview`
     * (null when it is empty or cannot be read now), and its `settings`
     * group when it has one. `$context` gives the values of the page being
     * built, such as `page.title`.
     *
     * @return list<array{key: string, label: string, type: string, group: string, preview: string|null, settings?: string}>
     */
    public function definitions(?RenderContext $context = null): array
    {
        $definitions = [];

        foreach ($this->values as $key => $value) {
            $definitions[] = [
                'key' => $key, 'label' => $value['label'], 'type' => $value['type'], 'group' => $value['group'], 'preview' => $this->preview($key, $context),
                ...($value['settings'] === null ? [] : ['settings' => $value['settings']]),
            ];
        }

        return $definitions;
    }

    /**
     * A value as the builder shows it: resolved for the builder, or null
     * when it is empty or cannot be read now.
     */
    public function preview(string $key, ?RenderContext $context = null): ?string
    {
        try {
            return $this->resolve($key, $context ?? new RenderContext(forBuilder: true));
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Runs `$draw` with these values added for it (under the context's own
     * values, over the registry), then forgets them.
     *
     * @template T
     *
     * @param  array<string, mixed>  $values
     * @param  Closure(): T  $draw
     * @return T
     */
    public function drawWith(array $values, Closure $draw): mixed
    {
        $before = $this->drawValues;
        $this->drawValues = [...$before, ...$values];

        try {
            return $draw();
        } finally {
            $this->drawValues = $before;
        }
    }

    /**
     * The value as text, or null when it is empty, unknown or not text.
     */
    public function resolve(string $key, RenderContext $context): ?string
    {
        if (array_key_exists($key, $context->values)) {
            return self::text($context->values[$key]);
        }

        if (array_key_exists($key, $this->drawValues)) {
            return self::text($this->drawValues[$key]);
        }

        return isset($this->values[$key]) ? self::text(($this->values[$key]['resolve'])($context)) : null;
    }

    /**
     * Words with each short code (`{site.phone}`) replaced by its value as
     * text. A key that is not a text value here, or is empty, becomes ''.
     * Braces around anything that is not a key (`{nama}`) stay as typed.
     * The result is plain text: escape it when drawing.
     */
    public function fill(string $text, RenderContext $context): string
    {
        if (! str_contains($text, '{')) {
            return $text;
        }

        return (string) preg_replace_callback('/\{('.self::KEY.')\}/', fn (array $match): string => $this->isText($match[1], $context) ? ($this->resolve($match[1], $context) ?? '') : '', $text);
    }

    /**
     * Whether a key is a text value in this draw: registered as text, or
     * given by the context or drawWith() without being registered as a
     * link or a picture.
     */
    private function isText(string $key, RenderContext $context): bool
    {
        if (isset($this->values[$key])) {
            return $this->values[$key]['type'] === 'text';
        }

        return array_key_exists($key, $context->values) || array_key_exists($key, $this->drawValues);
    }

    /**
     * A link that may be a reference: resolved, then checked by Urls::link().
     */
    public function link(mixed $url, RenderContext $context): ?string
    {
        $reference = self::reference($url);

        return Urls::link($reference === null ? $url : $this->resolve(substr($reference, 1), $context));
    }

    /**
     * A picture that may be a reference: resolved, then checked by Urls::media().
     */
    public function media(mixed $url, RenderContext $context): ?string
    {
        $reference = self::reference($url);

        return Urls::media($reference === null ? $url : $this->resolve(substr($reference, 1), $context));
    }

    public static function isKey(mixed $key): bool
    {
        return is_string($key) && preg_match('/^'.self::KEY.'$/', $key) === 1;
    }

    /**
     * `@key` when the value is a reference to a dynamic value, else null.
     */
    public static function reference(mixed $value): ?string
    {
        return is_string($value) && str_starts_with($value, '@') && self::isKey(substr($value, 1)) ? $value : null;
    }

    private static function text(mixed $value): ?string
    {
        $text = is_scalar($value) || $value instanceof Stringable ? trim((string) $value) : '';

        return $text === '' || is_bool($value) ? null : $text;
    }
}
