<?php

namespace Vortechron\FilamentBlockEditor\Content;

/**
 * What a person who is not a developer may change, enforced on save
 * (PageValue::guard()). By section and block id it:
 *
 * 1. copies the stored developer-only data back over the new value, and
 *    drops it from elements that are new: every `lock`, `advanced.css`,
 *    and the block data DeveloperData guards;
 * 2. puts back a section locked `remove` that is missing (at its stored
 *    position, or the end), and keeps its stored hidden state;
 * 3. puts a section locked `move` back at its stored position;
 * 4. keeps the stored document of a section locked `content`, and the
 *    stored look fields, `style` and `advanced` of one locked `style`;
 * 5. keeps the type of a section with any lock: a locked rich section
 *    cannot become a synced one.
 *
 * Who is a developer is the caller's decision. Both values must be
 * normalized sections; PageValue::guard() cleans the result again.
 */
final class PageGuard
{
    /**
     * @param  list<array<string, mixed>>  $new
     * @param  list<array<string, mixed>>  $stored
     * @return list<array<string, mixed>>
     */
    public static function apply(array $new, array $stored): array
    {
        $storedById = array_column($stored, null, 'id');
        $blocks = DeveloperData::storedBlocks($stored);

        $sections = array_map(fn (array $section): array => self::section($section, $storedById[$section['id']] ?? null, $blocks), $new);

        return self::restoreOrder(self::restoreRemoved($sections, $stored), $stored);
    }

    /**
     * @param  array<string, mixed>  $section
     * @param  array<string, mixed>|null  $old
     * @param  array<string, array<string, mixed>>  $blocks
     * @return array<string, mixed>
     */
    private static function section(array $section, ?array $old, array $blocks): array
    {
        $oldRich = ($old['type'] ?? null) === PageContent::TYPE ? $old : null;
        $lock = $oldRich['lock'] ?? [];

        if ($section['type'] !== PageContent::TYPE) {
            if ($lock === []) {
                return $section;
            }

            // A locked section cannot be swapped for a synced one.
            unset($oldRich['hidden']);
            $hidden = isset($lock['remove']) ? isset($old['hidden']) : isset($section['hidden']);

            return [...$oldRich, ...($hidden ? ['hidden' => true] : [])];
        }

        unset($section['lock']);
        $data = $section['data'];

        if (isset($lock['content'])) {
            $data['document'] = $oldRich['data']['document'];
        }

        if (isset($lock['style'])) {
            $data = ['document' => $data['document'], ...array_diff_key($oldRich['data'], ['document' => true])];
        }

        $data['document'] = DeveloperData::document($data['document'] ?? [], $blocks);
        $data = self::withStoredCss($data, $oldRich['data']['advanced']['css'] ?? null);

        if (isset($lock['remove'])) {
            unset($section['hidden']);
            $section = [...$section, ...(isset($oldRich['hidden']) ? ['hidden' => true] : [])];
        }

        return [...$section, 'data' => $data, ...($lock === [] ? [] : ['lock' => $lock])];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function withStoredCss(array $data, ?string $css): array
    {
        $advanced = is_array($data['advanced'] ?? null) ? $data['advanced'] : [];
        unset($advanced['css']);

        if ($css !== null) {
            $advanced['css'] = $css;
        }

        unset($data['advanced']);

        return $advanced === [] ? $data : [...$data, 'advanced' => $advanced];
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     * @param  list<array<string, mixed>>  $stored
     * @return list<array<string, mixed>>
     */
    private static function restoreRemoved(array $sections, array $stored): array
    {
        foreach ($stored as $position => $section) {
            // Only a section of the same type counts as the stored one.
            $present = array_filter($sections, fn (array $new): bool => $new['id'] === $section['id'] && $new['type'] === $section['type']);

            if (! isset($section['lock']['remove']) || $present !== []) {
                continue;
            }

            array_splice($sections, min($position, count($sections)), 0, [$section]);
        }

        return $sections;
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     * @param  list<array<string, mixed>>  $stored
     * @return list<array<string, mixed>>
     */
    private static function restoreOrder(array $sections, array $stored): array
    {
        $pinned = [];

        foreach ($stored as $position => $section) {
            if (isset($section['lock']['move'])) {
                $pinned[$section['id']] = $position;
            }
        }

        $moving = array_values(array_filter($sections, fn (array $section): bool => isset($pinned[$section['id']])));
        usort($moving, fn (array $a, array $b): int => $pinned[$a['id']] <=> $pinned[$b['id']]);
        $sections = array_values(array_filter($sections, fn (array $section): bool => ! isset($pinned[$section['id']])));

        foreach ($moving as $section) {
            array_splice($sections, min($pinned[$section['id']], count($sections)), 0, [$section]);
        }

        return $sections;
    }
}
