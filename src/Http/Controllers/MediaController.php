<?php

namespace Vortechron\FilamentBlockEditor\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Support\Tenancy;

/**
 * The editor's media picker: one page of the library as JSON.
 */
class MediaController
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'kind' => ['nullable', 'in:image,video'],
        ]);

        $assets = MediaAsset::withoutGlobalScopes()
            ->forTenant(Tenancy::current())
            ->when($validated['search'] ?? null, fn (Builder $query, string $search): Builder => $query->where('name', 'like', '%'.$search.'%'))
            ->when($validated['kind'] ?? null, fn (Builder $query, string $kind): Builder => $query->where('mime_type', 'like', $kind.'/%'))
            ->latest('id')
            ->paginate(24)
            ->withQueryString()
            ->through(fn (MediaAsset $asset): array => $asset->toLibraryArray());

        return response()->json($assets);
    }
}
