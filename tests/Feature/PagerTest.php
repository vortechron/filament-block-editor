<?php

namespace Vortechron\FilamentBlockEditor\Tests\Feature;

use Vortechron\FilamentBlockEditor\Rendering\Pager;
use Vortechron\FilamentBlockEditor\Tests\TestCase;

/**
 * Page buttons for a long list in a block: the visitor flips through the
 * pages with ‹ ›, and no JavaScript is needed.
 */
class PagerTest extends TestCase
{
    public function test_a_list_is_cut_into_pages(): void
    {
        $this->assertSame([[1, 2], [3, 4], [5]], Pager::pages([1, 2, 3, 4, 5], 2));
        $this->assertSame([[1, 2]], Pager::pages([1, 2, 3, 4, 5], 2, paged: false));
        $this->assertSame([[1]], Pager::pages([1], 0));
        $this->assertSame([], Pager::pages([], 3));
        $this->assertCount(Pager::MAX_PAGES, Pager::pages(range(1, 100), 1));
    }

    public function test_pages_are_drawn_with_buttons_to_the_page_before_and_after(): void
    {
        app()->setLocale('ms');

        $html = view('filament-block-editor::pager', ['name' => 'list-1', 'pages' => ['<p>A</p>', '<p>B</p>', '<p>C</p>']])->render();

        $this->assertSame(3, substr_count($html, 'type="radio" name="fbe-pager-list-1"'));
        $this->assertSame(1, substr_count($html, 'checked'));
        $this->assertStringContainsString('<p>A</p>', $html);
        $this->assertStringContainsString('<p>C</p>', $html);
        $this->assertStringContainsString('1 / 3', $html);
        $this->assertStringContainsString('for="fbe-pager-list-1-2" aria-label="Halaman seterusnya"', $html);
        $this->assertStringContainsString('for="fbe-pager-list-1-1" aria-label="Halaman sebelumnya"', $html);
    }

    public function test_one_page_is_drawn_without_buttons(): void
    {
        $html = view('filament-block-editor::pager', ['name' => 'list-1', 'pages' => ['<p>A</p>']])->render();

        $this->assertSame('<p>A</p>', trim($html));
    }

    public function test_the_group_name_comes_from_the_block_and_is_safe_in_html(): void
    {
        $this->assertSame('stat0001-cat8', Pager::name(['id' => 'stat0001-cat8']));
        $this->assertSame('a-b-c', Pager::name(['id' => 'a"b<c']));
        $this->assertMatchesRegularExpression('/^p\d+$/', Pager::name([]));
    }
}
