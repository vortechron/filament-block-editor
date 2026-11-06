{{--
    A form block. Drawn by Forms\FormRenderer; every word is escaped here.

    $form       Forms\FormDefinition
    $blockId    the block id; the form's element id is form-{blockId}
    $formKey    {sectionId}.{blockId}, sent as _form
    $context    the RenderContext
    $action     the endpoint's address, or null (the button is disabled)
    $hidden     the endpoint's hidden fields, by name
    $sent       whether to show the success message instead of the fields
    $errors     the first error of each field, by name
    $old        the values sent last time, when they were sent by this form
    $token      the CSRF token
    $timestamp  the signed time (Forms\FormTimestamp)
--}}
@php
    $submit = $form->submit();
    $buttonText = $submit['text'] !== '' || $form->hasTranslatedEmpty('submit') ? $submit['text'] : __('filament-block-editor::page.form.submit');
@endphp
@if ($sent)
    <div class="fbe-form fbe-form-sent" id="form-{{ $blockId }}" role="status">
        <p class="fbe-form-success">{{ $form->success() !== '' || $form->hasTranslatedEmpty('success') ? $form->success() : __('filament-block-editor::page.form.success') }}</p>
    </div>
@else
    <form class="fbe-form" id="form-{{ $blockId }}" method="post" @if ($action !== null) action="{{ $action }}" @endif data-form="{{ $formKey }}">
        <input type="hidden" name="_token" value="{{ $token }}">
        <input type="hidden" name="_form" value="{{ $formKey }}">
        <input type="hidden" name="_t" value="{{ $timestamp }}">
        @foreach ($hidden as $name => $value)
            <input type="hidden" name="{{ $name }}" value="{{ $value }}">
        @endforeach
        <div class="fbe-hp" aria-hidden="true">
            <label>{{ __('filament-block-editor::page.form.honeypot') }} <input type="text" name="_website" value="" tabindex="-1" autocomplete="off"></label>
        </div>
        <div class="fbe-fields">
            @foreach ($form->fields() as $field)
                @include('filament-block-editor::forms.field', [
                    'field' => $field,
                    'inputId' => 'form-'.$blockId.'-'.$field['name'],
                    'error' => $errors[$field['name']] ?? null,
                    'value' => $old[$field['name']] ?? null,
                ])
            @endforeach
        </div>
        <div class="fbe-submit fbe-submit-{{ $submit['align'] }}">
            <button type="submit" class="bn-button bn-button-solid" @if ($action === null) disabled @endif>{{ $buttonText }}</button>
        </div>
        @if ($action === null && $context->forBuilder)
            <p class="fbe-form-note">{{ __('filament-block-editor::preview.form_not_connected', [], \Vortechron\FilamentBlockEditor\Rendering\ContentLocale::panel()) }}</p>
        @endif
    </form>
@endif
