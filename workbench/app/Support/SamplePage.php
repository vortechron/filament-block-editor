<?php

namespace Workbench\App\Support;

use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Templates\SectionTemplates;

/**
 * A sample page for manual checks: every built-in template, with photos
 * filled in from the workbench's /photo/{n}.svg route, plus a section that
 * only holds the workbench's own "notice" block.
 */
final class SamplePage
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function sections(string $locale = 'en'): array
    {
        $photo = 0;
        $sections = [];

        foreach (SectionTemplates::all($locale) as $template) {
            $section = $template['section'];
            $section['data']['document'] = self::fill($section['data']['document'], $photo);
            $section['data']['anchor'] = $template['key'];
            $sections[] = $section;
        }

        $sections[] = ['id' => 'notice', 'type' => 'rich', 'data' => [
            'document' => [Blocks::heading(2, 'An own block'), Blocks::ownBlock('notice', ['title' => 'Drawn by the host app', 'text' => 'This box is a Blade view.', 'link' => '/'])],
            'layout' => 'plain',
            'anchor' => 'notice',
        ]];

        return $sections;
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     * @return list<array<string, mixed>>
     */
    private static function fill(array $blocks, int &$photo): array
    {
        foreach ($blocks as $index => $block) {
            if (($block['type'] ?? null) === 'image' && ($block['props']['url'] ?? '') === '') {
                $blocks[$index]['props']['url'] = '/photo/'.(++$photo % 6 + 1).'.svg';
            }

            if (($block['type'] ?? null) === Blocks::GALLERY) {
                $blocks[$index]['props']['images'] = implode("\n", array_map(fn (int $n): string => "/photo/{$n}.svg", [1, 2, 3, 4]));
            }

            if (($block['type'] ?? null) === 'video') {
                $blocks[$index]['props']['url'] = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            }

            $blocks[$index]['children'] = self::fill($block['children'] ?? [], $photo);
        }

        return $blocks;
    }
}
