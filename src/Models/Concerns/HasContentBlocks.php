<?php

namespace Vortechron\FilamentBlockEditor\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\DB;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;

/**
 * Add to any model that holds a page of blocks (a page, a blog post, a
 * landing page). The default list is contentBlocks(); for a second list,
 * add a relation of your own:
 *
 *     public function footerBlocks(): MorphMany
 *     {
 *         return $this->contentBlocksIn('footer');
 *     }
 *
 * and edit it with BlockSections::make('footerBlocks')->collection('footer').
 */
trait HasContentBlocks
{
    public static function bootHasContentBlocks(): void
    {
        static::deleting(function (Model $model): void {
            // A soft delete keeps the page, so it keeps its blocks too.
            if (method_exists($model, 'isForceDeleting') && ! $model->isForceDeleting()) {
                return;
            }

            $model->morphMany(ContentBlock::class, 'blockable')->delete();
        });
    }

    public function contentBlocks(): MorphMany
    {
        return $this->contentBlocksIn(ContentBlock::DEFAULT_COLLECTION);
    }

    public function contentBlocksIn(string $collection): MorphMany
    {
        return $this->morphMany(ContentBlock::class, 'blockable')
            ->where('collection', $collection)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * Copy every block of this model onto another one, keeping the order, the
     * collection and the style each block follows. Used to make a page from a
     * template, or to duplicate a page.
     */
    public function copyContentBlocksTo(Model $target, ?string $collection = null): void
    {
        DB::transaction(function () use ($target, $collection): void {
            $this->morphMany(ContentBlock::class, 'blockable')
                ->when($collection !== null, fn ($query) => $query->where('collection', $collection))
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->each(function (ContentBlock $block) use ($target): void {
                    $copy = $block->replicate(['blockable_type', 'blockable_id']);
                    $copy->blockable()->associate($target);
                    $copy->save();
                });
        });
    }
}
