<?php

namespace Vortechron\FilamentBlockEditor\Forms;

use Illuminate\Contracts\Session\Session;
use Illuminate\Support\ViewErrorBag;
use RuntimeException;
use Vortechron\FilamentBlockEditor\Rendering\RenderContext;

/**
 * Draws a form block as a `<form>` (view filament-block-editor::form): its
 * fields with labels, and the hidden fields the host checks:
 *
 * - `_form`: `{sectionId}.{blockId}`, the stored form to load;
 * - `_token`: the CSRF token;
 * - `_t`: the signed time the page was drawn (FormTimestamp);
 * - `_website`: a honeypot people never see and bots fill in;
 * - the endpoint's own hidden fields (FormEndpoint).
 *
 * After a send it shows the success message instead of the fields, when
 * the query has `?form_sent={blockId}` or the session flash
 * `filament-cms.form_sent` is the block id. Session errors keyed
 * `form.{blockId}.{name}` show under their fields, and the values sent come
 * back when the old input's `_form` is this form.
 */
final class FormRenderer
{
    public function __construct(private readonly FormEndpoint $endpoint) {}

    public function render(FormDefinition $form, string $blockId, RenderContext $context): string
    {
        $key = $context->sectionId === null ? $blockId : $context->sectionId.'.'.$blockId;
        $session = $this->session();
        $old = $session?->getOldInput('_form') === $key ? (array) $session->getOldInput() : [];

        return view('filament-block-editor::form', [
            'form' => $form,
            'blockId' => $blockId,
            'formKey' => $key,
            'context' => $context,
            'action' => $this->endpoint->action($context),
            'hidden' => array_filter($this->endpoint->hiddenFields($context), fn (mixed $value, mixed $name): bool => is_string($name) && is_scalar($value), ARRAY_FILTER_USE_BOTH),
            'sent' => request()->query('form_sent') === $blockId || $session?->get('filament-cms.form_sent') === $blockId,
            'errors' => $this->errors($session, $blockId, $form),
            'old' => $old,
            'token' => $this->token(),
            'timestamp' => FormTimestamp::issue(),
        ])->render();
    }

    /**
     * @return array<string, string> the first error of each field, by name
     */
    private function errors(?Session $session, string $blockId, FormDefinition $form): array
    {
        $bag = $session?->get('errors');

        if (! $bag instanceof ViewErrorBag) {
            return [];
        }

        $errors = [];

        foreach ($form->fields() as $field) {
            $message = $bag->getBag('default')->first("form.{$blockId}.{$field['name']}");

            if ($message !== '') {
                $errors[$field['name']] = $message;
            }
        }

        return $errors;
    }

    private function session(): ?Session
    {
        return app()->bound('session') ? app('session')->driver() : null;
    }

    private function token(): string
    {
        try {
            return (string) csrf_token();
        } catch (RuntimeException) {
            return '';
        }
    }
}
