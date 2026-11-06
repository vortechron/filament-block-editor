<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Vortechron\FilamentBlockEditor\Content\DynamicValues;

/**
 * The address allow-lists. Every address that reaches an href or src passes
 * one of these two, whatever the stored document says.
 */
final class Urls
{
    /**
     * Pictures, video, audio and files: web addresses and paths on this site
     * ("/storage/a.jpg"). Never "//host", "data:" or "javascript:".
     */
    public static function media(mixed $url): ?string
    {
        if (! is_string($url)) {
            return null;
        }

        $url = trim($url);

        return preg_match('~^(https?://|/(?!/))~i', $url) === 1 ? $url : null;
    }

    /**
     * Links: web addresses, mailto: and tel: links, "#anchor" links and
     * paths on this site.
     */
    public static function link(mixed $url): ?string
    {
        if (! is_string($url)) {
            return null;
        }

        $url = trim($url);

        return preg_match('~^(?:https?://[^\s/?#]+[^\s]*|mailto:[^\s]+|tel:[^\s]+|#[^\s#]+|/(?!/)[^\s]*)$~iD', $url) === 1 ? $url : null;
    }

    /**
     * A link as it is stored: an address link() allows, or a reference to a
     * dynamic value such as `@site.whatsapp`, which is resolved and checked
     * by link() when the page is drawn.
     */
    public static function linkOrReference(mixed $url): ?string
    {
        return self::link($url) ?? DynamicValues::reference($url);
    }

    /**
     * A picture as it is stored: an address media() allows, or a reference
     * to a dynamic value such as `@entry.photo`.
     */
    public static function mediaOrReference(mixed $url): ?string
    {
        return self::media($url) ?? DynamicValues::reference($url);
    }
}
