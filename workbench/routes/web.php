<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\Process\Process;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;
use Workbench\App\Support\SamplePage;

/*
 * Manual checks: the sample page as a visitor sees it (/), and drawn for the
 * page builder's canvas (/?builder=1). Add ?locale=ms for Malay copy.
 */
Route::get('/', function () {
    $locale = request('locale') === 'ms' ? 'ms' : 'en';
    app()->setLocale($locale);

    return view('workbench::page', [
        'locale' => $locale,
        'sections' => SamplePage::sections($locale),
        'context' => request()->boolean('builder') ? new RenderContext(forBuilder: true, isPreview: true) : new RenderContext,
    ]);
});

// The page stylesheet, built from resources/css/page/index.css on every request.
Route::get('/page.css', function () {
    $root = dirname(__DIR__, 2);
    $build = new Process([$root.'/node_modules/.bin/esbuild', 'resources/css/page/index.css', '--bundle'], $root);
    $build->mustRun();

    return response($build->getOutput(), 200, ['Content-Type' => 'text/css']);
});

// A flat coloured picture, so photo spots have something to show.
Route::get('/photo/{n}.svg', function (int $n) {
    $colors = ['#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4'];
    $color = $colors[$n % count($colors)];

    return response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="'.$color.'"/><circle cx="400" cy="300" r="120" fill="#ffffff" fill-opacity=".55"/><text x="400" y="320" font-family="sans-serif" font-size="64" text-anchor="middle" fill="#0f172a">Photo '.$n.'</text></svg>',
        200,
        ['Content-Type' => 'image/svg+xml'],
    );
});
