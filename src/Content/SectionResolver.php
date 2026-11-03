<?php

namespace Vortechron\FilamentBlockEditor\Content;

/**
 * Finds the section a synced section points at: `['type' => 'ref', 'ref' => 12]`
 * on a page draws the section kept under ref 12. The package binds
 * NullSectionResolver, which finds nothing; a host that stores synced
 * sections (the CMS) binds its own.
 */
interface SectionResolver
{
    /**
     * One rich section (`['type' => 'rich', 'data' => [...]]`), or null when
     * there is none. The renderer cleans it again and draws only a rich
     * section: a ref inside it is never followed.
     *
     * @return array<string, mixed>|null
     */
    public function resolve(int|string $ref): ?array;
}
