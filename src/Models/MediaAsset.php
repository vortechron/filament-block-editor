<?php

namespace Vortechron\FilamentBlockEditor\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Vortechron\FilamentBlockEditor\Database\Factories\MediaAssetFactory;
use Vortechron\FilamentBlockEditor\Models\Concerns\ScopedToPanelTenant;

/**
 * One file in the media library: a picture, a video or a PDF, uploaded once
 * and reused in any block.
 */
class MediaAsset extends Model
{
    /** @use HasFactory<MediaAssetFactory> */
    use HasFactory, ScopedToPanelTenant;

    protected $table = 'block_editor_media';

    protected $fillable = ['name', 'disk', 'path', 'mime_type', 'size'];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $asset): void {
            $asset->disk ??= config('filament-block-editor.disk', 'public');
        });
    }

    protected static function newFactory(): MediaAssetFactory
    {
        return MediaAssetFactory::new();
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function isVideo(): bool
    {
        return str_starts_with($this->mime_type, 'video/');
    }

    /**
     * A PDF. It is only ever linked to (the "file" block), never drawn as a
     * picture, so every picture picker leaves documents out.
     */
    public function isDocument(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * image, video or document.
     */
    public function kind(): string
    {
        return match (true) {
            $this->isVideo() => 'video',
            $this->isDocument() => 'document',
            default => 'image',
        };
    }

    /**
     * Only files that can be drawn as a picture or played as a video.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeVisual(Builder $query): Builder
    {
        return $query->where(fn (Builder $query) => $query
            ->where('mime_type', 'like', 'image/%')
            ->orWhere('mime_type', 'like', 'video/%'));
    }

    /** @return array{id: int, name: string, url: string, path: string, mime_type: string, size: int, kind: string, is_video: bool} */
    public function toLibraryArray(): array
    {
        return [
            'id' => $this->getKey(),
            'name' => $this->name,
            'url' => $this->url,
            'path' => $this->path,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'kind' => $this->kind(),
            'is_video' => $this->isVideo(),
        ];
    }
}
