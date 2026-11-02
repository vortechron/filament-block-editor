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

];
