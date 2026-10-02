<?php

namespace Vortechron\FilamentBlockEditor\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Vortechron\FilamentBlockEditor\Database\Factories\SavedBlockFactory;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasBlockAppearance;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasBlockNoteContent;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasUuidRouteKey;
use Vortechron\FilamentBlockEditor\Models\Concerns\ScopedToPanelTenant;

/**
 * A reusable content block kept in the library. It holds the same BlockNote
 * document and appearance settings as a ContentBlock, so it can be dropped
 * into any page as a ready-made section.
 */
class SavedBlock extends Model
{
    /** @use HasFactory<SavedBlockFactory> */
    use HasBlockAppearance, HasBlockNoteContent, HasFactory, HasUuidRouteKey, ScopedToPanelTenant;

    protected $table = 'block_editor_saved_blocks';

    protected $fillable = [
        'name',
        'description',
        'content',
        'block_style_id',
        'style_overrides',
        'archived_at',
        ...self::APPEARANCE_COLUMNS,
    ];

    protected $attributes = [
        'background_tint_color' => '#0f172a',
        'background_tint_style' => 'normal',
        'background_overlay' => 45,
        'background_position' => 'center',
        'background_blur' => 0,
        'background_card' => false,
        'padding_size' => 'md',
        'content_width' => 'normal',
        'full_height' => false,
        'spacing_top' => 'md',
        'spacing_bottom' => 'md',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'style_overrides' => 'array',
            'background_overlay' => 'integer',
            'background_blur' => 'integer',
            'background_card' => 'boolean',
            'full_height' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    protected static function newFactory(): SavedBlockFactory
    {
        return SavedBlockFactory::new();
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }
}
