<?php

namespace Vortechron\FilamentBlockEditor\Filament\Resources\Concerns;

use Filament\Facades\Filament;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorPlugin;

/**
 * Shared set-up for the library resources: the plugin decides who may manage
 * the library and which navigation group it sits in.
 *
 * Tenancy is handled by the models themselves (ScopedToPanelTenant), so each
 * resource switches Filament's own tenant scoping off with
 * `protected static bool $isScopedToTenant = false`.
 */
trait ManagedByPlugin
{
    public static function canViewAny(): bool
    {
        return FilamentBlockEditorPlugin::canManageLibrary() && parent::canViewAny();
    }

    /**
     * In a panel without a tenant, list only the shared library. Otherwise an
     * app with both a plain panel and a team panel would show every team's
     * records in the plain one. With a tenant open, the models' own scope
     * already narrows the query.
     */
    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        return Filament::getTenant() === null ? $query->forTenant(null) : $query;
    }

    public static function getNavigationGroup(): string|UnitEnum|null
    {
        return FilamentBlockEditorPlugin::resolveNavigationGroup();
    }
}
