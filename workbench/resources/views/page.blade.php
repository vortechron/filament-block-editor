<!DOCTYPE html>
<html lang="{{ $locale }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Filament Block Editor: sample page</title>
        <style>
            body { margin: 0; }
            nav { position: sticky; top: 0; z-index: 10; display: flex; gap: 1rem; padding: .75rem 1.25rem; background: #0f172a; font: 600 .875rem system-ui; }
            nav a { color: #fff; text-decoration: none; }
            .notice { padding: 1rem 1.25rem; border-radius: .75rem; background: #dbeafe; font: 1rem/1.5 system-ui; }
            .notice-warning { background: #fef3c7; }
        </style>
        <link rel="stylesheet" href="/page.css">
        {{-- Theme the page here with the custom properties of resources/css/page/tokens.css. --}}
        <style>
            .sf-page { /* --sf-accent: #16a34a; */ }
        </style>
    </head>
    <body>
        <nav>
            <a href="#hero">Hero</a>
            <a href="#faq">FAQ</a>
            <a href="#notice">Own block</a>
            <a href="/?locale={{ $locale === 'ms' ? 'en' : 'ms' }}">{{ $locale === 'ms' ? 'English' : 'Bahasa Melayu' }}</a>
            <a href="/?builder=1">Builder view</a>
        </nav>
        <x-filament-block-editor::page :sections="$sections" :context="$context" />
    </body>
</html>
