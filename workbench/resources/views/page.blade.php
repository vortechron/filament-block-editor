<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $page->title }}</title>
    <x-filament-block-editor::styles :blocks="$page->contentBlocks" :content="$page->summary" />
    <style>
        body { margin: 0; font-family: system-ui, sans-serif; color: #1f2937; }
        .demo-header, .demo-summary { max-width: 53rem; margin: 0 auto; padding: 1.5rem; }
        .demo-header h1 { margin: 0; font-size: 1.25rem; }
    </style>
</head>
<body>
    <header class="demo-header"><h1>{{ $page->title }}</h1></header>

    @if (filled($page->summary))
        <x-filament-block-editor::content :content="$page->summary" class="demo-summary" />
    @endif

    <main>
        <x-filament-block-editor::blocks :blocks="$page->contentBlocks" :page="$page" />
    </main>
</body>
</html>
