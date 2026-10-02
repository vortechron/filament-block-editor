<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Filament\Facades\Filament;
use Illuminate\Database\Eloquent\Model;

/**
 * Which library the signed-in person is working in.
 *
 * In a panel with tenancy that is the open tenant, and the person must be
 * allowed into it. Without tenancy it is null: one library shared by the app.
 */
final class Tenancy
{
    public static function current(): ?Model
    {
        $tenant = Filament::getTenant();

        if ($tenant === null) {
            return null;
        }

        $user = Filament::auth()->user();

        abort_unless(
            $user !== null && (! method_exists($user, 'canAccessTenant') || $user->canAccessTenant($tenant)),
            403,
        );

        return $tenant;
    }
}
