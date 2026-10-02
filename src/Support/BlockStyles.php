<?php

namespace Vortechron\FilamentBlockEditor\Support;

use Filament\Facades\Filament;
use Illuminate\Database\Eloquent\Model;
use Vortechron\FilamentBlockEditor\Models\BlockStyle;

/**
 * Looks up block styles once per request.
 *
 * A page can render dozens of blocks and most of them follow the same handful
 * of styles, so resolving a style must not cost one query per block. Eager
 * load blocks with their style wherever you can; this class is the backstop
 * for everywhere you cannot: a missed eager load costs one query per style,
 * not one per block.
 *
 * Bound with ->scoped() in the service provider, never ->singleton() and
 * never a static array on the model: RefreshDatabase restarts ids at 1 for
 * every test, so a cache that outlives the request would serve one test's
 * style to another.
 */
class BlockStyles
{
    /**
     * Styles already looked up this request, keyed by id. A missing style is
     * remembered as null so a dangling id is not queried again.
     *
     * @var array<int, BlockStyle|null>
     */
    private array $styles = [];

    /**
     * Global scopes are dropped on purpose. The id always comes from a
     * validated foreign key, and blocks are read outside the panel tenant by
     * the media library and the public pages.
     */
    public function find(?int $id): ?BlockStyle
    {
        if ($id === null) {
            return null;
        }

        // array_key_exists, not ??=: a missing style is cached as null, and
        // ??= treats a stored null as "not cached" and queries again.
        if (! array_key_exists($id, $this->styles)) {
            $this->styles[$id] = BlockStyle::withoutGlobalScopes()->find($id);
        }

        return $this->styles[$id];
    }

    /**
     * Forget one style, so the rest of this request sees a fresh copy. Call it
     * straight after writing to a style, or the editor preview redraws with
     * the values it had before the write.
     */
    public function forget(int $id): void
    {
        unset($this->styles[$id]);
    }

    /**
     * The style new blocks should start with, or null when none is picked.
     * Defaults to the tenant open in the panel.
     */
    public function defaultFor(?Model $tenant = null): ?BlockStyle
    {
        return BlockStyle::withoutGlobalScopes()
            ->forTenant($tenant ?? Filament::getTenant())
            ->where('is_default', true)
            ->whereNull('archived_at')
            ->first();
    }

    /**
     * Options for the style picker in the Block style sheet, by name.
     * Archived styles are left out: existing blocks keep following them, but
     * no new block should be pointed at one.
     *
     * @return array<int, string>
     */
    public function optionsFor(?Model $tenant = null): array
    {
        return BlockStyle::withoutGlobalScopes()
            ->forTenant($tenant ?? Filament::getTenant())
            ->whereNull('archived_at')
            ->orderBy('name')
            ->pluck('name', 'id')
            ->all();
    }
}
