<?php

namespace Vortechron\FilamentBlockEditor\Support;

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

        return preg_match('~^(https?://|mailto:|tel:|#[\w-]|/(?!/))~i', $url) === 1 ? $url : null;
    }
}
