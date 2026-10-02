<?php

namespace Vortechron\FilamentBlockEditor\Models;

use Filament\Facades\Filament;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Vortechron\FilamentBlockEditor\Database\Factories\ContentBlockFactory;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasBlockAppearance;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasBlockNoteContent;

/**
 * One section of a page: a BlockNote document (columns are columnList blocks
 * inside it) with its own background, layout and spacing.
 *
 * Belongs to any model through `blockable` (see HasContentBlocks). A model can
 * hold several lists of blocks, told apart by `collection` ("default",
 * "header", "footer", ...).
 *
 * A block whose kind is not "content" holds no document: it marks where the
 * page draws one of its own sections (a contact form, a pricing table). See
 * BlockSections::sections().
 */
class ContentBlock extends Model
{
    /** @use HasFactory<ContentBlockFactory> */
    use HasBlockAppearance, HasBlockNoteContent, HasFactory;

    public const KIND_CONTENT = 'content';

    public const DEFAULT_COLLECTION = 'default';

    protected $table = 'block_editor_blocks';

    protected $fillable = [
        'collection',
        'kind',
        'sort_order',
        'content',
        'block_style_id',
        'style_overrides',
        ...self::APPEARANCE_COLUMNS,
    ];

    protected $attributes = [
        'collection' => self::DEFAULT_COLLECTION,
        'kind' => self::KIND_CONTENT,
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
            'sort_order' => 'integer',
            'background_overlay' => 'integer',
            'background_blur' => 'integer',
            'background_card' => 'boolean',
            'full_height' => 'boolean',
        ];
    }

    /**
     * Blocks record the tenant they were written in, so the media library can
     * tell which team's page uses a file. They are always read through their
     * page, so no global scope is needed.
     */
    protected static function booted(): void
    {
        static::creating(function (self $block): void {
            $tenant = Filament::getTenant();

            if ($tenant !== null && $block->tenant_id === null) {
                $block->tenant()->associate($tenant);
            }
        });
    }

    protected static function newFactory(): ContentBlockFactory
    {
        return ContentBlockFactory::new();
    }

    public function blockable(): MorphTo
    {
        return $this->morphTo();
    }

    public function tenant(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Whether this block stands for one of the page's own sections rather
     * than holding content of its own.
     */
    public function isSection(): bool
    {
        return filled($this->kind) && $this->kind !== self::KIND_CONTENT;
    }
}
