{{--
    One field of a form block (resources/views/form.blade.php).

    $field    a cleaned field (Forms\FormFields)
    $inputId  the input's id
    $error    the field's error message, or null
    $value    the value sent last time, or null
--}}
@php
    $type = $field['type'];
    $name = $field['name'];
    $label = $field['label'] !== '' ? $field['label'] : $name;
    $describedBy = $error !== null ? $inputId.'-error' : null;
    $text = is_scalar($value) ? (string) $value : '';
    $chosen = is_array($value) ? array_map('strval', array_filter($value, 'is_scalar')) : [];
@endphp
<div class="fbe-field fbe-field-{{ $type }} fbe-field-{{ $field['width'] }}">
    @if (in_array($type, ['radio', 'checkboxes'], true))
        <fieldset @if ($describedBy) aria-describedby="{{ $describedBy }}" @endif>
            <legend class="fbe-label">{{ $label }}@if ($field['required'])<span class="fbe-required" aria-hidden="true"> *</span>@endif</legend>
            @foreach ($field['options'] as $index => $option)
                <label class="fbe-option">
                    @if ($type === 'radio')
                        <input type="radio" name="{{ $name }}" value="{{ $option }}" @checked($text === $option) @required($field['required'])>
                    @else
                        <input type="checkbox" name="{{ $name }}[]" value="{{ $option }}" @checked(in_array($option, $chosen, true))>
                    @endif
                    <span>{{ $option }}</span>
                </label>
            @endforeach
        </fieldset>
    @elseif ($type === 'consent')
        <label class="fbe-consent-label" for="{{ $inputId }}">
            <input type="checkbox" id="{{ $inputId }}" name="{{ $name }}" value="1" @checked($text !== '') @required($field['required']) @if ($describedBy) aria-describedby="{{ $describedBy }}" @endif>
            <span>{{ $label }}</span>
        </label>
    @else
        <label class="fbe-label" for="{{ $inputId }}">{{ $label }}@if ($field['required'])<span class="fbe-required" aria-hidden="true"> *</span>@endif</label>
        @if ($type === 'textarea')
            <textarea class="fbe-input" id="{{ $inputId }}" name="{{ $name }}" rows="{{ $field['rows'] }}" placeholder="{{ $field['placeholder'] }}" @required($field['required']) @if ($describedBy) aria-describedby="{{ $describedBy }}" @endif>{{ $text }}</textarea>
        @elseif ($type === 'select')
            <select class="fbe-input" id="{{ $inputId }}" name="{{ $name }}" @required($field['required']) @if ($describedBy) aria-describedby="{{ $describedBy }}" @endif>
                <option value="">{{ $field['placeholder'] !== '' ? $field['placeholder'] : __('filament-block-editor::page.form.choose') }}</option>
                @foreach ($field['options'] as $option)
                    <option value="{{ $option }}" @selected($text === $option)>{{ $option }}</option>
                @endforeach
            </select>
        @else
            <input class="fbe-input" type="{{ $type }}" id="{{ $inputId }}" name="{{ $name }}" value="{{ $text }}" placeholder="{{ $field['placeholder'] }}" @required($field['required']) @if ($describedBy) aria-describedby="{{ $describedBy }}" @endif @if ($type === 'tel') autocomplete="tel" @elseif ($type === 'email') autocomplete="email" @endif>
        @endif
    @endif
    @if ($error !== null)
        <p class="fbe-field-error" id="{{ $inputId }}-error">{{ $error }}</p>
    @endif
</div>
