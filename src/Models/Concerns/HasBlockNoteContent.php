<?php

namespace Vortechron\FilamentBlockEditor\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Vortechron\FilamentBlockEditor\Support\BlockNoteDocument;

/**
 * Keeps the `content` column a document the BlockNote editor can open, on
 * every write path at once: the editor, the REST API, MCP, imports and the
 * copies made from templates and the block library all save through here.
 */
trait HasBlockNoteContent
{
    public static function bootHasBlockNoteContent(): void
    {
        static::saving(function (Model $model): void {
            $content = $model->getAttribute('content');

            if (is_array($content) && $model->isDirty('content')) {
                $model->setAttribute('content', BlockNoteDocument::normalize($content));
            }
        });
    }
}
