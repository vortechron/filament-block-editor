<?php

namespace Vortechron\FilamentBlockEditor\Design;

/**
 * The package's own kit source: no stored kit, so pages use Kit::defaults()
 * (the package defaults with `config('filament-block-editor.kit')` over them).
 */
final class DefaultKitSource implements KitSource
{
    use OverridesKit;

    protected function storedKit(): array
    {
        return [];
    }
}
