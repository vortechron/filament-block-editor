<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Generator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;

/**
 * Stores uploads, finds where a file is used, and refuses to delete a file
 * that a block, a saved block or a block style still shows.
 *
 * A null tenant means "the shared library": the app has no tenancy, or the
 * call happens outside a tenant.
 */
class MediaLibrary
{
    /**
     * Pictures, videos and PDFs. A PDF is only ever linked to from a "file"
     * block; the picture pickers leave it out (MediaAsset::scopeVisual()).
     */
    public const ALLOWED_EXTENSIONS = 'jpg,jpeg,png,gif,webp,avif,mp4,webm,pdf';

    public static function disk(): string
    {
        return config('filament-block-editor.disk', 'public');
    }

    public function store(?Model $tenant, UploadedFile $file): MediaAsset
    {
        Validator::validate(['file' => $file], [
            'file' => ['required', 'file', 'max:'.config('filament-block-editor.max_upload_size', 20480), 'mimes:'.self::ALLOWED_EXTENSIONS],
        ]);

        $disk = static::disk();
        $directory = trim(config('filament-block-editor.directory', 'block-editor'), '/').'/'.($tenant?->getKey() ?? 'shared');
        $path = $file->storeAs($directory, Str::random(40).'.'.$file->extension(), $disk);

        if ($path === false || ! Storage::disk($disk)->exists($path)) {
            throw ValidationException::withMessages(['file' => 'The file could not be stored. Please try again.']);
        }

        try {
            $asset = new MediaAsset([
                'name' => Str::limit($file->getClientOriginalName(), 255, ''),
                'disk' => $disk,
                'path' => $path,
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size' => $file->getSize(),
            ]);

            if ($tenant !== null) {
                $asset->tenant()->associate($tenant);
            }

            $asset->save();

            return $asset;
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($path);

            throw $exception;
        }
    }

    /**
     * The library's existing copy of this exact file, if it has one.
     *
     * Only rows of the same size are read back from disk and compared, so a
     * large library costs one indexed query plus a few file reads.
     */
    public function findDuplicate(?Model $tenant, UploadedFile $file): ?MediaAsset
    {
        $size = $file->getSize();
        $hash = is_string($file->getRealPath()) ? hash_file('sha256', $file->getRealPath()) : false;

        if ($size === false || $hash === false) {
            return null;
        }

        $candidates = MediaAsset::withoutGlobalScopes()
            ->forTenant($tenant)
            ->where('size', $size)
            ->oldest('id')
            ->get();

        foreach ($candidates as $candidate) {
            $disk = Storage::disk($candidate->disk);

            if ($disk->exists($candidate->path) && hash('sha256', (string) $disk->get($candidate->path)) === $hash) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Add every picture or video that blocks already show, but that is not
     * in the library yet (uploaded before the library existed, or straight
     * through a file field). Returns how many were added.
     */
    public function importExisting(?Model $tenant): int
    {
        $imported = 0;
        $diskName = static::disk();
        $disk = Storage::disk($diskName);
        $knownPaths = MediaAsset::withoutGlobalScopes()
            ->forTenant($tenant)
            ->where('disk', $diskName)
            ->pluck('path')
            ->flip()
            ->all();

        foreach ($this->references($tenant) as $reference) {
            foreach ($reference['paths'] as $path) {
                if (isset($knownPaths[$path]) || ! $disk->exists($path)) {
                    continue;
                }

                $knownPaths[$path] = true;
                $mimeType = $disk->mimeType($path);

                if (! is_string($mimeType) || (! str_starts_with($mimeType, 'image/') && ! str_starts_with($mimeType, 'video/')) || $mimeType === 'image/svg+xml') {
                    continue;
                }

                $asset = new MediaAsset([
                    'name' => Str::limit(basename($path), 255, ''),
                    'disk' => $diskName,
                    'path' => $path,
                    'mime_type' => $mimeType,
                    'size' => $disk->size($path),
                ]);

                if ($tenant !== null) {
                    $asset->tenant()->associate($tenant);
                }

                $asset->save();
                $imported++;
            }
        }

        return $imported;
    }

    /**
     * Where a file is used, as short labels for people ("Saved block: Hero").
     *
     * @return list<string>
     */
    public function usages(MediaAsset $asset): array
    {
        $usages = [];

        if ($asset->disk !== static::disk()) {
            return $usages;
        }

        $owner = static::tenantKey($asset->tenant_type, $asset->tenant_id);

        foreach ($this->references(everyTenant: true) as $reference) {
            if (in_array($asset->path, $reference['paths'], true)) {
                $usages[] = $reference['tenant'] === $owner
                    ? $reference['label']
                    : 'Content in another team';
            }
        }

        if (MediaAsset::withoutGlobalScopes()->where('disk', $asset->disk)->where('path', $asset->path)->whereKeyNot($asset->getKey())->exists()) {
            $usages[] = 'Another media library entry';
        }

        return array_values(array_unique($usages));
    }

    public function delete(MediaAsset $asset): void
    {
        DB::transaction(function () use ($asset): void {
            $storedAsset = MediaAsset::withoutGlobalScopes()->lockForUpdate()->findOrFail($asset->getKey());

            if ($this->usages($storedAsset) !== []) {
                throw ValidationException::withMessages(['media' => 'This file is still in use. Remove it from the listed places before deleting it.']);
            }

            $disk = Storage::disk($storedAsset->disk);

            if ($disk->exists($storedAsset->path) && ! $disk->delete($storedAsset->path)) {
                throw ValidationException::withMessages(['media' => 'The file could not be deleted. Please try again.']);
            }

            $storedAsset->delete();
        });
    }

    /**
     * Every place a block, saved block or block style points at a file.
     *
     * @return Generator<int, array{tenant: string|null, label: string, paths: list<string>}>
     */
    private function references(?Model $tenant = null, bool $everyTenant = false): Generator
    {
        $scope = fn (Builder $query): Builder => $everyTenant ? $query : $query->forTenant($tenant);
        $blockScope = fn (Builder $query): Builder => match (true) {
            $everyTenant => $query,
            $tenant === null => $query->whereNull('tenant_id'),
            default => $query->where('tenant_type', $tenant->getMorphClass())->where('tenant_id', $tenant->getKey()),
        };

        foreach ($scope(SavedBlock::withoutGlobalScopes())
            ->select(['id', 'tenant_type', 'tenant_id', 'name', 'archived_at', 'content', 'background_image_path', 'background_video_url'])
            ->lazyById(100) as $block) {
            yield [
                'tenant' => static::tenantKey($block->tenant_type, $block->tenant_id),
                'label' => 'Saved block: '.$block->name.($block->archived_at ? ' (archived)' : ''),
                'paths' => $this->blockPaths($block->content, $block->background_image_path, $block->background_video_url),
            ];
        }

        // A picture used only by a block style is on no block's own column, so
        // without this loop it would look unused and be offered for deletion,
        // taking the background off every block that follows that style.
        foreach ($scope(BlockStyle::withoutGlobalScopes())
            ->select(['id', 'tenant_type', 'tenant_id', 'name', 'archived_at', 'background_image_path', 'background_video_url'])
            ->lazyById(100) as $style) {
            yield [
                'tenant' => static::tenantKey($style->tenant_type, $style->tenant_id),
                'label' => 'Block style: '.$style->name.($style->archived_at ? ' (archived)' : ''),
                'paths' => $this->paths([$style->background_image_path, $style->background_video_url]),
            ];
        }

        foreach ($blockScope(ContentBlock::query())
            ->select(['id', 'tenant_type', 'tenant_id', 'blockable_type', 'blockable_id', 'content', 'background_image_path', 'background_video_url'])
            ->with('blockable')
            ->lazyById(100) as $block) {
            yield [
                'tenant' => static::tenantKey($block->tenant_type, $block->tenant_id),
                'label' => static::ownerLabel($block),
                'paths' => $this->blockPaths($block->content, $block->background_image_path, $block->background_video_url),
            ];
        }
    }

    /**
     * "Page: About us" for a block on a page titled About us.
     */
    private static function ownerLabel(ContentBlock $block): string
    {
        $owner = $block->blockable;
        $type = Str::headline(class_basename($block->blockable_type ?? 'Page'));

        if ($owner === null) {
            return $type;
        }

        $name = $owner->getAttribute('title') ?? $owner->getAttribute('name') ?? '#'.$owner->getKey();

        return $type.': '.(is_scalar($name) ? $name : '#'.$owner->getKey());
    }

    private static function tenantKey(?string $type, mixed $id): ?string
    {
        return $id === null ? null : $type.':'.$id;
    }

    /**
     * @param  array<mixed>|null  $content
     * @return list<string>
     */
    private function blockPaths(?array $content, ?string $imagePath, ?string $videoUrl): array
    {
        $values = [$imagePath, $videoUrl];
        $content ??= [];
        array_walk_recursive($content, function (mixed $value, string|int $key) use (&$values): void {
            if (in_array($key, ['url', 'src', 'href', 'previewUrl'], true) && is_string($value)) {
                $values[] = $value;
            }
        });

        return $this->paths($values);
    }

    /**
     * @param  array<mixed>  $values
     * @return list<string>
     */
    private function paths(array $values): array
    {
        $paths = [];

        foreach ($values as $value) {
            if (is_string($value) && ($path = $this->diskPath($value)) !== null) {
                $paths[] = $path;
            }
        }

        return array_values(array_unique($paths));
    }

    /**
     * The path on the library disk that a stored value points at: either the
     * path itself, or a URL on that disk. Anything else (another site, a
     * path that tries to climb out of the disk) is null.
     */
    private function diskPath(string $value): ?string
    {
        $baseUrl = rtrim(Storage::disk(static::disk())->url(''), '/').'/';
        $basePath = parse_url($baseUrl, PHP_URL_PATH);

        if (str_starts_with($value, $baseUrl)) {
            $value = substr($value, strlen($baseUrl));
        } elseif (is_string($basePath) && $basePath !== '/' && str_starts_with($value, $basePath)) {
            $value = substr($value, strlen($basePath));
        } elseif (str_contains($value, '://') || str_starts_with($value, '//') || str_starts_with($value, '/')) {
            return null;
        }

        $path = rawurldecode(explode('?', explode('#', $value, 2)[0], 2)[0]);

        if ($path === '' || str_contains($path, "\0") || str_contains($path, '\\') || str_starts_with($path, '/') || preg_match('#(^|/)\.{1,2}(/|$)#', $path) === 1) {
            return null;
        }

        return $path;
    }
}
