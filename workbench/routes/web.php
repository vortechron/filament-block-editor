<?php

use Illuminate\Support\Facades\Route;
use Workbench\App\Models\Page;

Route::redirect('/', '/admin');

Route::get('/pages/{slug}', function (string $slug) {
    $page = Page::query()->where('slug', $slug)->with('contentBlocks.blockStyle')->firstOrFail();

    return view('workbench::page', ['page' => $page]);
})->name('pages.show');
