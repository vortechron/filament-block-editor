<?php

namespace Vortechron\FilamentBlockEditor\Filament\Pages;

use Filament\Pages\Page;
use Vortechron\FilamentBlockEditor\Filament\Concerns\InteractsWithPageBuilder;

/**
 * A standalone Filament page that is the full-screen page builder. For a
 * resource page, use the InteractsWithPageBuilder trait on a resource page
 * instead.
 */
abstract class PageBuilderPage extends Page
{
    use InteractsWithPageBuilder;

    protected static bool $shouldRegisterNavigation = false;
}
