<?php

namespace Vortechron\FilamentBlockEditor\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

/**
 * Addresses the record in panel URLs by a random UUID held in the `uuid`
 * column (/admin/saved-blocks/01997c3e-8a4b-7f2c-9d1e-3b5a7c9e1f20/edit),
 * never by the row number. A number such as /saved-blocks/2 tells anyone who
 * sees the address bar how many records the app holds.
 *
 * The integer id stays the primary key and every foreign key. Only links
 * built from the model itself (getUrl, route(), route model binding) pick up
 * the UUID.
 *
 * Laravel fills the UUID on insert and replicate() leaves it out, so a copy
 * always gets its own. Keep `uuid` out of $fillable, or a copy made from
 * fillable attributes would carry it onto a second row.
 */
trait HasUuidRouteKey
{
    use HasUuids;

    /**
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
