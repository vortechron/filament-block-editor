{{-- An own block that draws another page with a synced section in it, to check that refs are not followed twice. --}}
<div class="nested">{!! app(\Vortechron\FilamentBlockEditor\Rendering\PageRenderer::class)->render([['id' => 'inner', 'type' => 'ref', 'ref' => 1]], $context) !!}</div>
