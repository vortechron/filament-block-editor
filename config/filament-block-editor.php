<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    |
    | Where uploads from the page builder are stored. The disk must be publicly
    | readable, because the public page links to the files.
    |
    */

    'disk' => env('FILAMENT_BLOCK_EDITOR_DISK', 'public'),

    'directory' => 'block-editor',

    /*
    | The largest upload, in kilobytes.
    */

    'max_upload_size' => 20480,

    /*
    |--------------------------------------------------------------------------
    | Design kit
    |--------------------------------------------------------------------------
    |
    | The site's design values when nothing is stored (Design\Kit). Leave it
    | empty for the package look, or set any part, for example:
    |
    |     'kit' => ['colors' => ['primary' => '#c59d6e'], 'radius' => '8px'],
    |
    */

    'kit' => [],

    /*
    | Your own fonts, for the kit and for styles. Each needs a stack of font
    | names, and may have a stylesheet the page links when the kit uses it:
    |
    |     'fonts' => ['inter' => ['label' => 'Inter', 'stack' => "'Inter', sans-serif",
    |                 'href' => 'https://fonts.bunny.net/css?family=inter:400,700']],
    |
    */

    'fonts' => [],

    /*
    | The package's ready-made blocks (FAQ, map, icon list, pricing,
    | testimonials). Set to false to leave them out of the builder.
    */

    'core_blocks' => true,

];
