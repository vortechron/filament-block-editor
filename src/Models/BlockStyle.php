<?php

namespace Vortechron\FilamentBlockEditor\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Vortechron\FilamentBlockEditor\Database\Factories\BlockStyleFactory;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasUuidRouteKey;
use Vortechron\FilamentBlockEditor\Models\Concerns\ScopedToPanelTenant;

/**
 * A named, reusable look for a content block: the same 15 appearance columns a
 * ContentBlock or SavedBlock carries, kept in the library.
 *
 * A block points at one of these and inherits every setting it has not taken
 * over itself (see HasBlockAppearance::appearance()). Editing a style changes
 * every block still following it.
 *
 * This model deliberately does NOT use HasBlockAppearance: a style *is* the
 * appearance, so appearance() would resolve against itself forever.
 */
class BlockStyle extends Model
{
    /** @use HasFactory<BlockStyleFactory> */
    use HasFactory, HasUuidRouteKey, ScopedToPanelTenant;

    protected $table = 'block_editor_styles';

    protected $fillable = [
        'name',
        'is_default',
        'archived_at',
        ...ContentBlock::APPEARANCE_COLUMNS,
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
            'is_default' => 'boolean',
            'background_overlay' => 'integer',
            'background_blur' => 'integer',
            'background_card' => 'boolean',
            'full_height' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    protected static function newFactory(): BlockStyleFactory
    {
        return BlockStyleFactory::new();
    }

    /**
     * Only one style per library may be the default for new blocks, so saving
     * one as the default clears the flag on the rest.
     *
     * Builder::update() fires no model events, so this cannot recurse. The
     * tenant is passed explicitly and the global scope is dropped, so the rule
     * holds whichever panel tenant happens to be open.
     */
    protected static function booted(): void
    {
        static::saved(function (self $style): void {
            // wasChanged() is false for a row that was just inserted, so a
            // newly created default would leave the old one standing.
            if (! $style->is_default) {
                return;
            }

            if (! $style->wasRecentlyCreated && ! $style->wasChanged('is_default')) {
                return;
            }

            static::withoutGlobalScopes()
                ->where('tenant_type', $style->tenant_type)
                ->where('tenant_id', $style->tenant_id)
                ->whereKeyNot($style->getKey())
                ->update(['is_default' => false]);
        });

        // A dropped foreign key alone would leave every follower with empty
        // columns, so they would all snap back to plain grey. Write the look
        // they have into their own columns first.
        static::deleting(function (self $style): void {
            $style->flattenFollowers();
        });
    }

    /**
     * Copy this style's look into every block that follows it, and drop the
     * link. The blocks keep looking exactly as they do now.
     */
    public function flattenFollowers(): void
    {
        DB::transaction(function (): void {
            foreach ([ContentBlock::class, SavedBlock::class] as $model) {
                $model::withoutGlobalScopes()
                    ->where('block_style_id', $this->getKey())
                    ->chunkById(200, function ($blocks): void {
                        foreach ($blocks as $block) {
                            $block->setRelation('blockStyle', $this);
                            $block->update($block->flattenedAppearance());
                        }
                    });
            }
        });
    }

    /**
     * The appearance columns a style carries. The same list a block carries,
     * because a style is nothing but a block's look.
     *
     * @return array<int, string>
     */
    public static function appearanceColumns(): array
    {
        return ContentBlock::APPEARANCE_COLUMNS;
    }

    /**
     * A throwaway block wearing this style, for drawing a preview with the
     * same partial the public page uses. Never saved.
     *
     * @param  array<int, array<string, mixed>>  $content
     */
    public function toPreviewBlock(array $content = []): ContentBlock
    {
        $block = new ContentBlock($this->appearanceValues());
        $block->content = $content;

        return $block;
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function contentBlocks(): HasMany
    {
        return $this->hasMany(ContentBlock::class);
    }

    public function savedBlocks(): HasMany
    {
        return $this->hasMany(SavedBlock::class);
    }

    /**
     * The 15 appearance columns as a plain array, in APPEARANCE_COLUMNS order.
     *
     * @return array<string, mixed>
     */
    public function appearanceValues(): array
    {
        return collect(ContentBlock::APPEARANCE_COLUMNS)
            ->mapWithKeys(fn (string $column): array => [$column => $this->getAttribute($column)])
            ->all();
    }

    /**
     * How many blocks currently follow this style, across pages and the saved
     * block library. Used to warn before an edit or a delete.
     */
    public function followerCount(): int
    {
        return $this->contentBlocks()->count() + $this->savedBlocks()->withoutGlobalScopes()->count();
    }
}
