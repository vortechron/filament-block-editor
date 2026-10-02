{{--
    One section of a page, as the public sees it.

    <x-filament-block-editor::block :block="$block" />

    $transform (optional) receives the rendered HTML and returns new HTML, for
    example to fill in merge tags. $preview draws a light, inert version for
    the library cards in the panel.
--}}
@props(['block', 'preview' => false, 'transform' => null])

@php
    $hasMedia = $block->hasBackgroundMedia();
    $isVideo = $block->backgroundType() === \Vortechron\FilamentBlockEditor\Enums\BlockBackgroundType::Video;
    $blur = $block->backgroundBlur();
    $contentHtml = $block->renderContentHtml();

    if ($preview) {
        $contentHtml = preg_replace('/<(iframe|video|audio)\b[^>]*>.*?<\/\1>/si', '<div class="fbe-preview-video">▶ Video</div>', $contentHtml);
        $contentHtml = str_replace('<img ', '<img loading="lazy" ', $contentHtml);
    }

    if ($transform instanceof \Closure) {
        $contentHtml = $transform($contentHtml, $block);
    }
@endphp

<section
    {{ $attributes->class([
        'fbe-block',
        'fbe-block-has-bg' => $block->hasBackground(),
        'fbe-block-light-text' => $block->usesLightText(),
        'fbe-block-card' => $block->hasBackgroundCard(),
        'fbe-block-full-height' => $block->isFullHeight(),
    ]) }}
    style="{{ $block->sectionStyle() }}"
>
    @if ($preview && $hasMedia && $isVideo)
        <div class="fbe-block-bg fbe-preview-video-background">▶ Video background</div>
    @elseif ($hasMedia && $isVideo && ($embedUrl = $block->backgroundVideoEmbedUrl()))
        <div class="fbe-block-bg-layer">
            <iframe
                @class(['fbe-block-bg-embed', 'fbe-block-bg-blurred' => $blur > 0])
                style="{{ $block->backgroundMediaStyle() }}"
                src="{{ $embedUrl }}"
                title="Background video"
                allow="autoplay; encrypted-media"
                tabindex="-1"
                aria-hidden="true"
            ></iframe>
        </div>
    @elseif ($hasMedia && $isVideo)
        <video
            @class(['fbe-block-bg', 'fbe-block-bg-blurred' => $blur > 0])
            style="{{ $block->backgroundMediaStyle() }}"
            src="{{ $block->backgroundVideoUrl() }}"
            autoplay
            muted
            loop
            playsinline
        ></video>
    @elseif ($hasMedia)
        <div
            @class(['fbe-block-bg', 'fbe-block-bg-blurred' => $blur > 0])
            style="background-image: url('{{ $block->background_image_url }}'); {{ $block->backgroundMediaStyle() }}"
        ></div>
    @endif

    @if ($hasMedia && $block->backgroundTintOpacity() > 0)
        <div class="fbe-block-overlay" style="{{ $block->backgroundTintStyleCss() }}"></div>
    @endif

    <div class="fbe-block-content fbe-rich-text" style="{{ $block->contentStyle() }}">
        {!! $contentHtml !!}
    </div>
</section>
