<?php

namespace Vortechron\FilamentBlockEditor\Enums;

use Filament\Support\Contracts\HasLabel;

/**
 * What sits behind a content block: a flat colour, an uploaded image or a
 * looping video. The block keeps the values for every type, so switching
 * back and forth in the Style sheet never loses an upload.
 */
enum BlockBackgroundType: string implements HasLabel
{
    case Color = 'color';
    case Image = 'image';
    case Video = 'video';

    public function getLabel(): string
    {
        return match ($this) {
            self::Color => 'Color',
            self::Image => 'Image',
            self::Video => 'Video',
        };
    }

    public function hasMedia(): bool
    {
        return $this !== self::Color;
    }

    /**
     * The saved type when there is one, else the best guess from the media
     * the block already carries. Blocks made before the type column existed
     * have a null type, and API clients may leave it out.
     */
    public static function resolve(mixed $type, mixed $imagePath, mixed $videoUrl): self
    {
        if ($type instanceof self) {
            return $type;
        }

        $saved = self::tryFrom((string) $type);

        if ($saved !== null) {
            return $saved;
        }

        if (filled($videoUrl)) {
            return self::Video;
        }

        if (filled($imagePath)) {
            return self::Image;
        }

        return self::Color;
    }
}
