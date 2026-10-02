<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;
use Vortechron\FilamentBlockEditor\Models\ContentBlock;
use Vortechron\FilamentBlockEditor\Models\MediaAsset;
use Vortechron\FilamentBlockEditor\Models\SavedBlock;

/**
 * The three tabs of the library sheet: ready-made designs, saved blocks and
 * media. Each item is picked by a "type:key" value ("preset:hero",
 * "saved:12", "media:7"), and attributes() turns that value into a new block.
 */
class BlockLibrary
{
    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public static function items(?Model $tenant, string $tab, string $search = '', int $page = 1): LengthAwarePaginator
    {
        $page = max(1, $page);
        $search = trim($search);

        if ($tab === 'presets') {
            $items = collect(BlockPresetLibrary::options())
                ->flatMap(fn (array $options, string $category) => collect($options)->map(
                    fn (string $name, string $key): array => [
                        'value' => 'preset:'.$key,
                        'name' => $name,
                        'description' => $category,
                        'block' => new ContentBlock([...ContentBlock::appearanceDefaults(), ...BlockPresetLibrary::attributes($key)]),
                    ],
                ))
                ->filter(fn (array $item): bool => $search === '' || mb_stripos($item['name'].' '.$item['description'], $search) !== false)
                ->values();

            return new LengthAwarePaginator($items->forPage($page, 12)->values(), $items->count(), 12, $page);
        }

        if ($tab === 'saved') {
            return SavedBlock::withoutGlobalScopes()->forTenant($tenant)->current()->with('blockStyle')
                ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                    ->where('name', 'like', '%'.$search.'%')->orWhere('description', 'like', '%'.$search.'%')))
                ->orderBy('name')->orderBy('id')
                ->paginate(12, ['*'], 'library_page', $page)
                ->through(fn (SavedBlock $block): array => [
                    'value' => 'saved:'.$block->id,
                    'name' => $block->name,
                    'description' => $block->description,
                    'block' => $block,
                ]);
        }

        // A PDF is never a picture, so it is left out of every picture picker.
        return MediaAsset::withoutGlobalScopes()->forTenant($tenant)->visual()
            ->when($search !== '', fn ($query) => $query->where('name', 'like', '%'.$search.'%'))
            ->latest('id')->paginate(12, ['*'], 'library_page', $page)
            ->through(fn (MediaAsset $asset): array => [
                'value' => 'media:'.$asset->id,
                'name' => $asset->name,
                'description' => $asset->isVideo() ? 'Video' : 'Image',
                'media' => $asset,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function attributes(?Model $tenant, string $selection): array
    {
        [$type, $id] = array_pad(explode(':', $selection, 2), 2, '');

        if ($type === 'preset' && BlockPresetLibrary::exists($id)) {
            return BlockPresetLibrary::attributes($id);
        }

        if ($type === 'saved' && ctype_digit($id)) {
            $block = SavedBlock::withoutGlobalScopes()->forTenant($tenant)->current()->find($id);

            if ($block !== null) {
                return $block->toBlockAttributes();
            }
        }

        if ($type === 'media' && ctype_digit($id)) {
            $asset = MediaAsset::withoutGlobalScopes()->forTenant($tenant)->visual()->find($id);

            if ($asset !== null) {
                return ['content' => [[
                    'type' => $asset->isVideo() ? 'video' : 'image',
                    'props' => ['url' => $asset->url, 'name' => $asset->name, 'caption' => '', 'showPreview' => true],
                ]]];
            }
        }

        throw ValidationException::withMessages(['selection' => 'This item is no longer available. Choose another one.']);
    }
}
