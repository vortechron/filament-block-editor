<?php

namespace Vortechron\FilamentBlockEditor\Enums;

/**
 * How a section arranges its blocks on the page. The words stay the author's
 * own: a layout only groups and places them, so a section can switch layouts
 * freely. Rendering\SectionLayoutRenderer draws each one.
 */
enum SectionLayout: string
{
    case Plain = 'plain';
    case Hero = 'hero';
    case Cards = 'cards';
    case Ticks = 'ticks';
    case Reviews = 'reviews';
    case Faq = 'faq';
    case Highlight = 'highlight';
    case Banner = 'banner';
    case Product = 'product';
    case Poster = 'poster';
    case Editorial = 'editorial';
    case Bento = 'bento';
    case Steps = 'steps';
    case Stats = 'stats';
    case Compare = 'compare';
    case Marquee = 'marquee';

    public function label(): string
    {
        return match ($this) {
            self::Plain => 'Plain',
            self::Hero => 'Hero',
            self::Cards => 'Cards',
            self::Ticks => 'Ticks',
            self::Reviews => 'Reviews',
            self::Faq => 'FAQ',
            self::Highlight => 'Highlight',
            self::Banner => 'Banner',
            self::Product => 'Feature',
            self::Poster => 'Poster',
            self::Editorial => 'Magazine',
            self::Bento => 'Bento',
            self::Steps => 'Steps',
            self::Stats => 'Big numbers',
            self::Compare => 'Compare',
            self::Marquee => 'Ticker',
        };
    }

    /**
     * What the layout does, for the author and for an AI writer.
     */
    public function description(): string
    {
        return match ($this) {
            self::Plain => 'Text in one easy-to-read column.',
            self::Hero => 'The big first screen. The first photo, video or slideshow sits beside the words on a laptop.',
            self::Cards => 'Each level 3 heading starts a card, with the blocks under it inside.',
            self::Ticks => 'Each list item becomes a tile. Items that start with ✅ get a tick, ❌ a cross.',
            self::Reviews => 'Each quote becomes a review card. A line like "★★★★★ — Name" under it shows as the stars and name.',
            self::Faq => 'Each toggle becomes a question that opens. The heading sits beside them on a laptop.',
            self::Highlight => 'Everything on a raised card in the middle. For one thing that must stand out.',
            self::Banner => 'A bold band in the accent colour. For a closing call to action.',
            self::Product => 'The first photo, video or slideshow on one side, the title, details and button on the other.',
            self::Poster => 'The first photo fills the whole screen and the words sit over it, big. For a first screen that stops the scroll.',
            self::Editorial => 'A magazine spread: the words up to the first heading sit large on the left, the rest reads in a column on the right.',
            self::Bento => 'Each level 3 heading starts a tile in a grid of mixed sizes. The first tile is the biggest. A tile with a photo shows it.',
            self::Steps => 'Each level 3 heading starts a numbered step with a big number: 01, 02, 03.',
            self::Stats => 'Each level 3 heading is a big number or short fact, such as "4 hours" or "100%", with the words under it as its label.',
            self::Compare => 'Two columns side by side. Each level 3 heading starts a column; its ❌ items show crosses and its ✅ items ticks. Without headings, ❌ items go left and the rest right.',
            self::Marquee => 'A band where the list items scroll past like a news ticker. For short promises or facts.',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $layout): array => [
            'value' => $layout->value,
            'label' => $layout->label(),
            'description' => $layout->description(),
        ], self::cases());
    }
}
