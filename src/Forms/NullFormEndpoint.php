<?php

namespace Vortechron\FilamentBlockEditor\Forms;

use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * No form endpoint: forms draw with their button disabled.
 */
final class NullFormEndpoint implements FormEndpoint
{
    public function action(RenderContext $context): ?string
    {
        return null;
    }

    public function hiddenFields(RenderContext $context): array
    {
        return [];
    }
}
