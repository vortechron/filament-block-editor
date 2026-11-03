<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Vortechron\FilamentBlockEditor\Forms\FormDefinition;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * Builds BlockNote blocks in the shape the editor saves, for the section
 * templates, a starter page or a data migration. BlockNote fills in ids and
 * any prop left out when it opens the document.
 *
 * `gallery`, `button`, `ownBlock` and `form` are this package's own blocks (see the
 * builder's blocks and Blocks\BlockRegistry).
 */
final class Blocks
{
    public const GALLERY = 'gallery';

    public const BUTTON = 'button';

    public const OWN_BLOCK = 'ownBlock';

    public const FORM = 'form';

    public const BUTTON_VARIANTS = ['solid', 'outline'];

    /**
     * The most photos one slideshow holds.
     */
    public const MAX_GALLERY_PHOTOS = 10;

    /**
     * @return array<string, mixed>
     */
    public static function heading(int $level, string $text, string $alignment = 'left'): array
    {
        return self::block('heading', ['level' => min(max($level, 1), 4), 'textAlignment' => $alignment], self::text($text));
    }

    /**
     * A "\n" inside the text is a line break inside the paragraph.
     *
     * @return array<string, mixed>
     */
    public static function paragraph(string $text, string $alignment = 'left'): array
    {
        return self::block('paragraph', ['textAlignment' => $alignment], self::text($text));
    }

    /**
     * @return array<string, mixed>
     */
    public static function bullet(string $text): array
    {
        return self::block('bulletListItem', [], self::text($text));
    }

    /**
     * @return array<string, mixed>
     */
    public static function numbered(string $text): array
    {
        return self::block('numberedListItem', [], self::text($text));
    }

    /**
     * @return array<string, mixed>
     */
    public static function quote(string $text): array
    {
        return self::block('quote', [], self::text($text));
    }

    /**
     * A fold-out item: the title shows, the children open under it.
     *
     * @param  list<array<string, mixed>>  $children
     * @return array<string, mixed>
     */
    public static function toggle(string $title, array $children): array
    {
        return [...self::block('toggleListItem', [], self::text($title, ['bold' => true])), 'children' => $children];
    }

    /**
     * @return array<string, mixed>
     */
    public static function image(string $url, string $caption = ''): array
    {
        return self::block('image', ['url' => $url, 'caption' => $caption]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function video(string $url): array
    {
        return self::block('video', ['url' => $url]);
    }

    /**
     * A photo slideshow people swipe through. BlockNote props hold only
     * text, so the photo addresses are kept one per line.
     *
     * @param  list<string>  $urls
     * @return array<string, mixed>
     */
    public static function gallery(array $urls): array
    {
        return self::block(self::GALLERY, ['images' => implode("\n", $urls)]);
    }

    /**
     * A link that looks like a button. `$url` may be a web address, a
     * mailto: or tel: link, an "#anchor" or a path on this site; anything
     * else draws as a plain label.
     *
     * @param  'solid'|'outline'  $variant
     * @return array<string, mixed>
     */
    public static function button(string $text, string $url, string $variant = 'solid'): array
    {
        return self::block(self::BUTTON, ['text' => $text, 'url' => $url, 'variant' => $variant]);
    }

    /**
     * A block the host app defines and draws (Blocks\BlockRegistry). BlockNote
     * props hold only text, so `values` is kept as a JSON object string.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    public static function ownBlock(string $kind, array $values = []): array
    {
        return self::block(self::OWN_BLOCK, ['kind' => $kind, 'values' => self::encodeValues($values)]);
    }

    /**
     * A form anyone can build (Forms\FormDefinition). BlockNote props hold
     * only text, so the form is kept as a JSON string in `form`.
     *
     * @param  array<string, mixed>  $form
     * @return array<string, mixed>
     */
    public static function form(array $form = []): array
    {
        return self::block(self::FORM, ['form' => FormDefinition::encode(FormDefinition::normalize($form)), 'look' => '']);
    }

    /**
     * A dynamic value inside text (Content\DynamicValues), for a block's content.
     *
     * @return array{type: string, props: array{key: string}}
     */
    public static function dynamic(string $key): array
    {
        return ['type' => 'dynamic', 'props' => ['key' => $key]];
    }

    /**
     * The values of an own block as the JSON object string its prop holds.
     *
     * @param  array<mixed>  $values
     */
    public static function encodeValues(array $values): string
    {
        return $values === [] ? '{}' : (json_encode($values, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR) ?: '{}');
    }

    /**
     * The values of an own block from its `values` prop: the JSON object it
     * holds, or an empty array for anything else.
     *
     * @return array<string, mixed>
     */
    public static function decodeValues(mixed $json): array
    {
        if (! is_string($json) || trim($json) === '') {
            return [];
        }

        $values = json_decode($json, true);

        return is_array($values) && ! array_is_list($values) ? $values : [];
    }

    /**
     * The photo addresses of a slideshow's `images` prop: web or own-site
     * addresses only, each once, at most MAX_GALLERY_PHOTOS.
     *
     * @return list<string>
     */
    public static function galleryUrls(mixed $images): array
    {
        if (! is_string($images)) {
            return [];
        }

        $urls = array_filter(
            array_map(trim(...), explode("\n", $images)),
            fn (string $url): bool => Urls::media($url) !== null,
        );

        return array_slice(array_values(array_unique($urls)), 0, self::MAX_GALLERY_PHOTOS);
    }

    /**
     * @param  array<string, mixed>  $props
     * @param  list<array<string, mixed>>  $content
     * @return array<string, mixed>
     */
    private static function block(string $type, array $props = [], array $content = []): array
    {
        return ['type' => $type, 'props' => $props, 'content' => $content, 'children' => []];
    }

    /**
     * @param  array<string, bool>  $styles
     * @return list<array{type: string, text: string, styles: array<string, bool>}>
     */
    private static function text(string $text, array $styles = []): array
    {
        return $text === '' ? [] : [['type' => 'text', 'text' => $text, 'styles' => $styles]];
    }
}
