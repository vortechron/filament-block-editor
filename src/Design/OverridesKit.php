<?php

namespace Vortechron\FilamentBlockEditor\Design;

/**
 * The override part of a KitSource. A source using it only says where its
 * stored kit comes from:
 *
 *     final class CmsKitSource implements KitSource
 *     {
 *         use OverridesKit;
 *
 *         protected function storedKit(): array
 *         {
 *             return Document::kit()?->content ?? [];
 *         }
 *     }
 *
 * The stored kit is cleaned and merged over Kit::defaults().
 */
trait OverridesKit
{
    /**
     * @var array<string, mixed>|null
     */
    private ?array $kitOverride = null;

    /**
     * The stored kit, as stored: any shape, cleaned by current().
     *
     * @return array<mixed>
     */
    abstract protected function storedKit(): array;

    public function current(): array
    {
        return $this->kitOverride ?? Kit::normalize($this->storedKit());
    }

    public function override(?array $kit): void
    {
        $this->kitOverride = $kit === null ? null : Kit::normalize($kit);
    }
}
