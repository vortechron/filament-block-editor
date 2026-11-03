<?php

namespace Vortechron\FilamentBlockEditor\BlockNote;

use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Vortechron\FilamentBlockEditor\Support\Urls;

/**
 * Draws the media blocks for BlockNoteRenderer: photo, video, audio, file
 * and the photo slideshow. Addresses keep only http(s) and same-site paths
 * (Urls::media); a photo or video address may be a dynamic value
 * (`@entry.photo`), resolved first. In the builder an empty photo or
 * video shows where it goes; visitors see nothing.
 */
final readonly class MediaBlocks
{
    public function __construct(private RenderContext $context) {}

    /**
     * A YouTube, Vimeo or Loom link as a player address, or null for any
     * other link, which then plays in a plain <video> tag.
     */
    public static function videoEmbedUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        if (preg_match('~youtube(?:-nocookie)?\.com/watch\?.*v=([\w-]{6,})~', $url, $matches) === 1
            || preg_match('~youtube(?:-nocookie)?\.com/(?:shorts|embed|live|v)/([\w-]{6,})~', $url, $matches) === 1
            || preg_match('~youtu\.be/([\w-]{6,})~', $url, $matches) === 1) {
            return "https://www.youtube-nocookie.com/embed/{$matches[1]}";
        }

        if (preg_match('~vimeo\.com/(?:[\w-]+/)*?(?:video/)?(\d+)(?:/([a-zA-Z0-9]+))?~', $url, $matches) === 1) {
            $hash = $matches[2] ?? '';

            if ($hash === '' && preg_match('~[?&]h=([a-zA-Z0-9]+)~', $url, $query) === 1) {
                $hash = $query[1];
            }

            return "https://player.vimeo.com/video/{$matches[1]}".($hash === '' ? '' : '?h='.$hash);
        }

        if (preg_match('~loom\.com/(?:share|embed)/([\w-]+)~', $url, $matches) === 1) {
            return "https://www.loom.com/embed/{$matches[1]}";
        }

        return null;
    }

    /**
     * @param  array<mixed>  $props
     */
    public function image(array $props): string
    {
        $url = $this->media($props['url'] ?? null);

        if ($url === null) {
            return $this->emptyMedia('photo');
        }

        $width = is_numeric($props['previewWidth'] ?? null) ? (int) $props['previewWidth'] : 0;
        $caption = is_string($props['caption'] ?? null) ? trim($props['caption']) : '';

        return '<figure class="bn-image">'
            .'<img src="'.e($url).'" alt="'.e($caption).'" loading="lazy" decoding="async"'
            .($width > 0 ? ' style="width: '.$width.'px;"' : '').'>'
            .($caption === '' ? '' : '<figcaption>'.e($caption).'</figcaption>')
            .'</figure>';
    }

    /**
     * @param  array<mixed>  $props
     */
    public function video(array $props): string
    {
        $url = $this->media($props['url'] ?? null);

        if ($url === null) {
            return $this->emptyMedia('video');
        }

        $embedUrl = self::videoEmbedUrl($url);

        if ($embedUrl !== null) {
            return '<div class="bn-video-embed">'
                .'<iframe src="'.e($embedUrl).'" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>'
                .'</div>';
        }

        return '<video class="bn-video" src="'.e($url).'" controls playsinline preload="metadata"></video>';
    }

    /**
     * @param  array<mixed>  $props
     */
    public function audio(array $props): string
    {
        $url = Urls::media($props['url'] ?? null);

        return $url === null ? '' : '<audio src="'.e($url).'" controls preload="none"></audio>';
    }

    /**
     * @param  array<mixed>  $props
     */
    public function file(array $props): string
    {
        $url = Urls::media($props['url'] ?? null);

        if ($url === null) {
            return '';
        }

        $name = is_string($props['name'] ?? null) && trim($props['name']) !== '' ? trim($props['name']) : $url;

        return '<p><a href="'.e($url).'" target="_blank" rel="noopener">'.e($name).'</a></p>';
    }

    /**
     * A photo slideshow. CSS scroll snapping does the swiping; the page
     * component adds the arrows and dots with a few lines of script.
     *
     * @param  array<mixed>  $props
     */
    public function gallery(array $props): string
    {
        $images = Blocks::galleryUrls($props['images'] ?? null);

        if ($images === []) {
            return $this->emptyMedia('photo');
        }

        return view('filament-block-editor::blocks.gallery', ['images' => $images])->render();
    }

    /**
     * Where a photo or video the author has not added yet goes. Only the
     * builder shows it; visitors see nothing.
     *
     * @param  'photo'|'video'  $kind
     */
    private function emptyMedia(string $kind): string
    {
        if (! $this->context->forBuilder) {
            return '';
        }

        return '<figure class="bn-media-empty" data-empty-media="'.$kind.'"><span>'.e(__("filament-block-editor::preview.empty_{$kind}")).'</span></figure>';
    }

    /**
     * A picture or video address, its dynamic value resolved, through Urls::media().
     */
    private function media(mixed $url): ?string
    {
        return app(DynamicValues::class)->media($url, $this->context);
    }
}
