<?php

namespace Vortechron\FilamentBlockEditor\Tests;

use Orchestra\Testbench\TestCase as Orchestra;
use Vortechron\FilamentBlockEditor\FilamentBlockEditorServiceProvider;

/**
 * Boots only the package, so the content core is tested without Filament.
 */
abstract class TestCase extends Orchestra
{
    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [FilamentBlockEditorServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
        $app['config']->set('app.locale', 'ms');
        $app['config']->set('app.fallback_locale', 'en');
    }
}
