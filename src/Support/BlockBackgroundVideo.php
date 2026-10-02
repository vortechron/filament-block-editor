<?php

namespace Vortechron\FilamentBlockEditor\Support;

/**
 * Turns a pasted video link into something that can play silently behind a
 * content block. YouTube and Vimeo links become player embeds with autoplay,
 * mute and loop switched on; any other link is treated as a direct video
 * file and played with a <video> tag.
 */
final class BlockBackgroundVideo
{
    /**
     * The embed URL tuned for a background, or null when the link is a
     * direct file (or empty).
     */
    public static function embedUrl(?string $url): ?string
    {
        $embed = BlockNoteRenderer::videoEmbedUrl($url);

        if ($embed === null) {
            return null;
        }

        if (preg_match('~youtube-nocookie\.com/embed/([\w-]+)~', $embed, $matches)) {
            return self::withQuery($embed, [
                'autoplay' => 1,
                'mute' => 1,
                'loop' => 1,
                'playlist' => $matches[1],
                'controls' => 0,
                'rel' => 0,
                'modestbranding' => 1,
                'playsinline' => 1,
                'disablekb' => 1,
                'iv_load_policy' => 3,
            ]);
        }

        if (str_contains($embed, 'player.vimeo.com/')) {
            return self::withQuery($embed, [
                'background' => 1,
                'autoplay' => 1,
                'muted' => 1,
                'loop' => 1,
            ]);
        }

        return self::withQuery($embed, ['autoplay' => 1, 'muted' => 1]);
    }

    /**
     * Append parameters to an embed URL that may already carry a query
     * string, such as a Vimeo privacy hash.
     *
     * @param  array<string, int|string>  $parameters
     */
    private static function withQuery(string $url, array $parameters): string
    {
        return $url.(str_contains($url, '?') ? '&' : '?').http_build_query($parameters);
    }

    public static function isEmbed(?string $url): bool
    {
        return self::embedUrl($url) !== null;
    }
}
