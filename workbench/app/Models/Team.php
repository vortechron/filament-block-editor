<?php

namespace Workbench\App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Workbench\Database\Factories\TeamFactory;

/**
 * A tenant of the "team" panel, to prove each team has its own library.
 */
class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use HasFactory;

    protected $fillable = ['name', 'slug'];

    protected static function newFactory(): TeamFactory
    {
        return TeamFactory::new();
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}
