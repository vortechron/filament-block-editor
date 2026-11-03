<?php

namespace Vortechron\FilamentBlockEditor\Enums;

/**
 * What the page builder edits: a page, the site's header or footer, a
 * synced section, or an entry type's card and single page.
 */
enum DocumentKind: string
{
    case Page = 'page';
    case Header = 'header';
    case Footer = 'footer';
    case Section = 'section';
    case Card = 'card';
    case Single = 'single';

    /**
     * The parts every page shows around its own sections.
     *
     * @return list<self>
     */
    public static function parts(): array
    {
        return [self::Header, self::Footer];
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $kind): string => $kind->value, self::cases());
    }

    public function isPart(): bool
    {
        return in_array($this, self::parts(), true);
    }
}
