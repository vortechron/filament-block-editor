{{--
    The public stylesheet for rendered pages. Put it in the page <head>.

    <x-filament-block-editor::styles />

    The page reads its colours and fonts from CSS custom properties
    (--sf-accent, --sf-text, --sf-heading-font, ...). Set them in your own CSS
    after this link; see docs/php.md.
--}}
<link rel="stylesheet" href="{{ \Vortechron\FilamentBlockEditor\Support\Stylesheet::href() }}">
