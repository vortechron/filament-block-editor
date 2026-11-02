{{-- Drawn by the "notice" own block: $values has the cleaned fields, $context the RenderContext. --}}
<aside class="notice notice-{{ $values['tone'] }}">
    <strong>{{ $values['title'] }}</strong>
    @if (filled($values['text']))
        <p>{{ $values['text'] }}</p>
    @endif
    @if (filled($values['link']))
        <a href="{{ $values['link'] }}">{{ $values['link'] }}</a>
    @endif
</aside>
