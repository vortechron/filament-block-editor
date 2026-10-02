<?php

namespace Vortechron\FilamentBlockEditor\Models\Concerns;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Vortechron\FilamentBlockEditor\Enums\BlockBackgroundPosition;
use Vortechron\FilamentBlockEditor\Enums\BlockBackgroundType;
use Vortechron\FilamentBlockEditor\Enums\BlockContentWidth;
use Vortechron\FilamentBlockEditor\Enums\BlockSpacing;
use Vortechron\FilamentBlockEditor\Enums\BlockTintStyle;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Support\BlockBackgroundVideo;
use Vortechron\FilamentBlockEditor\Support\BlockColor;
use Vortechron\FilamentBlockEditor\Support\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\Support\BlockStyles;

/**
 * Shared look-and-feel for a BlockNote content block: background (a flat
 * colour, an image or a video, with a tint, blur and position), spacing
 * presets, how wide the readable content column may grow and whether the
 * section fills the whole browser window.
 *
 * Used by ContentBlock (a block on one page) and SavedBlock (a reusable
 * block in the library).
 *
 * A block may follow a BlockStyle. Then every setting comes from
 * that style except the ones listed in `style_overrides`, which the block has
 * taken over for itself. Read values through appearance(), never through the
 * raw attribute, or the block will ignore the style it is following.
 */
trait HasBlockAppearance
{
    /**
     * The appearance columns, in the order the Style modal shows them.
     *
     * @var array<int, string>
     */
    public const APPEARANCE_COLUMNS = [
        'background_type',
        'background_color',
        'background_image_path',
        'background_video_url',
        'background_tint_color',
        'background_tint_style',
        'background_overlay',
        'background_position',
        'background_blur',
        'background_card',
        'padding_size',
        'content_width',
        'full_height',
        'spacing_top',
        'spacing_bottom',
    ];

    /**
     * The two columns that say which style a block follows and which settings
     * it has taken over. They travel with the appearance on any same-library
     * copy, so they are listed next to APPEARANCE_COLUMNS rather than inside
     * it: they are not settings themselves.
     *
     * @var array<int, string>
     */
    public const STYLE_COLUMNS = ['block_style_id', 'style_overrides'];

    public const DEFAULT_TINT_COLOR = '#0f172a';

    public const MAX_BLUR = 20;

    /**
     * Defaults for a brand new block, keyed the same as the columns above.
     *
     * background_type stays null until the user picks one, so older rows and
     * API clients that only send an image or video still render it (see
     * backgroundType()).
     *
     * @return array<string, mixed>
     */
    public static function appearanceDefaults(): array
    {
        return [
            'background_type' => null,
            'background_color' => null,
            'background_image_path' => null,
            'background_video_url' => null,
            'background_tint_color' => self::DEFAULT_TINT_COLOR,
            'background_tint_style' => BlockTintStyle::Normal->value,
            'background_overlay' => 45,
            'background_position' => BlockBackgroundPosition::Center->value,
            'background_blur' => 0,
            'background_card' => false,
            'padding_size' => 'md',
            'content_width' => 'normal',
            'full_height' => false,
            'spacing_top' => 'md',
            'spacing_bottom' => 'md',
        ];
    }

    public function blockStyle(): BelongsTo
    {
        return $this->belongsTo(BlockStyle::class);
    }

    /**
     * The style this block follows, or null when it stands on its own.
     *
     * Prefers an eager loaded relation, then the per-request lookup service,
     * so a page full of blocks sharing one style costs one query.
     */
    public function resolvedBlockStyle(): ?BlockStyle
    {
        if ($this->block_style_id === null) {
            return null;
        }

        if ($this->relationLoaded('blockStyle')) {
            return $this->getRelation('blockStyle');
        }

        return app(BlockStyles::class)->find($this->block_style_id);
    }

    public function followsBlockStyle(): bool
    {
        return $this->resolvedBlockStyle() !== null;
    }

    /**
     * The settings this block has taken over from the style it follows.
     * Anything not listed here follows the style.
     *
     * @return array<int, string>
     */
    public function styleOverrides(): array
    {
        return static::knownAppearanceColumns($this->style_overrides);
    }

    /**
     * Whatever was handed in, narrowed to real appearance column names.
     *
     * @return array<int, string>
     */
    public static function knownAppearanceColumns(mixed $columns): array
    {
        return is_array($columns)
            ? array_values(array_intersect($columns, self::APPEARANCE_COLUMNS))
            : [];
    }

    /**
     * Turn an API or MCP payload into the attributes to write.
     *
     * Setting any one of the 15 means this block takes that setting over from
     * the style it follows; the rest keep following. A client that wants to
     * hand a setting back sends style_overrides, which replaces the whole
     * list, so an empty list means "follow the style for everything".
     *
     * Sending block_style_id as null stops following without changing how the
     * block looks.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function appearancePayload(array $data): array
    {
        $given = array_intersect_key($data, array_flip(self::APPEARANCE_COLUMNS));

        if (array_key_exists('block_style_id', $data) && $data['block_style_id'] === null) {
            return [...$data, ...$this->flattenedAppearance(), ...$given];
        }

        $overrides = array_key_exists('style_overrides', $data)
            ? static::knownAppearanceColumns($data['style_overrides'])
            : array_values(array_unique([...$this->styleOverrides(), ...array_keys($given)]));

        return [...$data, 'style_overrides' => $overrides];
    }

    /**
     * What one appearance setting actually is, once the style it follows has
     * been taken into account.
     *
     * A block with no style owns every setting, which is why a block that
     * predates styles renders exactly as it always did.
     */
    public function appearance(string $column): mixed
    {
        $style = $this->resolvedBlockStyle();

        if ($style !== null && ! in_array($column, $this->styleOverrides(), true)) {
            return $style->getAttribute($column);
        }

        return $this->getAttribute($column) ?? (static::appearanceDefaults()[$column] ?? null);
    }

    /**
     * All 15 settings, resolved. What the block actually looks like.
     *
     * @return array<string, mixed>
     */
    public function effectiveAppearance(): array
    {
        return collect(self::APPEARANCE_COLUMNS)
            ->mapWithKeys(fn (string $column): array => [$column => $this->appearance($column)])
            ->all();
    }

    /**
     * The block's current look written into its own columns, with the style
     * link dropped. Used wherever a block must stop following a style but keep
     * the look it has: a page being frozen or copied elsewhere, a style being
     * deleted.
     *
     * @return array<string, mixed>
     */
    public function flattenedAppearance(): array
    {
        return [
            ...$this->effectiveAppearance(),
            'block_style_id' => null,
            'style_overrides' => [],
        ];
    }

    /**
     * Everything needed to recreate this block somewhere else: its document,
     * every appearance column and the style it follows. Used to drop a saved
     * block onto a page, and to lift a page's block back into the library.
     *
     * Reads the raw columns on purpose. This is a copy, not a render, so the
     * style link must be carried across rather than resolved away.
     *
     * @return array<string, mixed>
     */
    public function toBlockAttributes(): array
    {
        return [
            'content' => is_array($this->content) ? $this->content : [],
            'block_style_id' => $this->block_style_id,
            'style_overrides' => $this->styleOverrides(),
            ...collect(self::APPEARANCE_COLUMNS)
                ->mapWithKeys(fn (string $column): array => [$column => $this->getAttribute($column)])
                ->all(),
        ];
    }

    public function backgroundType(): BlockBackgroundType
    {
        return BlockBackgroundType::resolve(
            $this->appearance('background_type'),
            $this->appearance('background_image_path'),
            $this->appearance('background_video_url'),
        );
    }

    /**
     * True when the block draws anything behind its content: a colour, an
     * image or a video, whichever the chosen type points at.
     */
    public function hasBackground(): bool
    {
        return match ($this->backgroundType()) {
            BlockBackgroundType::Color => $this->backgroundColor() !== null,
            BlockBackgroundType::Image => filled($this->backgroundImagePath()),
            BlockBackgroundType::Video => filled($this->backgroundVideoUrl()),
        };
    }

    /**
     * True when a picture or video sits behind the block, which is when the
     * tint, blur, position and card settings apply.
     */
    public function hasBackgroundMedia(): bool
    {
        return $this->backgroundType()->hasMedia() && $this->hasBackground();
    }

    public function hasBackgroundCard(): bool
    {
        return $this->hasBackgroundMedia() && (bool) $this->appearance('background_card');
    }

    /**
     * Whether the text should be white. On a picture or video it is, unless
     * the text sits on a white card; on a flat colour it depends on how dark
     * that colour is.
     */
    public function usesLightText(): bool
    {
        if ($this->hasBackgroundCard()) {
            return false;
        }

        if ($this->hasBackgroundMedia()) {
            return true;
        }

        $color = $this->backgroundColor();

        return $color !== null && BlockColor::isDark($color);
    }

    public function backgroundColor(): ?string
    {
        return BlockColor::hex($this->appearance('background_color'));
    }

    public function backgroundImagePath(): ?string
    {
        $path = $this->appearance('background_image_path');

        return is_string($path) ? $path : null;
    }

    public function backgroundVideoUrl(): ?string
    {
        $url = $this->appearance('background_video_url');

        return is_string($url) ? $url : null;
    }

    public function backgroundTintColor(): string
    {
        return BlockColor::hex($this->appearance('background_tint_color'), self::DEFAULT_TINT_COLOR);
    }

    public function backgroundTintStyle(): BlockTintStyle
    {
        return BlockTintStyle::fromValue($this->appearance('background_tint_style'));
    }

    /**
     * Tint strength as a whole percentage, 0 to 100.
     */
    public function backgroundTintOpacity(): int
    {
        return BlockColor::clamp($this->appearance('background_overlay') ?? 45, 0, 100);
    }

    /**
     * Blur radius in pixels, 0 to MAX_BLUR.
     */
    public function backgroundBlur(): int
    {
        return BlockColor::clamp($this->appearance('background_blur') ?? 0, 0, self::MAX_BLUR);
    }

    /**
     * For a YouTube or Vimeo link, the player URL that plays it silently on
     * repeat. Null means the link is a direct file for a <video> tag.
     */
    public function backgroundVideoEmbedUrl(): ?string
    {
        return BlockBackgroundVideo::embedUrl($this->backgroundVideoUrl());
    }

    public function backgroundPosition(): BlockBackgroundPosition
    {
        return BlockBackgroundPosition::fromValue($this->appearance('background_position'));
    }

    public function paddingSize(): BlockSpacing
    {
        return BlockSpacing::fromValue($this->appearance('padding_size'));
    }

    public function spacingTop(): BlockSpacing
    {
        return BlockSpacing::fromValue($this->appearance('spacing_top'));
    }

    public function spacingBottom(): BlockSpacing
    {
        return BlockSpacing::fromValue($this->appearance('spacing_bottom'));
    }

    public function contentWidth(): BlockContentWidth
    {
        return BlockContentWidth::fromValue($this->appearance('content_width'));
    }

    public function isFullHeight(): bool
    {
        return (bool) $this->appearance('full_height');
    }

    /**
     * Inline CSS for the public page section: padding inside the block,
     * vertical spacing around it, the flat background colour when that is
     * the chosen type, and a full window height when asked for.
     *
     * Padding and spacing shrink on small screens (BlockSpacing::fluidCss()).
     */
    public function sectionStyle(): string
    {
        $padding = $this->paddingSize()->fluidCss();
        $top = $this->spacingTop()->fluidCss();
        $bottom = $this->spacingBottom()->fluidCss();

        // --fbe-block-pad lets a stretched item cancel this padding and
        // reach the section edge. See BlockNoteRenderer::constrainWidth().
        $style = "padding: {$padding}; margin-top: {$top}; margin-bottom: {$bottom}; --fbe-block-pad: {$padding};";

        if ($this->backgroundType() === BlockBackgroundType::Color && $this->backgroundColor() !== null) {
            $style .= " background-color: {$this->backgroundColor()};";
        }

        if ($this->isFullHeight()) {
            $style .= ' min-height: 100vh;';
        }

        return $style;
    }

    /**
     * Inline CSS for the picture or video layer: where it is anchored, and
     * how much it is blurred. The blur is a CSS variable because the layer
     * also has to grow past the section edge by the same amount, or the blur
     * would fade to transparent at the edges.
     */
    public function backgroundMediaStyle(): string
    {
        $position = $this->backgroundPosition()->css();
        $style = "background-position: {$position}; object-position: {$position};";

        if ($this->backgroundBlur() > 0) {
            $style .= " --fbe-bg-blur: {$this->backgroundBlur()}px;";
        }

        return $style;
    }

    /**
     * Inline CSS for the tint layer between the picture and the text.
     */
    public function backgroundTintStyleCss(): string
    {
        $opacity = $this->backgroundTintOpacity() / 100;

        return "background-color: {$this->backgroundTintColor()}; opacity: {$opacity}; mix-blend-mode: {$this->backgroundTintStyle()->css()};";
    }

    /**
     * Inline CSS for the centered content column inside the section.
     */
    public function contentStyle(): string
    {
        $width = $this->contentWidth()->css();

        return $width === 'none'
            ? 'max-width: none;'
            : "max-width: {$width};";
    }

    public function getBackgroundImageUrlAttribute(): ?string
    {
        $path = $this->backgroundImagePath();

        if (blank($path)) {
            return null;
        }

        return Storage::disk(config('filament-block-editor.disk', 'public'))->url($path);
    }

    /**
     * Render the block's BlockNote document to sanitized HTML.
     */
    public function renderContentHtml(): string
    {
        return app(BlockNoteRenderer::class)->render(
            is_array($this->content) ? $this->content : [],
        );
    }
}
