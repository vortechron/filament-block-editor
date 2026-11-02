<?php

namespace Workbench\App\Providers;

use Illuminate\Support\ServiceProvider;
use Vortechron\FilamentBlockEditor\Blocks\BlockRegistry;
use Vortechron\FilamentBlockEditor\Blocks\Field;
use Vortechron\FilamentBlockEditor\Blocks\OwnBlock;

class WorkbenchServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../../resources/views', 'workbench');

        // A demo own block, so the sample page shows how a host draws its own markup.
        $this->app->make(BlockRegistry::class)->register(
            OwnBlock::make('notice')
                ->label('Notice')
                ->icon('megaphone')
                ->description('A coloured note with a title and a link.')
                ->fields([
                    Field::text('title')->label('Title')->default('Good to know'),
                    Field::textarea('text')->label('Text'),
                    Field::select('tone')->label('Tone')->options(['info' => 'Info', 'warning' => 'Warning'])->default('info'),
                    Field::link('link')->label('Link'),
                ])
                ->view('workbench::blocks.notice'),
        );
    }
}
