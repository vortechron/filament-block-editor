<?php

namespace Vortechron\FilamentBlockEditor\Styling;

/**
 * The `look` prop every block carries: a JSON string of
 * `{ "style": {...}, "advanced": {...} }` (StyleBag and Advanced), because
 * BlockNote props hold only plain values. An empty look is "".
 */
final class Look
{
    /**
     * The look cleaned and stored again as compact JSON, or "" when
     * nothing in it is valid.
     */
    public static function clean(mixed $look): string
    {
        return self::encode(self::decode($look));
    }

    /**
     * The cleaned parts of a stored look. Missing parts are left out.
     *
     * @return array{style?: array<string, array<string, string>>, advanced?: array<string, mixed>}
     */
    public static function decode(mixed $look): array
    {
        $raw = is_string($look) && $look !== '' ? json_decode($look, true) : null;

        if (! is_array($raw) || array_is_list($raw)) {
            return [];
        }

        $style = StyleBag::clean($raw['style'] ?? null);
        $advanced = Advanced::clean($raw['advanced'] ?? null);

        return [
            ...($style === [] ? [] : ['style' => $style]),
            ...($advanced === [] ? [] : ['advanced' => $advanced]),
        ];
    }

    /**
     * @param  array{style?: array<mixed>, advanced?: array<mixed>}  $look
     */
    public static function encode(array $look): string
    {
        $look = array_filter(['style' => $look['style'] ?? [], 'advanced' => $look['advanced'] ?? []], fn (array $part): bool => $part !== []);

        return $look === [] ? '' : (string) json_encode($look, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
