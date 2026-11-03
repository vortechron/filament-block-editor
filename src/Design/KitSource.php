<?php

namespace Vortechron\FilamentBlockEditor\Design;

/**
 * Where the site's design kit comes from. The package binds
 * DefaultKitSource (Kit::defaults()); a host that stores a kit binds its
 * own source, usually with the OverridesKit trait:
 *
 *     $this->app->scoped(KitSource::class, CmsKitSource::class);
 */
interface KitSource
{
    /**
     * The kit pages are drawn with now, cleaned (Kit::normalize()): the
     * override when one is set, else the stored kit.
     *
     * @return array<string, mixed>
     */
    public function current(): array;

    /**
     * Draws with this kit instead of the stored one, for the rest of the
     * request or until override(null). The builder's preview uses it, so
     * unsaved kit changes show.
     *
     * @param  array<mixed>|null  $kit
     */
    public function override(?array $kit): void;
}
