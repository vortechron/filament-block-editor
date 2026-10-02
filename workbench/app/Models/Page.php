<?php

namespace Workbench\App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Vortechron\FilamentBlockEditor\Models\Concerns\HasContentBlocks;
use Workbench\Database\Factories\PageFactory;

/**
 * A web page built from blocks. `summary` is a plain BlockNoteEditor field;
 * the page body is its content blocks.
 */
class Page extends Model
{
    /** @use HasFactory<PageFactory> */
    use HasContentBlocks, HasFactory;

    protected $fillable = ['title', 'slug', 'summary'];

    protected function casts(): array
    {
        return ['summary' => 'array'];
    }

    protected static function newFactory(): PageFactory
    {
        return PageFactory::new();
    }
}
