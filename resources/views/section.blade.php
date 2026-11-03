{{--
    One section of a page: its look (background, padding, font, corners,
    buttons) around the HTML of its layout. Drawn by Rendering\PageRenderer.

    $data    the cleaned section data (Content\PageContent)
    $layout  the Enums\SectionLayout
    $html    the layout's HTML (Rendering\SectionLayoutRenderer)
    $classes extra classes: fbe-s-{id} and the advanced class names (Rendering\SectionLook)
    $inlineBackground  false when the style bag draws the background colour
--}}
@use('Vortechron\FilamentBlockEditor\BlockNote\BlockNoteRenderer')
@use('Vortechron\FilamentBlockEditor\Enums\SectionFont')
@php
    $classes ??= [];
    $inlineBackground ??= true;
    $background = $data['background'] ?? 'none';
    $color = $background === 'color' ? BlockNoteRenderer::hexColor($data['background_color'] ?? null) : null;
    $pictureUrl = $background === 'image' ? ($data['image'] ?? null) : null;
    $hasPicture = filled($pictureUrl);
    $isCard = $hasPicture && ($data['card'] ?? false) === true;
    $tint = $hasPicture ? max(0, min(100, (int) ($data['tint'] ?? 40))) : 0;
    // Space above and below. The sides come from the page gutter, so text
    // never touches the screen edge, except with "none".
    $padding = match ($data['padding'] ?? 'md') {
        'none' => '0px',
        'sm' => 'clamp(1.5rem, 4vw, 2.5rem)',
        'lg' => 'clamp(3.5rem, 9vw, 7.5rem)',
        'xl' => 'clamp(4.5rem, 12vw, 10rem)',
        default => 'clamp(2.75rem, 6.5vw, 5.5rem)',
    };
    // The section's own style. "theme" and "auto" follow the page.
    $font = SectionFont::tryFrom((string) ($data['font'] ?? '')) ?? SectionFont::Theme;
    $align = in_array($data['align'] ?? null, ['left', 'center'], true) ? $data['align'] : null;
    $corners = in_array($data['corners'] ?? null, ['square', 'soft', 'round'], true) ? $data['corners'] : null;
    $button = in_array($data['button'] ?? null, ['solid', 'outline', 'pill', 'shadow'], true) ? $data['button'] : null;
    $textColor = BlockNoteRenderer::hexColor($data['text_color'] ?? null);
    $anchor = filled($data['anchor'] ?? null) ? $data['anchor'] : null;
    // An own block may draw only markup (an SVG, a canvas), so its wrapper counts as content.
    $hasText = trim(strip_tags($html, '<img><iframe><video><audio><hr><table>')) !== '' || str_contains($html, 'class="bn-own-block"');
    // A section of only the app's own blocks takes the page's colours, not the section look.
    $document = array_values(array_filter((array) ($data['document'] ?? []), is_array(...)));
    $ownOnly = $document !== [] && collect($document)->every(fn (array $block): bool => ($block['type'] ?? null) === 'ownBlock');
@endphp
@if ($hasText || $hasPicture || $color !== null)
    <section
        @if ($anchor !== null) id="{{ $anchor }}" @endif
        @class([
            'sf-rich-section',
            'sf-layout-'.$layout->value,
            'sf-has-bg' => $hasPicture || $color !== null,
            'sf-rich-light' => ($hasPicture && ! $isCard) || ($color !== null && BlockNoteRenderer::isDarkColor($color)),
            'sf-light-bg' => ! $hasPicture && $color !== null && ! BlockNoteRenderer::isDarkColor($color),
            'sf-rich-card' => $isCard,
            'sf-flush' => ($data['padding'] ?? 'md') === 'none',
            'sf-full' => ($data['width'] ?? 'normal') === 'full',
            'sf-own-section' => $ownOnly,
            'sf-font-'.$font->value => $font !== SectionFont::Theme,
            'sf-align-'.$align => $align !== null,
            'sf-corners-'.$corners => $corners !== null,
            'sf-button-'.$button => $button !== null,
            'sf-text-color' => $textColor !== null,
            'sf-dark-text' => $textColor !== null && BlockNoteRenderer::isDarkColor($textColor),
            ...$classes,
        ])
        style="--sf-pad: {{ $padding }};@if ($color !== null && $inlineBackground) background-color: {{ $color }};@endif @if ($textColor !== null) --sf-custom-text: {{ $textColor }};@endif"
        data-block="rich"
        data-layout="{{ $layout->value }}"
    >
        @if ($hasPicture)
            <img class="sf-rich-picture" src="{{ $pictureUrl }}" alt="" decoding="async" loading="lazy">
            @if ($tint > 0)
                <div class="sf-rich-tint" style="opacity: {{ $tint / 100 }};"></div>
            @endif
        @endif
        <div class="sf-container">
            <div class="sf-body">{!! $html !!}</div>
        </div>
    </section>
@endif
