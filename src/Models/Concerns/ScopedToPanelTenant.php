<?php

namespace Vortechron\FilamentBlockEditor\Models\Concerns;

use Filament\Facades\Filament;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Keeps a library record (media, saved block, block style) inside the tenant
 * that is open in the Filament panel, when the panel has tenancy. Each team
 * then has its own library.
 *
 * Without tenancy the tenant columns stay empty and nothing is scoped, so the
 * whole app shares one library. Outside a panel (console, public pages, tests)
 * no scope is applied either.
 *
 * The package resources set $isScopedToTenant = false, so Filament never
 * writes the tenant itself: this trait is the only place that does.
 */
trait ScopedToPanelTenant
{
    public static function bootScopedToPanelTenant(): void
    {
        static::creating(function (Model $model): void {
            $tenant = Filament::getTenant();

            if ($tenant !== null && $model->getAttribute('tenant_id') === null) {
                $model->tenant()->associate($tenant);
            }
        });

        static::addGlobalScope('filament-block-editor-tenant', function (Builder $query): void {
            $tenant = Filament::getTenant();

            if ($tenant !== null) {
                static::whereTenant($query, $tenant);
            }
        });
    }

    public function tenant(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Rows that belong to the given tenant, or to no tenant at all when it is
     * null. Use with withoutGlobalScopes() when the panel's tenant is not the
     * one you want.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeForTenant(Builder $query, ?Model $tenant): Builder
    {
        if ($tenant === null) {
            return $query->whereNull($query->getModel()->qualifyColumn('tenant_id'));
        }

        return static::whereTenant($query, $tenant);
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    private static function whereTenant(Builder $query, Model $tenant): Builder
    {
        return $query
            ->where($query->getModel()->qualifyColumn('tenant_type'), $tenant->getMorphClass())
            ->where($query->getModel()->qualifyColumn('tenant_id'), $tenant->getKey());
    }
}
