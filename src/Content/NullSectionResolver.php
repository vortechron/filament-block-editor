<?php

namespace Vortechron\FilamentBlockEditor\Content;

/**
 * Resolves no synced section: a page's ref sections draw nothing for
 * visitors, and a "missing" placeholder in the builder.
 */
final class NullSectionResolver implements SectionResolver
{
    public function resolve(int|string $ref): ?array
    {
        return null;
    }
}
