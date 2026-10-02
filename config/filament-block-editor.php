<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    |
    | Where uploads from the editor and the media library are stored. The disk
    | must be publicly readable, because the public page links to the files.
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
    | Fonts
    |--------------------------------------------------------------------------
    |
    | `enabled` shows the font picker in the editor's toolbar.
    |
    | `web_fonts_url` is the Google-Fonts-compatible CSS API the web fonts are
    | loaded from. Bunny Fonts is privacy-friendly and needs no account. Set
    | it to null to load the fonts yourself (see BlockFont::webFontAliases()).
    |
    */

    'fonts' => [
        'enabled' => true,
        'web_fonts_url' => 'https://fonts.bunny.net/css',
    ],

    /*
    |--------------------------------------------------------------------------
    | Migrations
    |--------------------------------------------------------------------------
    |
    | The package runs its own migrations. Set this to false if you publish
    | them (php artisan vendor:publish --tag=filament-block-editor-migrations).
    |
    */

    'run_migrations' => true,

];
