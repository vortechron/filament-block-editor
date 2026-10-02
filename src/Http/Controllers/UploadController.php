<?php

namespace Vortechron\FilamentBlockEditor\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Vortechron\FilamentBlockEditor\Support\MediaLibrary;
use Vortechron\FilamentBlockEditor\Support\Tenancy;

/**
 * Stores a file dropped into the editor and returns the URL the editor
 * embeds. Registered on the panel, so the panel's sign-in and tenant checks
 * run first.
 */
class UploadController
{
    public function __invoke(Request $request, MediaLibrary $mediaLibrary): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:'.config('filament-block-editor.max_upload_size', 20480), 'mimes:'.MediaLibrary::ALLOWED_EXTENSIONS],
        ]);

        $asset = $mediaLibrary->store(Tenancy::current(), $request->file('file'));

        return response()->json([
            'url' => $asset->url,
            'asset' => $asset->toLibraryArray(),
        ]);
    }
}
