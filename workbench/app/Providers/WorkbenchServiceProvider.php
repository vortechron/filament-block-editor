<?php

namespace Workbench\App\Providers;

use Filament\Support\Icons\Heroicon;
use Illuminate\Support\ServiceProvider;
use Vortechron\FilamentBlockEditor\PageSections;

class WorkbenchServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Demo only: link uploads by path, so they load on whatever address
        // the demo is opened from (localhost, a tailnet name, ...).
        config(['filesystems.disks.public.url' => '/storage']);

        $this->loadViewsFrom(__DIR__.'/../../resources/views', 'workbench');

        PageSections::register(
            'contact',
            'Contact form',
            'workbench::sections.contact',
            Heroicon::OutlinedEnvelope,
            'The contact form, drawn by the page.',
        );
    }
}
