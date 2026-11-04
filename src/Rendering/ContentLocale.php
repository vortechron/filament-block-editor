<?php

namespace Vortechron\FilamentBlockEditor\Rendering;

use Closure;

/**
 * The site's language and the panel's, when they differ: a Malay site run
 * from an English panel. `config('filament-block-editor.content_locale')`
 * (env SITE_LOCALE) is the site's; the app's own locale is the panel's.
 *
 * PageRenderer draws every page inside run(), so the words the package puts
 * on the page (a form's button and messages, the map link) follow the site,
 * in the live page and in the builder's preview alike. Notes meant for the
 * person building the page use panel(). With no site language set, both are
 * the app's and nothing changes.
 */
final class ContentLocale
{
    /**
     * The app's locale before run() switched it, while a draw runs.
     */
    private static ?string $panel = null;

    public static function site(): string
    {
        $locale = config('filament-block-editor.content_locale');

        return is_string($locale) && trim($locale) !== '' ? trim($locale) : app()->getLocale();
    }

    public static function panel(): string
    {
        return self::$panel ?? app()->getLocale();
    }

    /**
     * Runs a draw in the site's language, then gives the app its own back.
     *
     * @template T
     *
     * @param  Closure(): T  $draw
     * @return T
     */
    public static function run(Closure $draw): mixed
    {
        $current = app()->getLocale();
        $site = self::site();

        if ($site === $current) {
            return $draw();
        }

        $outer = self::$panel;
        self::$panel ??= $current;
        app()->setLocale($site);

        try {
            return $draw();
        } finally {
            app()->setLocale($current);
            self::$panel = $outer;
        }
    }
}
