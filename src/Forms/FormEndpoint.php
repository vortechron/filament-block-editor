<?php

namespace Vortechron\FilamentBlockEditor\Forms;

use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * Where a form block sends to. The package binds NullFormEndpoint (no
 * endpoint): the form draws with its button disabled, and the builder says
 * the form is not connected. A host that saves submissions (the CMS) binds
 * its own.
 */
interface FormEndpoint
{
    /**
     * The address the form posts to, or null when there is none.
     */
    public function action(RenderContext $context): ?string;

    /**
     * Extra hidden fields, by name, such as the page the form is on.
     *
     * @return array<string, string>
     */
    public function hiddenFields(RenderContext $context): array;
}
