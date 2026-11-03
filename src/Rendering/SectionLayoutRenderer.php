<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteDocument;
use Vortechron\FilamentBlockEditor\BlockNote\BlockNoteRenderer;
use Vortechron\FilamentBlockEditor\BlockNote\Blocks;
use Vortechron\FilamentBlockEditor\Content\DynamicValues;
use Vortechron\FilamentBlockEditor\Enums\SectionLayout;
use Vortechron\FilamentBlockEditor\Styling\StyleSheet;

/**
 * Draws a section's document in its layout (Enums\SectionLayout). It only
 * groups the top-level blocks: each group is drawn by BlockNoteRenderer, so
 * escaping and safe addresses stay in one place.
 *
 * Grid layouts split the document into runs. A run of items (cards, tiles,
 * reviews, questions, bento tiles, steps, numbers, comparison columns or
 * ticker items) becomes a grid; the blocks between runs stay plain text. A
 * document with no items is drawn as plain text, so a layout never hides
 * anything the author wrote.
 */
final class SectionLayoutRenderer
{
    /**
     * Blocks that end a card or a review, so a closing button sits under
     * the grid, not inside the last item.
     */
    private const CLOSING_BLOCKS = [Blocks::BUTTON];

    /**
     * Blocks the hero moves beside its words on a laptop.
     */
    private const MEDIA_BLOCKS = ['image', 'video', Blocks::GALLERY];

    private const TICK_MARKS = ['✅', '✔️', '✔', '☑️', '☑', '✓'];

    private const CROSS_MARKS = ['❌', '✖️', '✖', '✗', '✘', '⛔', '🚫', '❎'];

    private RenderContext $context;

    /**
     * See BlockNoteRenderer::render(). Grid items that are drawn here, like
     * tiles and reviews, get the mark of the block they came from.
     */
    private bool $forBuilder = false;

    public function __construct(private readonly BlockNoteRenderer $renderer)
    {
        $this->context = new RenderContext;
    }

    /**
     * For the builder (`$context->forBuilder`) each top-level block carries
     * its place in the document (BlockNoteRenderer::ITEM_PATH) before the
     * layout splits the blocks into groups, because a group no longer knows
     * where its blocks came from.
     *
     * @param  array<mixed>  $document
     */
    public function render(array $document, SectionLayout $layout, ?RenderContext $context = null): string
    {
        $this->context = $context ?? new RenderContext;
        $this->forBuilder = $this->context->forBuilder;
        $blocks = array_values(array_filter($document, is_array(...)));

        if ($this->forBuilder) {
            foreach ($blocks as $index => $block) {
                $blocks[$index][BlockNoteRenderer::ITEM_PATH] = (string) $index;
            }
        }

        try {
            return StyleSheet::collect(fn (): string => match ($layout) {
                SectionLayout::Hero => $this->hero($blocks),
                SectionLayout::Product => $this->product($blocks),
                SectionLayout::Poster => $this->poster($blocks),
                SectionLayout::Editorial => $this->editorial($blocks),
                SectionLayout::Compare => $this->compare($blocks),
                SectionLayout::Highlight => '<div class="sf-highlight sf-rich">'.$this->draw($blocks).'</div>',
                SectionLayout::Cards, SectionLayout::Ticks, SectionLayout::Reviews, SectionLayout::Faq,
                SectionLayout::Bento, SectionLayout::Steps, SectionLayout::Stats, SectionLayout::Marquee => $this->grid($blocks, $layout),
                default => $this->onlyOwnBlocks($blocks)
                    ? '<div class="sf-own">'.$this->draw($blocks).'</div>'
                    : '<div class="sf-rich">'.$this->draw($blocks).'</div>',
            });
        } finally {
            $this->context = new RenderContext;
            $this->forBuilder = false;
        }
    }

    /**
     * A section made only of the app's own blocks is drawn outside the text
     * styles (.sf-rich), so the app's own markup keeps its own look.
     *
     * @param  list<array<mixed>>  $blocks
     */
    private function onlyOwnBlocks(array $blocks): bool
    {
        if ($blocks === []) {
            return false;
        }

        foreach ($blocks as $block) {
            if (($block['type'] ?? null) !== 'ownBlock') {
                return false;
            }
        }

        return true;
    }

    /**
     * The words, and the first photo, video or slideshow beside them. A
     * hero with no media, or with only media, is one centred column.
     *
     * @param  list<array<mixed>>  $blocks
     */
    private function hero(array $blocks): string
    {
        [$mediaIndex, $words] = $this->splitMedia($blocks);

        if ($mediaIndex === null || $words === []) {
            return '<div class="sf-hero"><div class="sf-hero-copy sf-rich">'.$this->draw($blocks).'</div></div>';
        }

        return '<div class="sf-hero sf-hero-split">'
            .'<div class="sf-hero-copy sf-rich">'.$this->draw($words).'</div>'
            .'<div class="sf-hero-media sf-rich">'.$this->draw([$blocks[$mediaIndex]]).'</div>'
            .'</div>';
    }

    /**
     * A feature section: the first photo, video or slideshow on one side,
     * everything else in a column beside it. Without media it is the
     * column alone, centred.
     *
     * @param  list<array<mixed>>  $blocks
     */
    private function product(array $blocks): string
    {
        [$mediaIndex, $words] = $this->splitMedia($blocks);

        if ($mediaIndex === null || $words === []) {
            return '<div class="sf-product"><div class="sf-product-buy sf-rich">'.$this->draw($blocks).'</div></div>';
        }

        return '<div class="sf-product sf-product-split">'
            .'<div class="sf-product-media sf-rich">'.$this->draw([$blocks[$mediaIndex]]).'</div>'
            .'<div class="sf-product-buy sf-rich">'.$this->draw($words).'</div>'
            .'</div>';
    }

    /**
     * The first photo or video fills the section and the words sit on it.
     * Without one, the words stand alone, big, on the page colour.
     *
     * @param  list<array<mixed>>  $blocks
     */
    private function poster(array $blocks): string
    {
        [$mediaIndex, $words] = $this->splitMedia($blocks);

        if ($mediaIndex === null || $words === []) {
            return '<div class="sf-poster"><div class="sf-poster-copy sf-rich">'.$this->draw($blocks).'</div></div>';
        }

        return '<div class="sf-poster sf-poster-photo">'
            .'<div class="sf-poster-media sf-rich" aria-hidden="true">'.$this->draw([$blocks[$mediaIndex]]).'</div>'
            .'<div class="sf-poster-copy sf-rich">'.$this->draw($words).'</div>'
            .'</div>';
    }

    /**
     * A magazine spread: the blocks up to and including the first heading
     * on one side, the rest beside them. Without a heading, or with nothing
     * after it, it is one column.
     *
     * @param  list<array<mixed>>  $blocks
     */
    private function editorial(array $blocks): string
    {
        $headingIndex = null;

        foreach ($blocks as $index => $block) {
            if (($block['type'] ?? null) === 'heading') {
                $headingIndex = $index;

                break;
            }
        }

        $body = $headingIndex === null ? [] : array_slice($blocks, $headingIndex + 1);

        if ($body === []) {
            return '<div class="sf-editorial"><div class="sf-editorial-body sf-rich">'.$this->draw($blocks).'</div></div>';
        }

        return '<div class="sf-editorial sf-editorial-split">'
            .'<div class="sf-editorial-head sf-rich">'.$this->draw(array_slice($blocks, 0, $headingIndex + 1)).'</div>'
            .'<div class="sf-editorial-body sf-rich">'.$this->draw($body).'</div>'
            .'</div>';
    }

    /**
     * Two columns side by side. With level 3 headings, each one starts a
     * column; without, crosses go in the first column and the rest in the
     * second. A column of mostly crosses is drawn as the "before" side.
     *
     * @param  list<array<mixed>>  $blocks
     */
    private function compare(array $blocks): string
    {
        $hasTitles = array_filter($blocks, fn (array $block): bool => $this->isHeading($block, 3)) !== [];

        if ($hasTitles) {
            return $this->grid($blocks, SectionLayout::Compare);
        }

        $first = null;
        $last = null;

        foreach ($blocks as $index => $block) {
            if ($this->isListItem($block)) {
                $first ??= $index;
                $last = $index;
            }
        }

        if ($first === null) {
            return '<div class="sf-rich">'.$this->draw($blocks).'</div>';
        }

        $items = array_values(array_filter(array_slice($blocks, $first, $last - $first + 1), $this->isListItem(...)));
        $crosses = array_values(array_filter($items, fn (array $item): bool => $this->mark($item) === 'cross'));
        $others = array_values(array_filter($items, fn (array $item): bool => $this->mark($item) !== 'cross'));
        $between = array_values(array_filter(array_slice($blocks, $first, $last - $first + 1), fn (array $block): bool => ! $this->isListItem($block)));
        $before = array_slice($blocks, 0, $first);
        $after = [...$between, ...array_slice($blocks, $last + 1)];
        $columns = array_values(array_filter([$crosses, $others]));

        return ($before !== [] ? '<div class="sf-rich sf-intro">'.$this->draw($before).'</div>' : '')
            .'<div class="sf-grid sf-grid-compare">'
            .implode('', array_map(fn (array $column): string => $this->compareColumn($column), $columns))
            .'</div>'
            .($after !== [] ? '<div class="sf-rich">'.$this->draw($after).'</div>' : '');
    }

    /**
     * One side of a comparison: its title, then its items as ticks and
     * crosses.
     *
     * @param  list<array<mixed>>  $item
     */
    private function compareColumn(array $item): string
    {
        $listItems = array_values(array_filter($item, $this->isListItem(...)));
        $crosses = count(array_filter($listItems, fn (array $block): bool => $this->mark($block) === 'cross'));
        $side = $listItems !== [] && $crosses * 2 > count($listItems) ? 'before' : 'after';
        $html = '';
        $text = [];

        foreach ($item as $block) {
            if ($this->isListItem($block)) {
                $html .= ($text !== [] ? '<div class="sf-rich">'.$this->draw($text).'</div>' : '').$this->tile($block);
                $text = [];

                continue;
            }

            $text[] = $block;
        }

        $html .= $text !== [] ? '<div class="sf-rich">'.$this->draw($text).'</div>' : '';

        return '<div class="sf-item sf-compare sf-compare-'.$side.'">'.$html.'</div>';
    }

    /**
     * The first photo, video or slideshow, and every other block.
     *
     * @param  list<array<mixed>>  $blocks
     * @return array{0: int|null, 1: list<array<mixed>>}
     */
    private function splitMedia(array $blocks): array
    {
        foreach ($blocks as $index => $block) {
            if ($this->isMedia($block)) {
                return [$index, array_values(array_filter($blocks, fn (int $other): bool => $other !== $index, ARRAY_FILTER_USE_KEY))];
            }
        }

        return [null, $blocks];
    }

    /**
     * A photo, video or slideshow. One with nothing in it yet (or only an
     * address the page would not show) only counts in the builder, where it
     * shows where the author's photo goes; visitors get the layout without it.
     *
     * @param  array<mixed>  $block
     */
    private function isMedia(array $block): bool
    {
        $type = $block['type'] ?? null;

        if (! in_array($type, self::MEDIA_BLOCKS, true)) {
            return false;
        }

        $props = is_array($block['props'] ?? null) ? $block['props'] : [];

        return $this->forBuilder || match ($type) {
            Blocks::GALLERY => Blocks::galleryUrls($props['images'] ?? null) !== [],
            default => app(DynamicValues::class)->media($props['url'] ?? null, $this->context) !== null,
        };
    }

    /**
     * @param  array<mixed>  $block
     */
    private function isHeading(array $block, int $level): bool
    {
        return ($block['type'] ?? null) === 'heading' && (int) ($block['props']['level'] ?? 1) === $level;
    }

    /**
     * @param  array<mixed>  $block
     */
    private function isListItem(array $block): bool
    {
        return in_array($block['type'] ?? null, ['bulletListItem', 'numberedListItem', 'checkListItem'], true);
    }

    /**
     * @param  array<mixed>  $block
     * @return 'tick'|'cross'|null
     */
    private function mark(array $block): ?string
    {
        return $this->withoutMark(is_array($block['content'] ?? null) ? $block['content'] : [])[0];
    }

    /**
     * @param  list<array<mixed>>  $blocks
     */
    private function grid(array $blocks, SectionLayout $layout): string
    {
        $segments = $this->segments($blocks, $layout);
        $html = '';

        foreach ($segments as $number => $segment) {
            if ($segment['items'] === null) {
                $isIntro = ($segments[$number + 1]['items'] ?? null) !== null && $number === 0;
                $html .= '<div class="sf-rich'.($isIntro ? ' sf-intro' : '').'">'.$this->draw($segment['blocks']).'</div>';

                continue;
            }

            $items = implode('', array_map(fn (array $item): string => $this->item($item, $layout), $segment['items']));
            $html .= $layout === SectionLayout::Marquee
                ? '<div class="sf-marquee"><div class="sf-marquee-track"><ul class="sf-marquee-list">'.$items.'</ul><ul class="sf-marquee-list" aria-hidden="true">'.$items.'</ul></div></div>'
                : '<div class="sf-grid sf-grid-'.$layout->value.'">'.$items.'</div>';
        }

        return $html;
    }

    /**
     * The document as plain runs and item runs, in order.
     *
     * @param  list<array<mixed>>  $blocks
     * @return list<array{blocks: list<array<mixed>>, items: list<list<array<mixed>>>|null}>
     */
    private function segments(array $blocks, SectionLayout $layout): array
    {
        $segments = [];
        $plain = [];
        $index = 0;

        while ($index < count($blocks)) {
            if (! $this->startsItem($blocks[$index], $layout)) {
                $plain[] = $blocks[$index];
                $index++;

                continue;
            }

            if ($plain !== []) {
                $segments[] = ['blocks' => $plain, 'items' => null];
                $plain = [];
            }

            $items = [];

            while ($index < count($blocks) && $this->startsItem($blocks[$index], $layout)) {
                $item = [$blocks[$index]];
                $index++;

                while ($index < count($blocks) && $this->continuesItem($blocks[$index], $layout)) {
                    $item[] = $blocks[$index];
                    $index++;
                }

                $items[] = $item;
            }

            $segments[] = ['blocks' => [], 'items' => $items];
        }

        if ($plain !== []) {
            $segments[] = ['blocks' => $plain, 'items' => null];
        }

        return $segments;
    }

    /**
     * @param  array<mixed>  $block
     */
    private function startsItem(array $block, SectionLayout $layout): bool
    {
        $type = $block['type'] ?? null;

        return match ($layout) {
            SectionLayout::Cards, SectionLayout::Bento, SectionLayout::Steps, SectionLayout::Stats, SectionLayout::Compare => $this->isHeading($block, 3),
            SectionLayout::Ticks, SectionLayout::Marquee => $this->isListItem($block),
            SectionLayout::Reviews => $type === 'quote',
            SectionLayout::Faq => $type === 'toggleListItem'
                || ($type === 'heading' && filter_var($block['props']['isToggleable'] ?? false, FILTER_VALIDATE_BOOL)),
            default => false,
        };
    }

    /**
     * Whether a block belongs to the card or review above it. A tile and a
     * question are one block each.
     *
     * @param  array<mixed>  $block
     */
    private function continuesItem(array $block, SectionLayout $layout): bool
    {
        $type = $block['type'] ?? null;

        return match ($layout) {
            SectionLayout::Cards, SectionLayout::Bento, SectionLayout::Steps, SectionLayout::Stats, SectionLayout::Compare => ! in_array($type, self::CLOSING_BLOCKS, true)
                && ! ($type === 'heading' && (int) ($block['props']['level'] ?? 1) <= 3),
            SectionLayout::Reviews => in_array($type, ['paragraph', 'image', 'video'], true),
            default => false,
        };
    }

    /**
     * @param  list<array<mixed>>  $item
     */
    private function item(array $item, SectionLayout $layout): string
    {
        return match ($layout) {
            SectionLayout::Ticks => $this->tile($item[0]),
            SectionLayout::Reviews => $this->review($item),
            SectionLayout::Bento => $this->bentoTile($item),
            SectionLayout::Steps => '<div class="sf-item sf-step"><span class="sf-step-number" aria-hidden="true"></span><div class="sf-rich">'.$this->draw($item).'</div></div>',
            SectionLayout::Stats => '<div class="sf-item sf-stat sf-rich">'.$this->draw($item).'</div>',
            SectionLayout::Compare => $this->compareColumn($item),
            SectionLayout::Marquee => '<li class="sf-marquee-item"'.$this->itemMark($item[0]).'>'.e(trim(BlockNoteDocument::text([['type' => 'paragraph', 'content' => $this->withoutMark(is_array($item[0]['content'] ?? null) ? $item[0]['content'] : [])[1]]]))).'</li>',
            SectionLayout::Faq => '<div class="sf-item sf-question sf-rich">'.$this->draw($item).'</div>',
            default => '<div class="sf-item sf-card sf-rich">'.$this->draw($item).'</div>',
        };
    }

    /**
     * A bento tile. A tile with a photo shows the photo behind its words.
     *
     * @param  list<array<mixed>>  $item
     */
    private function bentoTile(array $item): string
    {
        [$mediaIndex, $words] = $this->splitMedia($item);

        if ($mediaIndex === null || ($item[$mediaIndex]['type'] ?? null) !== 'image') {
            return '<div class="sf-item sf-bento sf-rich">'.$this->draw($item).'</div>';
        }

        return '<div class="sf-item sf-bento sf-bento-photo">'
            .'<div class="sf-bento-media sf-rich">'.$this->draw([$item[$mediaIndex]]).'</div>'
            .'<div class="sf-bento-copy sf-rich">'.$this->draw($words).'</div>'
            .'</div>';
    }

    /**
     * A list item as a tile. A leading ✅ or ❌ becomes the tile's icon.
     * The item's children are drawn beside its words, so they get their
     * own places in the document here.
     *
     * @param  array<mixed>  $block
     */
    private function tile(array $block): string
    {
        $content = is_array($block['content'] ?? null) ? $block['content'] : [];
        [$mark, $content] = $this->withoutMark($content);
        $kind = match (true) {
            ($block['type'] ?? null) === 'numberedListItem' => 'number',
            $mark === 'cross' => 'cross',
            default => 'tick',
        };
        $text = ['id' => $block['id'] ?? null, 'type' => 'paragraph', 'props' => is_array($block['props'] ?? null) ? $block['props'] : [], 'content' => $content, 'children' => [], ...$this->samePlace($block)];
        $children = is_array($block['children'] ?? null) ? array_values(array_filter($block['children'], is_array(...))) : [];

        if ($this->forBuilder && isset($block[BlockNoteRenderer::ITEM_PATH])) {
            foreach ($children as $index => $child) {
                $children[$index][BlockNoteRenderer::ITEM_PATH] = $block[BlockNoteRenderer::ITEM_PATH].'.'.$index;
            }
        }

        return '<div class="sf-item sf-tile sf-tile-'.$kind.'"'.$this->itemMark($block).'>'
            .'<span class="sf-tile-icon" aria-hidden="true"></span>'
            .'<div class="sf-tile-text sf-rich">'.$this->draw([$text, ...$children]).'</div>'
            .'</div>';
    }

    /**
     * A quote as a review card. A line of stars and a name right under it,
     * such as "★★★★★ — Aisyah", becomes the stars and the name.
     *
     * @param  list<array<mixed>>  $item
     */
    private function review(array $item): string
    {
        $quote = $item[0];
        $rest = array_slice($item, 1);
        $byLine = $rest[0] ?? null;
        $stars = 0;
        $name = '';

        if (($byLine['type'] ?? null) === 'paragraph'
            && preg_match('/^\s*([★⭐]{1,5})\s*(?:[—–-]\s*)?(.*)$/u', BlockNoteDocument::text([$byLine]), $matches) === 1) {
            $stars = mb_strlen($matches[1]);
            $name = trim($matches[2]);
            $rest = array_slice($rest, 1);
        }

        $words = ['id' => $quote['id'] ?? null, 'type' => 'paragraph', 'props' => is_array($quote['props'] ?? null) ? $quote['props'] : [], 'content' => $quote['content'] ?? [], 'children' => [], ...$this->samePlace($quote)];

        return '<figure class="sf-item sf-review"'.$this->itemMark($quote).'>'
            .($stars > 0 ? '<p class="sf-review-stars" aria-label="'.e(__('filament-block-editor::page.stars', ['count' => $stars])).'">'.str_repeat('★', $stars).'</p>' : '')
            .'<blockquote class="sf-review-quote sf-rich">'.$this->draw([$words]).'</blockquote>'
            .($rest !== [] ? '<div class="sf-review-extra sf-rich">'.$this->draw($rest).'</div>' : '')
            .($name !== '' ? '<figcaption class="sf-review-by"><span class="sf-review-avatar" aria-hidden="true">'.e(mb_strtoupper(mb_substr($name, 0, 1))).'</span><span>'.e($name).'</span></figcaption>' : '')
            .'</figure>';
    }

    /**
     * The tick or cross a list item starts with, and its words without it.
     *
     * @param  array<mixed>  $content
     * @return array{0: 'tick'|'cross'|null, 1: array<mixed>}
     */
    private function withoutMark(array $content): array
    {
        $first = $content[0] ?? null;

        if (! is_array($first) || ! is_string($first['text'] ?? null)) {
            return [null, $content];
        }

        $text = ltrim($first['text']);

        foreach (['tick' => self::TICK_MARKS, 'cross' => self::CROSS_MARKS] as $kind => $marks) {
            foreach ($marks as $mark) {
                if (str_starts_with($text, $mark)) {
                    $content[0] = [...$first, 'text' => ltrim(substr($text, strlen($mark)))];

                    return [$kind, $content];
                }
            }
        }

        return [null, $content];
    }

    /**
     * @param  list<array<mixed>>  $blocks
     */
    private function draw(array $blocks): string
    {
        return $this->renderer->render($blocks, $this->context);
    }

    /**
     * The ` data-item` mark of a grid item drawn here, from its block.
     *
     * @param  array<mixed>  $block
     */
    private function itemMark(array $block): string
    {
        $path = $block[BlockNoteRenderer::ITEM_PATH] ?? null;

        return $this->forBuilder && BlockNoteRenderer::isItemPath($path) ? ' data-item="'.e($path).'"' : '';
    }

    /**
     * The place of a block, to copy onto a block made from it.
     *
     * @param  array<mixed>  $block
     * @return array{_itemPath?: string}
     */
    private function samePlace(array $block): array
    {
        $path = $block[BlockNoteRenderer::ITEM_PATH] ?? null;

        return BlockNoteRenderer::isItemPath($path) ? [BlockNoteRenderer::ITEM_PATH => $path] : [];
    }
}
